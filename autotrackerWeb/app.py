from flask import Flask, request
from flask import Flask, jsonify
<<<<<<< Updated upstream
from flask import Flask, render_template
=======
from flask import Flask, render_template 

>>>>>>> Stashed changes

app = Flask(__name__)
@app.route("/")
def home():
<<<<<<< Updated upstream
    return render_template("index.html")  # serves templates/index.html
=======
    return render_template("index.html")
>>>>>>> Stashed changes
@app.route('/analyze',methods=["POST"])
def analyze():
    if "video" not in request.files:
        return jsonify({"error":"No video file"}), 400
    video_file = request.files["video"]
    video_bytes = video_file.read()
    print(f"Received video of {len(video_bytes)} bytes")
    return jsonify({"status":"success","message":"Video Recieved","length_bytes":len(video_bytes)})
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
