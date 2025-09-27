const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('output');
const canvasCtx = canvasElement.getContext('2d');
const emotionText = document.getElementById('emotion');

// Instantiate FaceMesh directly
const faceMesh = new faceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults((results) => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  canvasCtx.drawImage(results.image, 0, 0);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
    emotionText.textContent = "Face detected!";
  } else {
    emotionText.textContent = "No face detected";
  }
});

// Webcam setup
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();

