"""
Download trained NeuroVision model weights from Modal volume to local ml/models/.
Run: modal run modal_download.py
"""

import modal
import os

app = modal.App("neurovision-download")

volume = modal.Volume.from_name("neurovision-models", create_if_missing=False)


@app.function(volumes={"/models": volume})
def list_files() -> list[str]:
    """List all files in the Modal volume."""
    paths = []
    for entry in os.scandir("/models"):
        if entry.is_file():
            paths.append(entry.path)
    return paths


@app.function(volumes={"/models": volume})
def read_file(path: str) -> bytes:
    """Read a file from the Modal volume and return its bytes."""
    with open(path, "rb") as f:
        return f.read()


@app.local_entrypoint()
def main():
    # Target local directory (relative to this script's location)
    local_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(local_dir, exist_ok=True)

    print("Listing files in Modal volume 'neurovision-models'...")
    files = list_files.remote()

    if not files:
        print("No files found in volume. Run modal_train_bilstm.py first.")
        return

    print(f"Found {len(files)} files:")
    for path in files:
        print(f"  {path}")

    # Download each file
    for remote_path in files:
        filename = os.path.basename(remote_path)
        local_path = os.path.join(local_dir, filename)

        print(f"\nDownloading {filename}...", end="", flush=True)
        data = read_file.remote(remote_path)

        with open(local_path, "wb") as f:
            f.write(data)

        size_kb = len(data) / 1024
        print(f" {size_kb:.1f} KB → {local_path}")

    print(f"\nAll files downloaded to {os.path.abspath(local_dir)}")
    print("Model ready for backend inference.")
