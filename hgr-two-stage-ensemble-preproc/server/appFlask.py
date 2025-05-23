# gesture_server.py
# Backend server for real-time hand gesture prediction using Flask and Flask-SocketIO

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import sys
import os
import numpy as np

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dirichlet.hand_gesture_predictor import HandGestureEnsemblePredictor
import base64
import io
from PIL import Image

# --------------------------------------------------------------------------
# Configuration: update these paths to point to your trained model files
# --------------------------------------------------------------------------
MODEL_CHECKPOINTS = {
    "vgg16": "./models/gesture_vgg16_epoch_10.pth",
    "vgg19": "./models/gesture_vgg19_epoch_4.pth",
    "mobilenet": "./models/gesture_mobilenet_epoch_10.pth",
    "mobilenet_v2": "./models/gesture_mobilenet_v2_epoch_9.pth",
}

# --------------------------------------------------------------------------
# Initialize HandGestureEnsemblePredictor
# --------------------------------------------------------------------------
predictor = HandGestureEnsemblePredictor(MODEL_CHECKPOINTS)

# --------------------------------------------------------------------------
# Flask and SocketIO initialization
# --------------------------------------------------------------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = "secret!"
socketio = SocketIO(app, cors_allowed_origins="*")


# --------------------------------------------------------------------------
# WebSocket event handlers
# --------------------------------------------------------------------------
@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("connected", {"message": "Connected to gesture server"})


@socketio.on("predict_gesture")
def handle_predict(data):
    """
    Expects JSON payload with:
      - image: base64-encoded image string (with or without data URI prefix)
    """
    img_b64 = data.get("image")
    if not img_b64:
        emit("error", {"message": "No image data received"})
        return
    try:
        # Remove header if present
        header, encoded = img_b64.split(",", 1) if "," in img_b64 else ("", img_b64)
        img_bytes = base64.b64decode(encoded)
        img_path = os.path.join(os.getcwd(), "temp_image.jpg")
        with open(img_path, "wb") as f:
            f.write(img_bytes)

        # Predict using HandGestureEnsemblePredictor
        pred, probs, conf = predictor.predict(img_path)

        # Clean up temp file
        if os.path.exists(img_path):
            os.remove(img_path)

        # Send back prediction
        emit(
            "gesture_prediction",
            {
                "prediction": f"Gesture_{pred}",
                "confidence": float(conf),
                "probabilities": probs.tolist(),
            },
        )
    except Exception as e:
        emit("error", {"message": str(e)})


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


# --------------------------------------------------------------------------
# HTTP REST endpoint for single-image prediction
# --------------------------------------------------------------------------
@app.route("/predict", methods=["POST"])
def predict_route():
    # Accepts multipart form data with 'file' field
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    try:
        # Save the uploaded file temporarily
        temp_path = os.path.join(os.getcwd(), "temp_upload.jpg")
        file.save(temp_path)

        # Predict using HandGestureEnsemblePredictor
        pred, probs, conf = predictor.predict(temp_path)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return jsonify(
            {
                "prediction": f"Gesture_{pred}",
                "confidence": float(conf),
                "probabilities": probs.tolist(),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --------------------------------------------------------------------------
# Run the server
# --------------------------------------------------------------------------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
