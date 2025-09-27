import cv2
from deepface import DeepFace

# Replace with the path to your video file
video_path = "video.mp4"

cap = cv2.VideoCapture(video_path)

while True:
    ret, frame = cap.read()
    if not ret:  # No more frames in the video
        break

    try:
        result = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
        emotion = result[0]['dominant_emotion']
        cv2.putText(frame, emotion, (50, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    except:
        pass

    cv2.imshow("Video Emotion Detection", frame)

    if cv2.waitKey(25) & 0xFF == ord('q'):  # 25ms delay for playback
        break

cap.release()
cv2.destroyAllWindows()

