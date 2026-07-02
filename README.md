# SignMirror

ASL learning app with real-time webcam landmark feedback.
Built with React + Vite + MediaPipe Tasks Vision (fully in-browser, no backend).

---

## How to run

```bash
cd signmirror
npm install
npm run dev
```

Open **http://localhost:5173**, click **Getting Started**, allow camera access, and show your hand.

---

## Coordinate convention

**All stored landmark data uses RAW (unmirrored) camera coordinates** as MediaPipe outputs them.

| Axis | Direction |
|------|-----------|
| `x`  | Increases left to right in the raw camera frame |
| `y`  | Increases top to bottom (wrist near 1, fingertips near 0) |
| `z`  | Depth relative to wrist; negative = closer to camera |

**Display is mirrored** via `transform: scaleX(-1)` on the webcam container so the user sees a natural mirror image. The canvas landmark overlay draws in raw coordinates -- the CSS flip handles visual mirroring without any coordinate math.

**Why raw?** Both `capture_reference.html` and the live webcam feed use the same raw coordinate space, so reference poses and live poses are directly comparable without any extra flip step in `matcher.js`.

---

## Landmark JSON format

Each file in `src/data/signs/` follows this schema:

```json
{
  "id": "hello",
  "name": "Hello",
  "description": "Brief human-readable description",
  "landmarks": [
    { "x": 0.0, "y": 0.0, "z": 0.0 },
    ...20 more...
  ]
}
```

`landmarks` is an array of **21 objects** in MediaPipe standard order, **after normalization**:

| Index | Joint |
|-------|-------|
| 0     | Wrist (always `{0,0,0}` after normalization) |
| 1-4   | Thumb: CMC, MCP, IP, TIP |
| 5-8   | Index: MCP, PIP, DIP, TIP |
| 9-12  | Middle: MCP, PIP, DIP, TIP |
| 13-16 | Ring: MCP, PIP, DIP, TIP |
| 17-20 | Pinky: MCP, PIP, DIP, TIP |

### Normalization applied to stored landmarks

1. Translate so wrist (index 0) becomes the origin `(0, 0, 0)`.
2. Compute distance from wrist to middle-finger MCP (index 9) in the x-y plane.
3. Divide all coordinates by that distance.

Makes matching invariant to hand size and camera distance. See `src/lib/normalize.js`.

---

## How to capture real reference poses

1. Open `scripts/capture_reference.html` directly in Chrome (no server needed).
2. Fill in the **sign id** (lowercase, no spaces, e.g. `hello`) and **display name**.
3. Hold the sign steady in front of your webcam.
4. Press **Space** or click Capture.
5. A `.json` file downloads automatically.
6. Move it into `src/data/signs/`.
7. In `src/data/lessons.js`, import the file and add it to the lesson's `signs` array.

---

## Tuning

All thresholds live in `src/config.js`:

| Constant | Default | Meaning |
|----------|---------|---------|
| `MATCH_THRESHOLD` | `0.08` | Mean Euclidean distance below which a pose counts as a match. Lower = stricter. |
| `PASS_HOLD_FRAMES` | `15` | Reserved for future consecutive-frame debounce (Phase 2). |
| `WASM_CDN` | jsdelivr | Where MediaPipe WASM is fetched at runtime. |
| `MODEL_URL` | GCS | Hand landmarker model. |

Start at `0.08` and tighten once you have real captured reference data.

---

## Project layout

```
signmirror/
src/
  config.js              all tunable constants
  App.jsx / App.css
  main.jsx
  components/
    WebcamView.jsx        live feed + skeleton overlay
    SignPrompt.jsx        target sign name + description
    FeedbackPanel.jsx     live distance score + pass/fail bar
    LessonList.jsx        lesson selection screen
  lib/
    handTracking.js       MediaPipe init + rAF detection loop
    normalize.js          wrist-origin, wrist-middle-MCP scale
    matcher.js            mean Euclidean distance + threshold
    progress.js           localStorage read/write
  data/
    lessons.js
    signs/                one JSON per sign (replace placeholders)
scripts/
  capture_reference.html  standalone pose capture tool (open in browser)
```
