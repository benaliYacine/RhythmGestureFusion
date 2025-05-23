import React, {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
    useState,
} from "react";
import { io, Socket } from "socket.io-client";

// Define the type for the ref methods we want to expose
export interface CameraViewHandle {
    getVideoElement: () => HTMLVideoElement | null;
    getCurrentGesture: () => string;
}

// Server configuration
const SERVER_URL = "http://localhost:5000";

const CameraView = forwardRef<CameraViewHandle>((props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket | null>(null);
    const [currentGesture, setCurrentGesture] = useState<string>("");
    const [confidence, setConfidence] = useState<number>(0);
    const frameIntervalRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
        getVideoElement: () => videoRef.current,
        getCurrentGesture: () => currentGesture,
    }));

    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            try {
                if (
                    navigator.mediaDevices &&
                    navigator.mediaDevices.getUserMedia
                ) {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } else {
                    console.error(
                        "getUserMedia not supported on this browser!"
                    );
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
            }
        };

        // Initialize socket connection
        const initializeSocket = () => {
            socketRef.current = io(SERVER_URL);

            socketRef.current.on("connect", () => {
                console.log("Connected to gesture recognition server");
            });

            socketRef.current.on("gesture_prediction", (data) => {
                const { prediction, confidence } = data;
                console.log(
                    `Received gesture: ${prediction}, confidence: ${confidence}`
                );
                setCurrentGesture(prediction);
                setConfidence(confidence);
            });

            socketRef.current.on("error", (error) => {
                console.error("Socket error:", error);
            });

            socketRef.current.on("disconnect", () => {
                console.log("Disconnected from gesture recognition server");
            });
        };

        startCamera();
        initializeSocket();

        return () => {
            // Cleanup: stop the stream when the component unmounts
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }

            // Stop sending frames
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }

            // Disconnect socket
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

    // Set up canvas and start frame capture once video is loaded
    useEffect(() => {
        const handleVideoPlay = () => {
            // Initialize the canvas
            if (canvasRef.current && videoRef.current) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
            }

            // Start capturing frames
            startCapturingFrames();
        };

        if (videoRef.current) {
            videoRef.current.addEventListener("play", handleVideoPlay);
        }

        return () => {
            if (videoRef.current) {
                videoRef.current.removeEventListener("play", handleVideoPlay);
            }
        };
    }, []);

    const startCapturingFrames = () => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
        }

        frameIntervalRef.current = window.setInterval(() => {
            captureFrame();
        }, 200); // Capture every 200ms to avoid overloading the server
    };

    const captureFrame = () => {
        if (
            !canvasRef.current ||
            !videoRef.current ||
            !socketRef.current ||
            socketRef.current.disconnected
        ) {
            return;
        }

        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        // Draw the current video frame to the canvas
        try {
            ctx.drawImage(
                videoRef.current,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            // Convert canvas to a data URL (base64 encoded image)
            const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.7);

            // Send the frame to the server for prediction
            socketRef.current.emit("predict_gesture", { image: dataUrl });
        } catch (err) {
            console.error("Error capturing frame:", err);
        }
    };

    return (
        <div className="w-full h-full bg-gray-900 border-2 border-gray-700 rounded-lg flex flex-col items-center justify-center text-white overflow-hidden relative">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
            />

            {/* Hidden canvas used for capturing frames */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay for displaying current gesture */}
            <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded-md text-sm">
                {currentGesture ? (
                    <>
                        <span className="font-bold">{currentGesture}</span>
                        <span className="ml-2 text-gray-300">
                            ({(confidence * 100).toFixed(0)}%)
                        </span>
                    </>
                ) : (
                    "Waiting for gesture..."
                )}
            </div>

            {/* Fallback text if video doesn't load */}
            {!videoRef.current?.srcObject && (
                <p className="absolute text-lg">Camera Feed</p>
            )}
        </div>
    );
});

CameraView.displayName = "CameraView";
export default CameraView;
