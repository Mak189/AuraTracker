from flask import Flask, request
from flask import Flask, jsonify


app = Flask(__name__)
@app.route('/', methods = ['GET', 'POST'])
def home():
    if(request.method == 'GET'):

        data = "hello world"
        return jsonify({'data': data})
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
