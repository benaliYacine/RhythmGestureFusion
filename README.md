# Gesture Groove Symphony

This project is composed of two main parts:

## 1. `hgr-two-stage-ensemble-preproc`

This folder contains the backend logic and models used for hand gesture recognition:

- **Jupyter Notebook**: Fine-tuning code for 4 CNN models.
- **`hand_gesture_predictor.py`**: Loads the fine-tuned models and outputs the predicted hand gesture.
- **`server/`**: Flask-based server that provides an API for the frontend to query gesture predictions.

### Notes:

- All fine-tuned models are **large** and are not included in the repo. You can download them from https://drive.google.com/file/d/1nSfX1HtbxTwg4qpVCExfWhprUpaYzMa0/view?usp=sharing and place them inside the `hgr-two-stage-ensemble-preproc` directory.

## 2. `gesture-groove-symphony`

This is the React frontend application — a rhythm game that interacts with the backend.

### Setup Notes:

- Make sure the Flask server from `hgr-two-stage-ensemble-preproc/server` is running.
- The app is configured to use **camera ID 1** by default. If your webcam is on ID 0 (most common), change it in the source code.

## Getting Started

2. **Start Flask server**:
   ```bash
   cd hgr-two-stage-ensemble-preproc/server
   python appFlask.py
   ```
3. **Start React frontend**:
   ```bash
   cd gesture-groove-symphony
   npm run dev
   ```
