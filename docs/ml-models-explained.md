# NeuroVision — Backend ML Models & Equations

## 1. Core Model: Bidirectional LSTM (BiLSTM)

**Purpose:** Binary classification — **Control vs Parkinson's Disease** from eye-tracking gaze data.

**Architecture** (`backend/app/services/ml/model.py`):

```
Input (4 features) → BiLSTM (2 layers, hidden=128) → Linear(256→128) → ReLU → Dropout(0.3) → Linear(128→2)
```

- **Input size:** 4 (left eye X/Y, right eye X/Y)
- **Bidirectional** doubles the hidden output: 128 × 2 = 256
- **Best test accuracy:** 81.15%

---

## 2. Preprocessing Pipeline

### Step 1: Normalization (Min-Max)

$$x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}}$$

Scales each gaze column to `[0, 1]`.

### Step 2: Sliding Windows

- **Window size:** 300 frames
- **Stride:** 100 frames
- Produces overlapping temporal windows of shape `(W, 300, 4)`

### Step 3 (Video path): Moving Average Smoothing

$$\bar{x}_t = \frac{1}{k} \sum_{i=0}^{k-1} x_{t-i}, \quad k = 9$$

Applied to raw MediaPipe iris landmarks (left iris index=468, right iris=473) to reduce jitter.

---

## 3. Training Equations

### Loss Function: Cross-Entropy Loss

$$\mathcal{L} = -\sum_{c=1}^{C} y_c \log(\hat{y}_c)$$

Where `C=2` (Control, Parkinson's), `y` is the one-hot true label, and `ŷ` is the softmax output.

### Optimizer: AdamW

$$\theta_{t+1} = \theta_t - \eta \left( \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon} + \lambda \theta_t \right)$$

- Learning rate `η = 1e-3`
- Weight decay `λ = 1e-4`
- Decoupled weight decay (AdamW variant)

### LR Scheduler: ReduceLROnPlateau

$$\eta_{\text{new}} = \eta_{\text{old}} \times 0.5 \quad \text{if no improvement for 2 epochs}$$

### Gradient Clipping

$$\|\nabla\theta\|_2 \leq 1.0$$

Prevents exploding gradients in the LSTM.

### Early Stopping

Training halts if validation loss doesn't improve for **8 consecutive epochs**.

---

## 4. Data Augmentation (applied online per batch)

| Augmentation | Probability | Equation |
|---|---|---|
| **Gaussian Noise** | 85% | $x' = x + \mathcal{N}(0, \sigma^2), \quad \sigma \sim U(0.005, 0.04)$ |
| **DC Shift** | 60% | $x' = x + \delta, \quad \delta \sim U(-0.15, 0.15)$ |
| **Amplitude Scaling** | 60% | $x' = \bar{x} + s(x - \bar{x}), \quad s \sim U(0.65, 1.35)$ |
| **Narrow-range Remap** | 35% | Remaps to $[c - h, c + h]$ where $c \sim U(0.35, 0.65), h \sim U(0.12, 0.22)$ |

---

## 5. BiLSTM Equations (per timestep t)

The LSTM cell computes:

**Forget gate:**

$$f_t = \sigma(W_f [h_{t-1}, x_t] + b_f)$$

**Input gate:**

$$i_t = \sigma(W_i [h_{t-1}, x_t] + b_i)$$

**Candidate cell state:**

$$\tilde{C}_t = \tanh(W_C [h_{t-1}, x_t] + b_C)$$

**Cell state update:**

$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$

**Output gate:**

$$o_t = \sigma(W_o [h_{t-1}, x_t] + b_o)$$

**Hidden state:**

$$h_t = o_t \odot \tanh(C_t)$$

Being **bidirectional**, the model runs two LSTMs — one forward, one backward — and concatenates their final hidden states:

$$h_{\text{final}} = [\overrightarrow{h_T} \| \overleftarrow{h_1}] \in \mathbb{R}^{256}$$

---

## 6. Multi-Condition Risk Scoring (Heuristic-Based)

Only Parkinson's uses the BiLSTM. The other three conditions use **feature-based heuristics** on the gaze data:

### Alzheimer's — Gaze Instability (Coefficient of Variation of speed)

$$\text{CV} = \frac{\sigma(\text{speed})}{\mu(\text{speed})}, \quad \text{score} = \text{clip}\left(\frac{\text{CV} - 0.5}{3.0}, \ 0, \ 1\right)$$

Higher CV = more erratic gaze = higher Alzheimer's risk.

### Multiple Sclerosis — Binocular Discoordination

$$\text{score} = \text{clip}\left(\frac{1 - r_{LR}}{2.0}, \ 0, \ 1\right)$$

Where $r_{LR}$ is the **Pearson correlation** between left and right eye speed. Low correlation suggests internuclear ophthalmoplegia (INO), a hallmark of MS.

### Huntington's — Saccadic Intrusion Rate

$$\text{intrusion\_rate} = \frac{|\{t : s_t > \mu_s + 2\sigma_s\}|}{N}, \quad \text{score} = \text{clip}\left(\frac{\text{rate} - 0.05}{0.20}, \ 0, \ 1\right)$$

Counts frames where gaze speed exceeds 2 standard deviations above mean — detecting involuntary square-wave jerks.

---

## 7. Risk Stratification

| Score Range | Level | Recommendation |
|---|---|---|
| > 0.75 | **HIGH** | Neurological consultation strongly advised |
| 0.45 – 0.75 | **MODERATE** | Periodic monitoring recommended |
| < 0.45 | **LOW** | No immediate neurological concern |

---

## 8. Inference Flow Summary

```
Input (file or video)
  -> Parse gaze coordinates (4D)
  -> Min-max normalize per column
  -> Sliding windows (300 frames, stride 100)
  -> BiLSTM forward pass -> mean(window probabilities) -> Parkinson's score
  -> Compute gaze speed -> Alzheimer's (CV), MS (correlation), Huntington's (intrusion rate)
  -> Risk stratification per condition
  -> Store results + stream via WebSocket
```

**Two input paths:**
- **Data files** (`.txt`/`.csv`/`.tsv`): parsed directly from eye-tracker output
- **Video** (`.mp4`/`.avi`/`.mov`): MediaPipe FaceLandmarker extracts iris positions -> smoothed -> same pipeline

---

## 9. Key Files Reference

| File | Purpose |
|---|---|
| `backend/app/services/ml/model.py` | Model architecture definition |
| `backend/app/services/ml/inference.py` | Full inference pipeline + condition scoring |
| `backend/app/services/ml/video.py` | Video gaze extraction (MediaPipe) |
| `backend/ml/training/modal_train_bilstm.py` | Training script (Modal GPU) |
| `backend/ml/models/neurovision_bilstm.pt` | Trained model weights |
| `backend/ml/models/model_meta.json` | Model hyperparameters & metadata |
