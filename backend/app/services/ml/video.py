"""
Video-based gaze extraction using MediaPipe FaceLandmarker.
Extracts iris coordinates from video frames for NeuroVision inference.
"""

import logging
import numpy as np

logger = logging.getLogger(__name__)

# MediaPipe iris center landmark indices
LEFT_IRIS_IDX = 468
RIGHT_IRIS_IDX = 473

WINDOW_SIZE = 300
STRIDE = 100
MIN_FRAMES = 300  # require at least one full window of detected frames


def extract_gaze_from_video(path: str) -> np.ndarray:
    """
    Extract normalized gaze coordinates from a video file using MediaPipe.
    Returns (N_frames, 4) float32 array: [left_x, left_y, right_x, right_y].
    Coordinates are normalized [0, 1] by MediaPipe (image-relative iris position).
    """
    try:
        import cv2
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision
    except ImportError as e:
        raise RuntimeError(
            f"MediaPipe/OpenCV not available: {e}. "
            "Install mediapipe and opencv-python-headless."
        )

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Video: {total_frames} frames @ {fps:.1f} fps")

    # Download model if not cached
    import os
    import urllib.request

    model_path = "/tmp/face_landmarker.task"
    if not os.path.exists(model_path):
        logger.info("Downloading MediaPipe FaceLandmarker model...")
        url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
        urllib.request.urlretrieve(url, model_path)

    base_options = mp_python.BaseOptions(model_asset_path=model_path)
    options = mp_vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.3,
        min_face_presence_confidence=0.3,
        min_tracking_confidence=0.3,
    )

    gaze_frames = []
    frame_idx = 0

    with mp_vision.FaceLandmarker.create_from_options(options) as landmarker:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_ms = int(frame_idx / fps * 1000)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            result = landmarker.detect_for_video(mp_image, timestamp_ms)

            if result.face_landmarks:
                landmarks = result.face_landmarks[0]
                if len(landmarks) > RIGHT_IRIS_IDX:
                    l_iris = landmarks[LEFT_IRIS_IDX]
                    r_iris = landmarks[RIGHT_IRIS_IDX]
                    gaze_frames.append([l_iris.x, l_iris.y, r_iris.x, r_iris.y])

            frame_idx += 1

    cap.release()

    if not gaze_frames:
        raise ValueError(
            "No face landmarks detected in video. "
            "Ensure the video shows a person's face clearly."
        )

    gaze = np.array(gaze_frames, dtype=np.float32)
    logger.info(f"Extracted {len(gaze)} gaze frames from video")

    # Smooth to reduce high-frequency noise from MediaPipe jitter.
    # This brings variance closer to the smooth clinical gaze data the
    # model was trained on (Tobii/EyeLink precision ≈ 0.01–0.03°).
    gaze = _smooth_gaze(gaze, window=9)

    return gaze


def _smooth_gaze(gaze: np.ndarray, window: int = 9) -> np.ndarray:
    """Per-column centered moving average using pandas rolling."""
    import pandas as pd
    df = pd.DataFrame(gaze)
    return df.rolling(window=window, center=True, min_periods=1).mean().values.astype(np.float32)


def extract_thumbnail(path: str) -> str | None:
    """
    Extract a representative frame from the video as a base64-encoded JPEG.
    Seeks to ~10% through the video to avoid black intro frames.
    Returns None if extraction fails for any reason.
    """
    import base64
    try:
        import cv2
    except ImportError:
        return None
    try:
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            return None
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        target = max(0, int(total * 0.10))
        cap.set(cv2.CAP_PROP_POS_FRAMES, target)
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return None
        h, w = frame.shape[:2]
        max_w = 480
        if w > max_w:
            frame = cv2.resize(frame, (max_w, int(h * max_w / w)))
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return base64.b64encode(buf.tobytes()).decode("utf-8")
    except Exception:
        return None


def prepare_video_windows(
    gaze: np.ndarray,
    size: int = WINDOW_SIZE,
    stride: int = STRIDE,
) -> np.ndarray:
    """
    Build sliding windows from gaze array.
    Requires at least MIN_FRAMES detected frames — raises ValueError otherwise,
    since padding short clips produces meaningless constant-tail patterns that
    saturate the model.
    Returns (W, size, 4) float32 array.
    """
    if len(gaze) < MIN_FRAMES:
        raise ValueError(
            f"Insufficient gaze data: detected {len(gaze)} frames with face landmarks, "
            f"but at least {MIN_FRAMES} are required for a valid prediction. "
            "Try a longer video (≥10 s at 30 fps) with the face clearly visible throughout."
        )

    from app.services.ml.inference import sliding_windows
    return sliding_windows(gaze, size, stride)
