import cv2, json, numpy as np

VIDEO = "/Users/l.salvioni/Desktop/Test_sito_video/site/assets/video/casa.mp4"

# (room id, segment start/end sec, seed time sec, ROI as x0,y0,x1,y1 normalized)
ROOMS = [
    ("ingresso", 0.0, 4.0, 0.5, (0.15, 0.0, 0.48, 0.20)),
    ("cucina", 4.0, 7.0, 5.0, (0.70, 0.13, 0.93, 0.32)),
    ("bagno", 7.0, 12.0, 9.5, (0.48, 0.15, 0.72, 0.35)),
    ("camera", 12.0, 17.0, 13.5, (0.08, 0.35, 0.32, 0.58)),
    ("cabina-armadio", 17.0, 21.0, 18.0, (0.08, 0.0, 0.55, 0.20)),
    ("studio", 21.0, 25.0, 23.0, (0.08, 0.32, 0.45, 0.62)),
    ("soggiorno", 25.0, 29.0, 26.0, (0.05, 0.0, 0.42, 0.20)),
]

cap = cv2.VideoCapture(VIDEO)
fps = cap.get(cv2.CAP_PROP_FPS)
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
print("fps", fps, "size", W, H)

lk_params = dict(winSize=(31, 31), maxLevel=3,
                  criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01))

def read_range(t0, t1):
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(t0 * fps)))
    frames = []
    n = int(round((t1 - t0) * fps))
    for _ in range(max(n, 1)):
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    return frames

def track_chain(frames, start_idx):
    """track a point forward and backward from frames[start_idx], return list of (idx, x, y) or None per frame"""
    gray = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in frames]
    x0, y0, x1, y1 = roi_px
    mask = np.zeros_like(gray[start_idx])
    mask[y0:y1, x0:x1] = 255
    corners = cv2.goodFeaturesToTrack(gray[start_idx], maxCorners=1, qualityLevel=0.01,
                                       minDistance=10, mask=mask, blockSize=7)
    if corners is None:
        # ponytail: fall back to ROI center if no strong corner found — better a static
        # anchor than a crash; revisit ROI choice for this room if this ever fires
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        corners = np.array([[[cx, cy]]], dtype=np.float32)
    pt = corners[0]
    results = {start_idx: (float(pt[0][0]), float(pt[0][1]))}

    # ponytail: a >6% of frame-height jump in a single 1/30s step is not real handheld
    # motion — it means KLT latched onto the wrong feature; stop the chain there instead
    # of tracking garbage. Better a short, clean track than a long, wrong one.
    max_jump = 0.06 * H

    p = pt.reshape(1, 1, 2)
    for i in range(start_idx - 1, -1, -1):
        new_p, status, _ = cv2.calcOpticalFlowPyrLK(gray[i + 1], gray[i], p, None, **lk_params)
        if status[0][0] != 1 or np.linalg.norm(new_p[0][0] - p[0][0]) > max_jump:
            break
        p = new_p
        results[i] = (float(p[0][0][0]), float(p[0][0][1]))

    p = pt.reshape(1, 1, 2)
    for i in range(start_idx + 1, len(frames)):
        new_p, status, _ = cv2.calcOpticalFlowPyrLK(gray[i - 1], gray[i], p, None, **lk_params)
        if status[0][0] != 1 or np.linalg.norm(new_p[0][0] - p[0][0]) > max_jump:
            break
        p = new_p
        results[i] = (float(p[0][0][0]), float(p[0][0][1]))

    return results

out = {}
for room_id, t0, t1, seed_t, roi in ROOMS:
    roi_px = (int(roi[0] * W), int(roi[1] * H), int(roi[2] * W), int(roi[3] * H))
    frames = read_range(t0, t1)
    start_idx = min(int(round((seed_t - t0) * fps)), len(frames) - 1)
    results = track_chain(frames, start_idx)
    samples = []
    for i in sorted(results):
        x, y = results[i]
        samples.append({"t": round(t0 + i / fps, 3), "x": round(x / W, 4), "y": round(y / H, 4)})
    out[room_id] = samples
    print(room_id, "tracked", len(samples), "of", len(frames), "frames")

with open("/Users/l.salvioni/Desktop/Test_sito_video/site/assets/anchors.json", "w") as f:
    json.dump(out, f)
print("wrote anchors.json")
