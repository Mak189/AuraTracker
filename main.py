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

def classify_emotion(lm, w, h):
    # Mouth landmarks
    mouth_left = lm.landmark[61]
    mouth_right = lm.landmark[291]
    mouth_top = lm.landmark[13]
    mouth_bottom = lm.landmark[14]

    smile_width = euclidean(mouth_left, mouth_right, w, h)
    mouth_open = euclidean(mouth_top, mouth_bottom, w, h)

    # Heuristic thresholds (tweak for your test video)
    if smile_width > 60 and mouth_open < 25:
        return "happy"
    elif mouth_open > 30:
        return "distressed"
    else:
        return "neutral"

# Open video
cap = cv2.VideoCapture("distressed_to_happy.mp4")
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

