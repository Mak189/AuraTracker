const API_URL = "http://localhost:8000";

// Video Upload
document.getElementById("uploadForm").onsubmit = async (e) => {
  e.preventDefault();
  const file = document.getElementById("videoFile").files[0];
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });

  //   const json = await res.json();
// Fake response (pretend backend processed video)
  const json = {
    frames: [
      { time: 0, emotion: "happy" },
      { time: 1, emotion: "neutral" },
      { time: 2, emotion: "sad" },
      { time: 3, emotion: "happy" },
    ],
    summary: { happy: 50, neutral: 25, sad: 25 }
  };

  document.getElementById("results").textContent = JSON.stringify(json, null, 2);

  drawTimeline(json.frames);
};

// Webcam Stream
const video = document.getElementById("webcam");
navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
  video.srcObject = stream;
});

setInterval(async () => {
  const canvas = document.getElementById("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0);

  const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg"));
  const formData = new FormData();
  formData.append("frame", blob);


  //   const res = await fetch(`${API_URL}/frame`, { method: "POST", body: formData });
// Fake response (pretend backend processed frame)
  setInterval(async () => {
  const fakeRes = { emotion: ["happy", "sad", "angry"][Math.floor(Math.random() * 3)] };
  document.getElementById("liveResults").textContent = JSON.stringify(fakeRes);
}, 1000);  

const json = await res.json();
  document.getElementById("liveResults").textContent = JSON.stringify(json);
}, 1000);

// Chart.js Timeline
let chart;
function drawTimeline(frames) {
  const labels = frames.map(f => f.time);
  const data = frames.map(f => f.emotion);

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("timeline"), {
    type: "line",
    data: {
      labels,
      datasets: [{ label: "Emotion", data }]
    }
  });
}
