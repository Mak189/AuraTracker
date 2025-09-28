/***********************************************
 * script.js — frontend logic for:
 * - upload prerecorded video
 * - live webcam preview + recording (MediaRecorder)
 * - upload recording to backend
 * - Chart.js timeline (time -> emotion)
 * - click chart to seek playback and show frame snapshot
 *
 * IMPORTANT: Serve this over http://localhost (or via Flask static). 
 * Browsers block getUserMedia on file://
 ***********************************************/

// === CONFIG: change if your backend runs elsewhere ===
const API_URL = "http://127.0.0.1:5001"
// === ELEMENT REFERENCES ===
const uploadForm = document.getElementById("uploadForm");
const videoFileInput = document.getElementById("videoFile");

const recordPreview = document.getElementById("recordPreview"); // live webcam preview
const liveCanvas = document.createElement('canvas');
// Grab video and overlay canvas elements
const liveOverlay = document.getElementById('liveOverlay');
const liveCtx = liveCanvas.getContext('2d');

// Ensure overlay matches video size once metadata is loaded
recordPreview.addEventListener('loadedmetadata', () => {
  liveOverlay.width = recordPreview.videoWidth;
  liveOverlay.height = recordPreview.videoHeight;
});

const startRecBtn = document.getElementById("startRec");
const stopRecBtn = document.getElementById("stopRec");
const uploadRecBtn = document.getElementById("uploadRec");
const recordStatus = document.getElementById("recordStatus");

const playback = document.getElementById("playback"); // for playing back uploaded/recorded video
const snapshotCanvas = document.getElementById("snapshot");
const resultsPre = document.getElementById("results");

const timelineCanvas = document.getElementById("timeline");
const legendDiv = document.getElementById("legend");

// === STATE ===
// mediaRecorder: the browser’s MediaRecorder object.
// * It controls starting/stopping recording from the webcam stream.
// * Example: mediaRecorder.start() begins saving frames/audio,
//   mediaRecorder.stop() finalizes and makes a video blob.
let mediaRecorder = null;
// recordedChunks: an array of chunks of video data captured during recording.
// * The MediaRecorder API doesn’t give you the video as one big file right away.
// * Instead, it spits out little “pieces” (blobs) of video data.
// * When recording stops, you glue them together into one Blob and turn it
//   into an .mp4 or .webm file.
let recordedChunks = [];
// localStream: the live webcam stream itself (MediaStream).
// Comes from navigator.mediaDevices.getUserMedia({ video: true }).
// Needed for two things:
// 1. Displaying the live video feed in <video> element.
// 2. Feeding into MediaRecorder when you want to record.
let localStream = null;
let chart = null;
// emotionMapping and reverse: to map emotion labels to numeric values for Chart.js y-axis
// (and back for tooltips and y-axis labels).
// Chart.js needs numeric values for y-axis, but we want to show readable emotion names.
let emotionMapping = {};     // emotion -> numeric mapping (for y axis)
let emotionReverse = {};     // numeric -> emotion label
// Used for:
// * Drawing the line chart (time → emotion).
// * Letting the user scrub through chart → jump to frame in video.
let currentTimelineData = []; // array of {time, emotion}
// For emotion timeline scrubbing, store the last uploaded/recorded
// video file and URL
let currentVideoFile = null;
let currentVideoURL = null;

/* ---------------------------
   1) Webcam preview + get media
   --------------------------- */
async function initWebcam() {
  try {
    // request permission for webcam + mic (mic optional, can be set to false)
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // attach stream to preview element so user sees live video
    recordPreview.srcObject = localStream;
    // ensure autoplay works on many browsers
    recordPreview.play().catch(() => { });
  } catch (err) {
    console.error("Could not access webcam:", err);
    alert("Webcam access denied or not available. Check permissions and that you're serving over http://localhost.");
  }
}
initWebcam(); // start immediately (preview always visible)

/* ---------------------------
   2) MediaRecorder (record webcam)
   --------------------------- */
function initRecorder() {
  if (!localStream) {
    alert("No webcam stream available. Allow camera permission or reload.");
    return;
  }

  // Prefer webm with vp8/9; browser decides best mimeType
  let options = { mimeType: "video/mp4; codecs=avc1" };
  // If browser supports a mimeType, you can specify it:
  // if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) options.mimeType = "video/webm;codecs=vp9";

  mediaRecorder = new MediaRecorder(localStream, options);

  // collect recorded data
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    // when stopped, create a blob and show it in playback element
    const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || "video/webm" });
    const url = URL.createObjectURL(blob);
    playback.src = url;
    // enable upload button
    uploadRecBtn.disabled = false;
  };
}


/**
 * Display the predicted emotion as an overlay on the live video feed
 * @param {string} emotion - Emotion string returned from backend (e.g. "neutral", "frowning")
 */
function displayLiveEmotion(emotion) {
  // Clear any old overlay drawings
  liveCtx.clearRect(0, 0, liveOverlay.width, liveOverlay.height);

  // Draw a semi-transparent black rectangle in top-left corner
  liveCtx.fillStyle = 'rgba(0,0,0,0.5)';
  liveCtx.fillRect(10, 10, 150, 40);

  // Draw emotion text in white
  liveCtx.fillStyle = 'white';
  liveCtx.font = '20px sans-serif';
  liveCtx.fillText(`Emotion: ${emotion}`, 20, 40);
}


// Poll backend every 300ms (~3 FPS) with a frame from the webcam
setInterval(async () => {
  // 1. Capture a frame from the video
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = recordPreview.videoWidth;
  tmpCanvas.height = recordPreview.videoHeight;
  tmpCanvas.getContext('2d').drawImage(recordPreview, 0, 0);

  // 2. Convert captured frame into an image blob (JPEG)
  const blob = await new Promise(resolve =>
    tmpCanvas.toBlob(resolve, 'image/jpeg', 0.6) // 0.6 = quality setting
  );

  // 3. Send frame to backend
  const formData = new FormData();
  formData.append('frame', blob);

  const res = await fetch(`${API_URL}/live`, {
    method: 'POST',
    body: formData
  });
  const { emotion } = await res.json(); // Expect response { emotion: "neutral" }

  // 4. Draw overlay with backend result
  displayLiveEmotion(emotion);

}, 300);


/* ---------------------------
   3) UI: start / stop / upload recording
   --------------------------- */
startRecBtn.addEventListener("click", () => {
  if (!localStream) {
    alert("No webcam stream. Make sure you allowed camera access.");
    return;
  }
  recordedChunks = [];
  initRecorder();
  mediaRecorder.start();
  startRecBtn.disabled = true;
  stopRecBtn.disabled = false;
  uploadRecBtn.disabled = true;
  // show visible recording indicator
  recordStatus.style.display = "block";
});

stopRecBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  startRecBtn.disabled = false;
  stopRecBtn.disabled = true;
  recordStatus.style.display = "none";
});

uploadRecBtn.addEventListener("click", async () => {
  // build a File from recorded chunks (browser creates WebM)
  const blob = new Blob(recordedChunks, { type: recordedChunks[0]?.type || "video/webm" });
  const file = new File([blob], "recording.webm", { type: blob.type });

  // reuse the same upload path as prerecorded videos
  await uploadVideoFile(file);
});

/* ---------------------------
   4) Uploading a selected prerecorded file
   --------------------------- */
uploadForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const file = videoFileInput.files[0];
  if (!file) {
    alert("Choose a video file to upload.");
    return;
  }
  // show selected file in playback for quick preview
  const url = URL.createObjectURL(file);
  playback.src = url;

  await uploadVideoFile(file);
});

/* ---------------------------
   5) uploadVideoFile: POST to backend
     - sends FormData with key "video"
     - assumes backend returns JSON:
       { frames: [{time: 0.0, emotion: "happy"}, ...], summary: {...} }
   --------------------------- */
async function uploadVideoFile(file) {
  resultsPre.textContent = "Uploading...";
  try {
    const formData = new FormData();
    formData.append("video", file);

    // store video reference globally
    currentVideoFile = file;
    currentVideoURL = URL.createObjectURL(file);
    playback.src = currentVideoURL; // set video for playback

    const res = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server error ${res.status}: ${txt}`);
    }

    const json = await res.json();

    // show raw json
    resultsPre.textContent = JSON.stringify(json, null, 2);

    // normalize frames and draw timeline
    if (json.frames && Array.isArray(json.frames) && json.frames.length > 0) {
      // frames should be objects with `time` and `emotion`
      currentTimelineData = json.frames.map(f => ({ time: Number(f.time), emotion: String(f.emotion) }));
      setupAndDrawTimeline(currentTimelineData);
    } else {
      // no per-frame data — clear chart
      currentTimelineData = [];
      if (chart) chart.destroy();
    }
  } catch (err) {
    console.error("Upload error:", err);
    resultsPre.textContent = `Upload error: ${err.message}`;
    alert("Upload failed. See console for details.");
  }
}

/* ---------------------------
   6) Chart.js timeline + mapping emotions to Y values
   - we map emotions to numbers for plotting, but show readable labels.
   - clicking the chart seeks playback video to the nearest timestamp and draws a snapshot.
   --------------------------- */
function buildEmotionMapping(frames) {
  // find unique emotions in order of appearance
  const set = [];
  for (const f of frames) {
    if (!set.includes(f.emotion)) set.push(f.emotion);
  }
  // create mapping
  emotionMapping = {};
  emotionReverse = {};
  set.forEach((em, i) => {
    // map to integers 0..N-1 (higher values appear up the y-axis)
    emotionMapping[em] = i;
    emotionReverse[i] = em;
  });

  // build legend UI
  legendDiv.innerHTML = set.map((em, i) => `<div>${i} → ${em}</div>`).join("");
  return set;
}

function setupAndDrawTimeline(frames) {
  // build mapping (so chart y-axis shows emotion labels)
  const unique = buildEmotionMapping(frames);

  // data arrays
  const labels = frames.map(f => f.time); // x axis = time in seconds
  const y = frames.map(f => emotionMapping[f.emotion]);

  // Chart.js: scatter line (show points)
  if (chart) chart.destroy();

  chart = new Chart(timelineCanvas.getContext("2d"), {
    type: "scatter",
    data: {
      labels: labels, // used for tooltips & x axis
      datasets: [{
        label: 'Emotion',
        data: y,
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        borderColor: 'rgba(30,144,255,0.9)',
        backgroundColor: 'rgba(30,144,255,0.6)'
      }]
    },
    options: {
      animation: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: { display: true, text: 'Time (s)' },
          ticks: {
            callback: function(value, index, ticks) {
              // value is numeric time (we used labels to store times)
              return Number(value).toFixed(1);
            }
          }
        },
        y: {
          type: 'linear',
          title: { display: true, text: 'Emotion' },
          ticks: {
            stepSize: 1,
            callback: function(value, index, values) {
              // map numeric back to emotion label if exists
              return emotionReverse[value] ?? value;
            }
          },
          min: 0,
          max: Math.max(0, Object.keys(emotionReverse).length - 1)
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const idx = context.dataIndex;
              const time = context.chart.data.labels[idx];
              const yval = context.parsed.y ?? context.parsed;
              const emot = emotionReverse[yval] ?? yval;
              return `t=${Number(time).toFixed(2)}s → ${emot}`;
            }
          }
        }
      },
      onClick: chartClickSeek // when user clicks chart, seek video
    }
  });

  // Chart.js expects numeric x data if using linear x — we passed labels as times.
  // To ensure plotting uses times, replace dataset.data with objects {x: time, y: value}
  chart.data.datasets[0].data = frames.map(f => ({ x: f.time, y: emotionMapping[f.emotion] }));
  chart.update();
}

/* ---------------------------
   7) Seek playback when user clicks the chart
   --------------------------- */
function chartClickSeek(evt, activeEls) {
  // Use Chart.js API to convert click to chart coordinates
  const points = chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
  if (points.length === 0) return;

  const first = points[0];
  const datasetIndex = first.datasetIndex;
  const index = first.index;

  // find the corresponding frame/time
  const frame = currentTimelineData[index];
  if (!frame) return;

  // seek the playback video (if present)
  try {
    if (playback.src) {
      playback.currentTime = frame.time;
      setTimeout(drawSnapshotAtCurrentTime, 100);
    }
  } catch (err) {
    console.warn("Could not seek playback:", err);
  }
}

/* ---------------------------
   8) When playback time updates, optionally highlight nearest point on chart
   --------------------------- */
playback.addEventListener('timeupdate', () => {
  const t = playback.currentTime;
  if (!chart || currentTimelineData.length === 0) return;

  // find nearest index
  let nearestIdx = 0;
  let nearestDelta = Infinity;
  currentTimelineData.forEach((f, i) => {
    const d = Math.abs(f.time - t);
    if (d < nearestDelta) {
      nearestDelta = d;
      nearestIdx = i;
    }
  });

  // emphasize the point by setting pointRadius dynamically (simple approach)
  const ds = chart.data.datasets[0];
  ds.pointRadius = ds.data.map((_, i) => (i === nearestIdx ? 7 : 4));
  chart.update('none');
});

/* ---------------------------
   9) Init: make sure legend placeholder is set
   --------------------------- */
legendDiv.innerHTML = "<em>No timeline yet</em>";

/* ---------------------------
   10) Helper: allow pressing Enter to upload file quickly
   --------------------------- */
videoFileInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') uploadForm.requestSubmit();
});


// Temporary PapaParse for CSV parsing for testing data visualization
// (uncomment to enable CSV loading UI in index.html)

// const csvFileInput = document.getElementById('csvFile');
// const loadCsvBtn = document.getElementById('loadCsv');

// loadCsvBtn.addEventListener('click', () => {
//   const file = csvFileInput.files[0];
//   if (!file) {
//     alert("Select a CSV file first");
//     return;
//   }

//   Papa.parse(file, {
//     header: true,        // CSV has header row
//     dynamicTyping: true, // converts numbers automatically
//     skipEmptyLines: true,
//     complete: function(results) {
//       // map CSV columns to frame objects for Chart.js
//       const frames = results.data
//         .filter(r => r.time != null && r.label) // remove empty rows
//         .map(r => ({ time: Number(r.time), emotion: String(r.label) }));

//       // assign to timeline data and draw chart
//       currentTimelineData = frames;
//       setupAndDrawTimeline(currentTimelineData);
//       resultsPre.textContent = "CSV loaded successfully!";
//     },
//     error: function(err) {
//       console.error("CSV parse error:", err);
//       alert("Error parsing CSV. See console for details.");
//     }
//   });
// });
