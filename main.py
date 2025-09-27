import os

# Make sure outputs folder exists
import cv2
import mediapipe as mp
import math
import pandas as pd

os.makedirs("outputs", exist_ok=True)
# Initialize MediaPipe
mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=1)

def euclidean(p1, p2, w, h):
    return math.dist((p1.x * w, p1.y * h), (p2.x * w, p2.y * h))

def px_dist(a, b):
    return math.dist((a.x * w, a.y * h), (b.x * w, b.y * h))

def classify_emotion(lm, w, h, brow_gap_max=0.18, inner_brow_max=0.28):
    # Mouth landmarks
    mouth_left = lm.landmark[61]
    mouth_right = lm.landmark[291]
    mouth_top = lm.landmark[13]
    mouth_bottom = lm.landmark[14]

    right_eye_outer = lm.landmark[33]
    left_eye_outer = lm.landmark[263]
    inter_ocular = px_dist(right_eye_outer, left_eye_outer)
    if inter_ocular <= 0:
        inter_ocular = 1.0

    #eyebrows
    rb_inner = lm.landmark[105]
    re_upper = lm.landmark[159]
    lb_inner = lm.landmark[334]
    le_upper = lm.landmark[386]

    right_brow_gap_px = (re_upper.y - rb_inner.y) * h
    left_brow_gap_px  = (le_upper.y - lb_inner.y) * h
    brow_gap_avg_norm = ((right_brow_gap_px + left_brow_gap_px) / 2.0) / inter_ocular

    inner_brow_dx_px = abs(rb_inner.x - lb_inner.x) * w
    inner_brow_dx_norm = inner_brow_dx_px / inter_ocular

    smile_width = px_dist(mouth_left, mouth_right)
    mouth_open  = px_dist(mouth_top, mouth_bottom)
    FROWN_BROW_GAP_MAX   = 0.18
    FROWN_INNER_BROW_MAX = 0.28

    
    smile_width = euclidean(mouth_left, mouth_right, w, h)
    mouth_open = euclidean(mouth_top, mouth_bottom, w, h)

    # Heuristic thresholds (tweak for your test video)
    if brow_gap_avg_norm < FROWN_BROW_GAP_MAX and inner_brow_dx_norm < FROWN_INNER_BROW_MAX:
        return "frowning"
    if smile_width > 60 and mouth_open < 25:
        return "happy"
    elif mouth_open > 30:
        return "distressed"
    else:
        return "neutral"

# Open video
cap = cv2.VideoCapture("frowntest.mp4")
fps = cap.get(cv2.CAP_PROP_FPS)
frame_idx = 0
results_list = []

while True:
    success, frame = cap.read()
    if not success:
        break

    h, w, _ = frame.shape
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    if results.multi_face_landmarks:
        label = classify_emotion(results.multi_face_landmarks[0], w, h)
    else:
        label = "no_face"

    timestamp = frame_idx / fps
    results_list.append({"frame": frame_idx, "time": timestamp, "label": label})

    frame_idx += 1

cap.release()

# Save results
df = pd.DataFrame(results_list)
df.to_csv("outputs/emotion_log.csv", index=False)
print("✅ Results saved to outputs/emotion_log.csv")

