from flask import Flask, request
from flask import Flask, jsonify
from flask import Flask, render_template
import tempfile
import os
import cv2
from deepface import DeepFace
from collections import Counter
import numpy as np


app = Flask(__name__)
@app.route("/")
def home():
    return render_template("index2.html")  # serves templates/index.html
@app.route("/upload", methods=["POST"])
def upload():
    if "video" not in request.files:
        return jsonify({"error": "No video file"}), 400

    video_file = request.files["video"]

    # Save to a temporary file
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".mp4")
    video_file.save(tmp_path)
    os.close(tmp_fd)

    cap = cv2.VideoCapture(tmp_path)
    frames = []
    frame_count = 0
    fps = cap.get(cv2.CAP_PROP_FPS) or 24  # default fallback if FPS missing

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1

        # sample every Nth frame (~1 per second)
        if frame_count % int(fps) == 0:
            try:
                result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
                emotion = result[0]["dominant_emotion"]
                time_sec = frame_count / fps
                frames.append({"time": round(time_sec, 2), "emotion": emotion})
            except Exception as e:
                print("Error analyzing frame:", e)

    cap.release()
    os.remove(tmp_path)

    # Build summary counts
    summary = Counter(f["emotion"] for f in frames)

    return jsonify({
        "frames": frames,
        "summary": summary,
        "total_frames": frame_count
    })
@app.route("/live", methods=["POST"])
def live():
    if "frame" not in request.files:
        return jsonify({"error": "No frame file"}), 400

    frame_file = request.files["frame"]

    # Convert uploaded JPEG blob to OpenCV frame
    file_bytes = np.frombuffer(frame_file.read(), np.uint8)
    frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    try:
        result = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False)
        emotion = result[0]["dominant_emotion"]
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"emotion": emotion})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
