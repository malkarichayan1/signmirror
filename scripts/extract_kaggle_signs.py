"""Pulls real motion-sign landmark data for word-level ASL signs (hello,
thankyou, yes, ...) from Google's Kaggle "asl-signs" competition dataset and
converts them into SignMirror's sign JSON format.

Requires:
  - `kaggle` CLI authenticated (kaggle.json in ~/.kaggle/ or %USERPROFILE%\\.kaggle\\)
  - Competition rules accepted at kaggle.com/competitions/asl-signs/rules
  - `pip install kaggle pandas pyarrow`
  - A local copy of the competition's train.csv (small metadata file)

Usage:
  py extract_kaggle_signs.py --train-csv path/to/train.csv --signs hello thankyou yes
"""

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import pandas as pd

COMPETITION = "asl-signs"
HAND_TYPES_TRY = ["right_hand", "left_hand"]
HAND_LANDMARK_COUNT = 21
TRIM_EPSILON = 0.03
FPS = 15
MIN_VALID_FRAMES = 5
MIN_TRIMMED_FRAMES = 3

SIGN_NAMES = {
    "hello": "Hello",
    "thankyou": "Thank You",
    "yes": "Yes",
}


def normalize_frame(points):
    wrist = points[0]
    mcp = points[9]
    dx = mcp["x"] - wrist["x"]
    dy = mcp["y"] - wrist["y"]
    scale = (dx * dx + dy * dy) ** 0.5
    if scale < 1e-6:
        return None
    return [
        {
            "x": round((p["x"] - wrist["x"]) / scale, 6),
            "y": round((p["y"] - wrist["y"]) / scale, 6),
            "z": round((p["z"] - wrist["z"]) / scale, 6),
        }
        for p in points
    ]


def movement(a, b):
    total = 0.0
    for pa, pb in zip(a, b):
        dx, dy, dz = pa["x"] - pb["x"], pa["y"] - pb["y"], pa["z"] - pb["z"]
        total += (dx * dx + dy * dy + dz * dz) ** 0.5
    return total / len(a)


def trim_stationary(frames, epsilon=TRIM_EPSILON):
    if len(frames) < 2:
        return frames
    start = 0
    while start < len(frames) - 1 and movement(frames[start], frames[start + 1]) < epsilon:
        start += 1
    end = len(frames) - 1
    while end > start + 1 and movement(frames[end - 1], frames[end]) < epsilon:
        end -= 1
    return frames[start:end + 1]


def extract_hand_frames(parquet_path):
    df = pd.read_parquet(parquet_path)
    for hand_type in HAND_TYPES_TRY:
        hand_df = df[df["type"] == hand_type]
        if hand_df.empty:
            continue
        frames = []
        for _, group in hand_df.groupby("frame"):
            group = group.sort_values("landmark_index")
            if len(group) != HAND_LANDMARK_COUNT:
                continue
            if group[["x", "y", "z"]].isna().any().any():
                continue
            raw = group[["x", "y", "z"]].to_dict("records")
            normalized = normalize_frame(raw)
            if normalized:
                frames.append(normalized)
        if len(frames) >= MIN_VALID_FRAMES:
            return frames
    return None


def download_file(remote_path, dest_dir):
    dest_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable, "-m", "kaggle", "competitions", "download",
            "-c", COMPETITION,
            "-f", remote_path,
            "-p", str(dest_dir),
            "--force",
        ],
        check=True,
    )
    for f in dest_dir.glob("*.zip"):
        shutil.unpack_archive(str(f), str(dest_dir))
        f.unlink()
    local_path = dest_dir / Path(remote_path).name
    if not local_path.exists():
        matches = list(dest_dir.glob("*.parquet"))
        if matches:
            local_path = matches[0]
    return local_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train-csv", required=True)
    parser.add_argument("--signs", nargs="+", default=list(SIGN_NAMES.keys()))
    parser.add_argument("--out-dir", default="src/data/signs")
    parser.add_argument("--candidates", type=int, default=4)
    args = parser.parse_args()

    train = pd.read_csv(args.train_csv)
    out_dir = Path(args.out_dir)
    tmp_dir = Path(tempfile.mkdtemp(prefix="asl_signs_"))

    try:
        for sign_id in args.signs:
            name = SIGN_NAMES.get(sign_id, sign_id.title())
            rows = train[train["sign"] == sign_id]
            if rows.empty:
                print(f"[SKIP] '{sign_id}' not found in train.csv")
                continue

            candidates = rows.sample(frac=1, random_state=0).head(args.candidates)
            saved = False
            for _, row in candidates.iterrows():
                remote_path = row["path"]
                print(f"[{sign_id}] trying {remote_path} ...")
                try:
                    local_path = download_file(remote_path, tmp_dir)
                    frames = extract_hand_frames(local_path) if local_path.exists() else None
                finally:
                    for f in tmp_dir.glob("*"):
                        f.unlink()

                if not frames:
                    print(f"[{sign_id}]   no clean hand data, trying next candidate")
                    continue

                trimmed = trim_stationary(frames)
                if len(trimmed) < MIN_TRIMMED_FRAMES:
                    print(f"[{sign_id}]   too short after trimming, trying next candidate")
                    continue

                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / f"{sign_id}.json"
                out_path.write_text(json.dumps({
                    "id": sign_id,
                    "name": name,
                    "description": "",
                    "type": "motion",
                    "fps": FPS,
                    "frames": trimmed,
                }, indent=2))
                print(f"[{sign_id}] saved {len(trimmed)} frames -> {out_path}")
                saved = True
                break

            if not saved:
                print(f"[{sign_id}] FAILED - no usable sequence found in {args.candidates} candidates")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
