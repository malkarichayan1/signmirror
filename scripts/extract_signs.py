"""
extract_signs.py — batch-extract ASL sign landmarks for SignMirror

Usage (original: single folder of one image per sign):
    py extract_signs.py --input ./asl_images --output ./out

Usage (dataset mode: folder of subfolders, tries multiple images per sign):
    py extract_signs.py --dataset "C:/path/to/asl_alphabet_train" --output ./out

Usage (single image):
    py extract_signs.py --input hello.jpg --output ./out --id hello --name Hello

Place the output JSONs in signmirror/src/data/signs/.

Install deps first:
    py -m pip install mediapipe opencv-python
"""

import argparse
import json
import math
import sys
import urllib.request
from pathlib import Path

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
except ImportError:
    print("Missing dependencies. Run:  py -m pip install mediapipe opencv-python")
    sys.exit(1)

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = Path(__file__).parent / "hand_landmarker.task"

# Signs to skip (not real hand signs)
SKIP_IDS = {"del", "nothing", "space"}


def download_model():
    if MODEL_PATH.exists():
        return
    print("Downloading hand landmark model (~5 MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("  Model downloaded.")


def make_detector():
    base_options = mp_python.BaseOptions(model_asset_path=str(MODEL_PATH))
    options = mp_vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    return mp_vision.HandLandmarker.create_from_options(options)


def normalize_landmarks(landmarks):
    wrist   = landmarks[0]
    mid_mcp = landmarks[9]
    dx = mid_mcp.x - wrist.x
    dy = mid_mcp.y - wrist.y
    scale = math.sqrt(dx * dx + dy * dy)
    if scale < 1e-6:
        return None
    return [
        {
            "x": round((lm.x - wrist.x) / scale, 6),
            "y": round((lm.y - wrist.y) / scale, 6),
            "z": round((lm.z - wrist.z) / scale, 6),
        }
        for lm in landmarks
    ]


def try_image(detector, image_path):
    """Returns normalized landmarks or None."""
    try:
        mp_image = mp.Image.create_from_file(str(image_path))
    except Exception:
        return None
    result = detector.detect(mp_image)
    if not result.hand_landmarks:
        return None
    return normalize_landmarks(result.hand_landmarks[0])


def extract_best_from_folder(detector, folder, sign_id, sign_name, max_tries=50):
    """Try up to max_tries images from a subfolder until one works."""
    images = sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTS)
    tried = 0
    for img_path in images:
        if tried >= max_tries:
            break
        normalized = try_image(detector, img_path)
        tried += 1
        if normalized:
            print(f"  Found good image after {tried} attempt(s): {img_path.name}")
            return {"id": sign_id, "name": sign_name, "description": "", "landmarks": normalized}
    print(f"  [skip] no hand detected in any of {tried} images")
    return None


def process_dataset(dataset_path, output_path):
    """Process a dataset folder where each subfolder is named after a sign."""
    download_model()
    detector = make_detector()
    output_path.mkdir(parents=True, exist_ok=True)

    subfolders = sorted(p for p in dataset_path.iterdir() if p.is_dir())
    print(f"Found {len(subfolders)} sign folder(s) in {dataset_path}\n")

    saved, skipped = 0, 0
    for folder in subfolders:
        sign_id   = folder.name.lower()
        sign_name = folder.name.upper() if len(folder.name) == 1 else folder.name.capitalize()

        if sign_id in SKIP_IDS:
            print(f"Skipping non-hand sign: {folder.name}")
            skipped += 1
            continue

        print(f"Processing '{folder.name}'...")
        result = extract_best_from_folder(detector, folder, sign_id, sign_name)
        if result:
            out = output_path / f"{sign_id}.json"
            out.write_text(json.dumps(result, indent=2))
            print(f"  Saved {out}")
            saved += 1
        else:
            skipped += 1

    detector.close()
    print(f"\nDone: {saved} saved, {skipped} skipped.")


def process_single(input_path, output_path, sign_id=None, sign_name=None):
    download_model()
    detector = make_detector()
    output_path.mkdir(parents=True, exist_ok=True)

    if input_path.is_file():
        sid   = sign_id   or input_path.stem.lower().replace(" ", "_")
        sname = sign_name or (input_path.stem.upper() if len(input_path.stem) == 1 else input_path.stem.capitalize())
        print(f"Processing {input_path.name} -> {sid}...")
        normalized = try_image(detector, input_path)
        if normalized:
            result = {"id": sid, "name": sname, "description": "", "landmarks": normalized}
            out = output_path / f"{sid}.json"
            out.write_text(json.dumps(result, indent=2))
            print(f"  Saved {out}")
        else:
            print(f"  [skip] no hand detected")

    elif input_path.is_dir():
        images = sorted(p for p in input_path.iterdir() if p.suffix.lower() in IMAGE_EXTS)
        print(f"Found {len(images)} image(s) in {input_path}")
        saved = 0
        for img_path in images:
            sid   = img_path.stem.lower().replace(" ", "_")
            sname = img_path.stem.upper() if len(img_path.stem) == 1 else img_path.stem.capitalize()
            print(f"Processing {img_path.name} -> {sid}...")
            normalized = try_image(detector, img_path)
            if normalized:
                result = {"id": sid, "name": sname, "description": "", "landmarks": normalized}
                out = output_path / f"{sid}.json"
                out.write_text(json.dumps(result, indent=2))
                print(f"  Saved {out}")
                saved += 1
            else:
                print(f"  [skip] no hand detected")
        print(f"\nDone: {saved}/{len(images)} signs extracted.")

    else:
        print(f"Error: {input_path} does not exist.")
        sys.exit(1)

    detector.close()


def main():
    parser = argparse.ArgumentParser(description="Extract ASL sign landmarks for SignMirror")
    parser.add_argument("--dataset", help="Dataset folder with one subfolder per sign (tries multiple images)")
    parser.add_argument("--input",   help="Single image file or folder of images (one per sign)")
    parser.add_argument("--output",  required=True, help="Output folder for JSON files")
    parser.add_argument("--id",      help="Sign ID override (single image only)")
    parser.add_argument("--name",    help="Display name override (single image only)")
    args = parser.parse_args()

    if args.dataset:
        process_dataset(Path(args.dataset), Path(args.output))
    elif args.input:
        process_single(Path(args.input), Path(args.output), args.id, args.name)
    else:
        print("Error: provide --dataset or --input")
        sys.exit(1)


if __name__ == "__main__":
    main()
