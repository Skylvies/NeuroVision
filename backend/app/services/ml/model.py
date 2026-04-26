"""
NeuroVisionModel definition and global singleton management.
"""

import logging

logger = logging.getLogger(__name__)

_model = None
_model_loaded = False

try:
    import torch
    import torch.nn as nn

    class NeuroVisionModel(nn.Module):
        def __init__(
            self,
            input_size: int = 4,
            hidden_size: int = 128,
            num_layers: int = 2,
            num_classes: int = 2,
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

    TORCH_AVAILABLE = True

except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("PyTorch not available. Model inference will use fallback.")


def load_model(path: str) -> bool:
    """Load model weights from path. Returns True on success."""
    global _model, _model_loaded

    if not TORCH_AVAILABLE:
        logger.warning("Cannot load model: PyTorch not available.")
        return False

    try:
        import torch

        model = NeuroVisionModel()
        state = torch.load(path, map_location="cpu", weights_only=True)
        model.load_state_dict(state)
        model.eval()
        _model = model
        _model_loaded = True
        logger.info(f"Model loaded from {path}")
        return True
    except FileNotFoundError:
        logger.warning(
            f"Model weights not found at {path}. Run training first."
        )
        return False
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return False


def get_model():
    """Return the loaded model, or None if not available."""
    return _model


def is_model_loaded() -> bool:
    return _model_loaded
