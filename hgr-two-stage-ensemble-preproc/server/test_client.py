# test_client.py
# Real-time camera client to send frames to Flask-SocketIO server and print gesture predictions

import cv2
import base64
import socketio
import time

# Ensure you have installed:
# pip install python-socketio[client] opencv-python

# --------------------------------------------------------------------------
# SocketIO client setup
# --------------------------------------------------------------------------
sio = socketio.Client()


@sio.event
def connect():
    print("[SocketIO] Connected to gesture server")


@sio.on("gesture_prediction")
def on_prediction(data):
    # Callback when server emits a prediction
    prediction = data.get("prediction")
    confidence = data.get("confidence")
    print(f"Predicted: {prediction} | Confidence: {confidence:.4f}")


@sio.event
def disconnect():
    print("[SocketIO] Disconnected from server")


# --------------------------------------------------------------------------
# Main loop: capture camera frames and send for prediction
# --------------------------------------------------------------------------
def main():
    # Adjust URL if your server is hosted elsewhere or on a different port
    server_url = "http://localhost:5000"
    sio.connect(server_url)

    # Try camera index 0 first, if that fails try index 1
    cap = cv2.VideoCapture(1)
    if not cap.isOpened():
        print("Could not open camera with index 0, trying index 1...")
        cap = cv2.VideoCapture(1)
        if not cap.isOpened():
            print("Error: Could not open camera with index 0 or 1.")
            return

    # Set camera resolution to a standard size (adjust if needed)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    # Get actual size (in case camera doesn't support requested size)
    actual_width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    actual_height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    print(f"Camera initialized with resolution: {actual_width}x{actual_height}")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Failed to capture frame.")
                break

            # Resize frame if it's too small
            if frame.shape[0] < 100 or frame.shape[1] < 100:
                frame = cv2.resize(frame, (640, 480))
                print(
                    f"Resized small frame to 640x480. Original size: {frame.shape[1]}x{frame.shape[0]}"
                )

            # Encode frame as JPEG
            _, buffer = cv2.imencode(".jpg", frame)
            jpg_bytes = buffer.tobytes()
            jpg_b64 = base64.b64encode(jpg_bytes).decode("utf-8")
            data_uri = f"data:image/jpeg;base64,{jpg_b64}"

            # Emit to server
            sio.emit("predict_gesture", {"image": data_uri})

            # Display local preview with fixed window size
            cv2.namedWindow("Camera Preview (press Q to quit)", cv2.WINDOW_NORMAL)
            cv2.resizeWindow("Camera Preview (press Q to quit)", 640, 480)
            cv2.imshow("Camera Preview (press Q to quit)", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            # Throttle if needed
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("Interrupted by user.")
    except Exception as e:
        print(f"Error in main loop: {str(e)}")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        sio.disconnect()


if __name__ == "__main__":
    main()
