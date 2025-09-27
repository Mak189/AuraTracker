const API_URL = "http://localhost:8000"; // Flask backend


// Handle the video upload form submission
document.getElementById("uploadForm").onsubmit = async (e) => {
  e.preventDefault(); // Stop browser from reloading the page by default when the form submits

  // 1. Grab the file object (the video the user selected)
  const file = document.getElementById("videoFile").files[0];

  // 2. Build a FormData object which lets us send files in HTTP POST
  const formData = new FormData();
  formData.append("video", file);
  // The key "video" MUST match what Flask expects: request.files["video"]

  // 3. Send POST request to Flask backend (/upload endpoint)
  // Body contains the FormData (so the actual MP4 file is uploaded)
  const res = await fetch(`${API_URL}/upload`,{
    method: "POST",
    body: formData
});

  // 4. Parse backend JSON response (will contain per-frame emotions + timestamps)
  const json = await res.json();

  // 5. Display the JSON results in the <pre id="results"> HTML element
  document.getElementById("results").textContent = JSON.stringify(json, null, 2);

  // 6. Draw timeline chart of emotions across frames (function defined below)
  drawTimeline(json.frames);
};


// Webcam stream (outside of MVP)
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


// Chart.js data visualization
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
