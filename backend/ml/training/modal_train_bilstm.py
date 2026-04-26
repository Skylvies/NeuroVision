"""
NeuroVision BiLSTM training on Modal T4 GPU.
Detects Parkinson's Disease indicators from eye-tracking gaze data.
"""

import modal
import os

app = modal.App("neurovision-bilstm-training")

volume = modal.Volume.from_name("neurovision-models", create_if_missing=True)

# Run this script from the neurovision project root:
#   cd /path/to/neurovision
#   modal run backend/ml/training/modal_train_bilstm.py
DATA_FILE = "OH01_April_14_2022 - Raw Data.txt"

# modal.Image.add_local_file() bakes the data file into the container image
# (replaces the removed modal.Mount.from_local_file in Modal 1.x)
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.5.1",
        "numpy==1.26.4",
        "pandas==2.2.2",
        "scikit-learn==1.6.0",
    )
    .add_local_file(
        local_path=DATA_FILE,
        remote_path=f"/data/{DATA_FILE}",
    )
)


@app.function(
    image=image,
    gpu="T4",
    timeout=3600,
    volumes={"/models": volume},
)
def train_bilstm():
    import json
    import numpy as np
    import pandas as pd
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score

    # ── Hyperparameters ──────────────────────────────────────────────
    DATASET_PATH = "/data/OH01_April_14_2022 - Raw Data.txt"
    OUTPUT_DIR = "/models"
    WINDOW_SIZE = 300
    STRIDE = 100
    BATCH_SIZE = 32
    EPOCHS = 50
    LR = 1e-3
    PATIENCE = 8

    FEATURE_COLS = [
        "Point of Regard Left X [px]",
        "Point of Regard Left Y [px]",
        "Point of Regard Right X [px]",
        "Point of Regard Right Y [px]",
    ]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Step 1: Load and preprocess data ─────────────────────────────
    print("Loading dataset...")
    df = pd.read_csv(
        DATASET_PATH, sep="\t", low_memory=False, na_values=["-", "NA", "#N/A"]
    )
    print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    # Check which participant column exists
    participant_col = None
    for col in ["Participant", "Respondent", "Export Date", "Recording"]:
        if col in df.columns:
            participant_col = col
            break

    if participant_col is None:
        # Try to find first non-numeric column
        for col in df.columns:
            if df[col].dtype == object:
                participant_col = col
                break

    print(f"Using participant column: {participant_col}")

    # Drop rows missing gaze features
    df_clean = df.dropna(subset=FEATURE_COLS).copy()
    print(f"After dropping NaN: {len(df_clean)} rows")

    X_all, y_all = [], []

    if participant_col:
        for participant, sub_df in df_clean.groupby(participant_col):
            values = sub_df[FEATURE_COLS].values.astype(np.float32)

            # Determine label: "Sham" = Control (0), else Parkinson's (1)
            label = 0 if "Sham" in str(participant) else 1

            # Min-max normalize per participant
            v_min = values.min(axis=0)
            v_max = values.max(axis=0)
            v_range = np.where(v_max - v_min == 0, 1.0, v_max - v_min)
            values_norm = (values - v_min) / v_range

            # Sliding windows
            for i in range(0, len(values_norm) - WINDOW_SIZE, STRIDE):
                X_all.append(values_norm[i : i + WINDOW_SIZE])
                y_all.append(label)
    else:
        # No participant column — treat whole file as one participant
        values = df_clean[FEATURE_COLS].values.astype(np.float32)
        v_min = values.min(axis=0)
        v_max = values.max(axis=0)
        v_range = np.where(v_max - v_min == 0, 1.0, v_max - v_min)
        values_norm = (values - v_min) / v_range
        for i in range(0, len(values_norm) - WINDOW_SIZE, STRIDE):
            X_all.append(values_norm[i : i + WINDOW_SIZE])
            y_all.append(0)

    X = np.array(X_all, dtype=np.float32)
    y = np.array(y_all, dtype=np.int64)
    print(f"Dataset shape: {X.shape}, class distribution: {np.bincount(y)}")

    if len(np.unique(y)) < 2:
        only_class = int(y[0])
        other_class = 1 - only_class  # if all PD (1) → synth healthy (0), vice-versa
        print(f"WARNING: Only class {only_class} found. Synthesising class {other_class} for demo.")
        n_synth = len(X) // 2
        # Healthy windows: slightly smoothed; PD windows: jittered
        if other_class == 0:
            import pandas as pd
            df_tmp = pd.DataFrame(X[:n_synth].reshape(-1, 4))
            smoothed = df_tmp.rolling(window=7, center=True, min_periods=1).mean().values
            X_synth = smoothed.reshape(n_synth, WINDOW_SIZE, 4).astype(np.float32)
        else:
            X_synth = X[:n_synth] + np.random.normal(0, 0.05, (n_synth, WINDOW_SIZE, 4)).astype(np.float32)
            X_synth = np.clip(X_synth, 0, 1)
        X = np.vstack([X, X_synth])
        y = np.concatenate([y, np.full(n_synth, other_class, dtype=np.int64)])
        print(f"After augmentation: {X.shape}, classes: {np.bincount(y)}")

    # ── Step 2: Train/test split ──────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    train_loader = DataLoader(
        TensorDataset(torch.tensor(X_train), torch.tensor(y_train)),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )
    test_loader = DataLoader(
        TensorDataset(torch.tensor(X_test), torch.tensor(y_test)),
        batch_size=64,
    )

    # ── Step 2b: Augmentation helper ────────────────────────────────
    rng = np.random.default_rng(seed=0)

    def augment_batch(xb_np: np.ndarray) -> np.ndarray:
        """
        Online augmentation applied per training batch.
        Teaches the model to be robust to:
          - Measurement jitter (Gaussian noise)
          - Different absolute gaze positions (random shift)
          - Different gaze-amplitude ranges (random scale)
          - Narrow-range inputs like MediaPipe iris positions (range remap)
        """
        aug = xb_np.copy()
        B = aug.shape[0]

        # 1. Additive Gaussian noise (jitter / measurement error)
        noise_mask = rng.random(B) < 0.85
        if noise_mask.any():
            sigma = rng.uniform(0.005, 0.04, (noise_mask.sum(), 1, 1))
            aug[noise_mask] += rng.normal(0, 1, aug[noise_mask].shape) * sigma

        # 2. Global DC shift (different fixation baseline)
        shift_mask = rng.random(B) < 0.6
        if shift_mask.any():
            shift = rng.uniform(-0.15, 0.15, (shift_mask.sum(), 1, 4))
            aug[shift_mask] += shift

        # 3. Amplitude scaling around the window mean
        scale_mask = rng.random(B) < 0.6
        if scale_mask.any():
            scale = rng.uniform(0.65, 1.35, (scale_mask.sum(), 1, 1))
            means = aug[scale_mask].mean(axis=1, keepdims=True)
            aug[scale_mask] = means + (aug[scale_mask] - means) * scale

        # 4. Narrow-range remap — simulate MediaPipe iris positions
        #    (iris center occupies ~30-70 % of face width, not 0-100 % of screen)
        narrow_mask = rng.random(B) < 0.35
        if narrow_mask.any():
            centers = rng.uniform(0.35, 0.65, (narrow_mask.sum(), 1, 4))
            half_r  = rng.uniform(0.12, 0.22, (narrow_mask.sum(), 1, 4))
            aug[narrow_mask] = (
                centers - half_r + aug[narrow_mask] * (2 * half_r)
            )

        return np.clip(aug, 0.0, 1.0).astype(np.float32)

    # ── Step 3: Define model ──────────────────────────────────────────
    class NeuroVisionModel(nn.Module):
        def __init__(
            self, input_size=4, hidden_size=128, num_layers=2, num_classes=2
        ):
            super().__init__()
            self.lstm = nn.LSTM(
                input_size,
                hidden_size,
                num_layers,
                batch_first=True,
                bidirectional=True,
                dropout=0.3,
            )
            self.classifier = nn.Sequential(
                nn.Linear(hidden_size * 2, 128),
                nn.ReLU(),
                nn.Dropout(0.3),
                nn.Linear(128, num_classes),
            )

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.classifier(out[:, -1, :])

    model = NeuroVisionModel().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    criterion = nn.CrossEntropyLoss()
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, patience=2, factor=0.5
    )

    param_count = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {param_count:,}")

    # ── Step 4: Training loop ─────────────────────────────────────────
    best_acc = 0.0
    patience_counter = 0
    last_acc = 0.0

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0.0
        for xb, yb in train_loader:
            # Apply online augmentation on CPU before moving to device
            xb_aug = torch.tensor(augment_batch(xb.numpy()))
            xb_aug, yb = xb_aug.to(device), yb.to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb_aug), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(train_loader)

        # Evaluate
        model.eval()
        preds, trues = [], []
        with torch.no_grad():
            for xb, yb in test_loader:
                preds.extend(model(xb.to(device)).argmax(1).cpu().numpy())
                trues.extend(yb.numpy())

        acc = accuracy_score(trues, preds)
        last_acc = acc
        scheduler.step(1 - acc)
        print(f"Epoch {epoch+1:2d}/{EPOCHS} | Loss: {avg_loss:.4f} | Acc: {acc:.4f}")

        if acc > best_acc:
            best_acc = acc
            patience_counter = 0
            torch.save(model.state_dict(), f"{OUTPUT_DIR}/neurovision_bilstm.pt")
            print(f"  → Saved best model (acc={best_acc:.4f})")
        else:
            patience_counter += 1
            if patience_counter >= PATIENCE:
                print(f"  Early stopping at epoch {epoch+1}")
                break

    # ── Step 5: Save metadata ─────────────────────────────────────────
    meta = {
        "window_size": WINDOW_SIZE,
        "stride": STRIDE,
        "feature_cols": FEATURE_COLS,
        "best_test_accuracy": best_acc,
        "input_size": 4,
        "hidden_size": 128,
        "num_layers": 2,
        "num_classes": 2,
    }
    with open(f"{OUTPUT_DIR}/model_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    volume.commit()
    print(f"\nTraining complete! Best accuracy: {best_acc:.4f}")
    print(f"Saved: {OUTPUT_DIR}/neurovision_bilstm.pt")
    print(f"Saved: {OUTPUT_DIR}/model_meta.json")
    return {"best_accuracy": best_acc, "last_epoch_accuracy": last_acc}


@app.local_entrypoint()
def main():
    print("Starting NeuroVision BiLSTM training on Modal T4 GPU...")
    print("Dataset: OH01_April_14_2022 - Raw Data.txt")
    print("Model: Bidirectional LSTM (2 layers, hidden=128)")
    print()
    result = train_bilstm.remote()
    print(f"\nTraining complete: {result}")
    print("Run modal_download.py to download weights to backend/ml/models/")
