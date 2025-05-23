import React, { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GameScore from "./GameScore";
import CountdownTimer from "./CountdownTimer";
import Lanes from "./Lanes";
import Note from "./Note";
import CameraView, { CameraViewHandle } from "./CameraView";
import PlaceholderAudio from "./PlaceholderAudio";

// Define possible gestures that can be detected
const GESTURES = [
    "Gesture_0",
    "Gesture_1",
    "Gesture_2",
    "Gesture_3",
    "Gesture_4",
    "Gesture_5",
    // "Gesture_6",
    // "Gesture_7",
    // "Gesture_8",
];

// Map from original keys to gestures (for backward compatibility)
const KEY_TO_GESTURE = {
    A: "Gesture_0",
    B: "Gesture_1",
    C: "Gesture_2",
    D: "Gesture_3",
    E: "Gesture_4",
    F: "Gesture_5",
    // G: "Gesture_6",
    // H: "Gesture_7",
    // I: "Gesture_8",
};

// Difficulty settings
const GAME_DURATION = 30; // seconds
const NOTE_SPEED = 8; // seconds to fall
const NOTE_SPAWN_RATE = 2000; // ms between spawns
const NOTE_ACCURACY_THRESHOLD = 400; // ms threshold for perfect hit (increased for better hit detection)

// Target zone position (percentage from top of screen)
const TARGET_ZONE_POSITION = 75; // 75% down from top

// User perception offset (positive values mean user tends to hit later than geometric calculation)
const USER_PERCEPTION_OFFSET_MS = 30; // ms

// Scoring system
const SCORE_PERFECT = 200;
const SCORE_GOOD = 75;
const SCORE_MISS = 0;

export type NoteType = {
    id: string;
    lane: number; // Always 0 for single lane
    key: string;
    gestureKey: string; // The gesture that should be shown
    timestamp: number;
    status: "falling" | "perfect" | "good" | "miss" | "hit";
    startTime: number;
};

export type GameState =
    | "idle"
    | "countdown"
    | "playing"
    | "paused"
    | "finished";

const RhythmGame = () => {
    const [gameState, setGameState] = useState<GameState>("idle");
    const [countdown, setCountdown] = useState<number>(3);
    const [timer, setTimer] = useState<number>(GAME_DURATION);
    const [score, setScore] = useState<number>(0);
    const [combo, setCombo] = useState<number>(0);
    const [maxCombo, setMaxCombo] = useState<number>(0);
    const [notes, setNotes] = useState<NoteType[]>([]);
    const [perfectHits, setPerfectHits] = useState<number>(0);
    const [goodHits, setGoodHits] = useState<number>(0);
    const [missedNotes, setMissedNotes] = useState<number>(0);
    const [totalNotes, setTotalNotes] = useState<number>(0);
    const [lastFeedback, setLastFeedback] = useState<{
        text: string;
        color: string;
        timestamp: number;
    } | null>(null);

    const gameRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<number | null>(null);
    const spawnTimerRef = useRef<number | null>(null);
    const notesProcessedRef = useRef<Set<string>>(new Set());
    const cameraViewRef = useRef<CameraViewHandle>(null);
    const lastGestureRef = useRef<string>("");
    const { toast } = useToast();
    const navigate = useNavigate();

    // Start the game countdown
    const startGame = useCallback(() => {
        setGameState("countdown");
        setCountdown(3);

        const countdownInterval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    // Show "GO!" message
                    if (prev === 1) {
                        setTimeout(() => {
                            setGameState("playing");
                        }, 500); // Show GO! for half a second
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    // Handle space key down event for timing-based hits
    const handleSpaceKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.code !== "Space" || gameState !== "playing") return;

            // Get the current gesture from the camera component
            const currentGesture =
                cameraViewRef.current?.getCurrentGesture() || "";
            lastGestureRef.current = currentGesture;

            const now = Date.now();

            // Find falling notes
            const hittableNotes = notes.filter(
                (note) =>
                    note.status === "falling" &&
                    !notesProcessedRef.current.has(note.id)
            );

            if (hittableNotes.length === 0) return;

            const closestNote = hittableNotes.sort((a, b) => {
                const aExpectedTime =
                    a.startTime +
                    NOTE_SPEED * 1000 * (TARGET_ZONE_POSITION / 100) +
                    USER_PERCEPTION_OFFSET_MS;
                const bExpectedTime =
                    b.startTime +
                    NOTE_SPEED * 1000 * (TARGET_ZONE_POSITION / 100) +
                    USER_PERCEPTION_OFFSET_MS;
                const aDistance = Math.abs(now - aExpectedTime);
                const bDistance = Math.abs(now - bExpectedTime);
                return aDistance - bDistance;
            })[0];

            const expectedArrivalAtTarget =
                closestNote.startTime +
                NOTE_SPEED * 1000 * (TARGET_ZONE_POSITION / 100) +
                USER_PERCEPTION_OFFSET_MS;
            const hitTiming = now - expectedArrivalAtTarget;
            const accuracyMs = Math.abs(hitTiming);

            notesProcessedRef.current.add(closestNote.id);

            // Check if the gesture matches what's expected for this note
            const isGestureMatch = closestNote.gestureKey === currentGesture;

            // Determine hit quality based on timing AND gesture matching
            let hitStatus: "perfect" | "good" | "miss";
            let hitScore: number;
            let feedback: string;
            let feedbackColor: string;

            if (!isGestureMatch) {
                // Wrong gesture = automatic miss
                hitStatus = "miss";
                hitScore = SCORE_MISS;
                feedback = "WRONG GESTURE!";
                feedbackColor = "text-game-miss";
                setMissedNotes((prev) => prev + 1);
                setCombo(0);
            } else if (accuracyMs < NOTE_ACCURACY_THRESHOLD / 2) {
                hitStatus = "perfect";
                hitScore = SCORE_PERFECT;
                feedback = "PERFECT!";
                feedbackColor = "text-game-perfect";
                setPerfectHits((prev) => prev + 1);
                setCombo((prev) => {
                    const newCombo = prev + 1;
                    if (newCombo > maxCombo) setMaxCombo(newCombo);
                    return newCombo;
                });
            } else if (accuracyMs < NOTE_ACCURACY_THRESHOLD) {
                hitStatus = "good";
                hitScore = SCORE_GOOD;
                feedback = "GOOD!";
                feedbackColor = "text-game-good";
                setGoodHits((prev) => prev + 1);
                setCombo((prev) => {
                    const newCombo = prev + 1;
                    if (newCombo > maxCombo) setMaxCombo(newCombo);
                    return newCombo;
                });
            } else {
                hitStatus = "miss";
                hitScore = SCORE_MISS;
                feedback = "MISS!";
                feedbackColor = "text-game-miss";
                setMissedNotes((prev) => prev + 1);
                setCombo(0);
            }

            setLastFeedback({
                text: feedback,
                color: feedbackColor,
                timestamp: Date.now(),
            });

            // Update note status
            setNotes((prevNotes) =>
                prevNotes.map((note) =>
                    note.id === closestNote.id
                        ? { ...note, status: hitStatus }
                        : note
                )
            );

            // Update score
            setScore((prev) => prev + hitScore);
        },
        [notes, gameState, maxCombo]
    );

    // Game timer effect
    useEffect(() => {
        if (gameState === "playing") {
            timerRef.current = window.setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        timerRef.current = null;
                        setGameState("finished");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [gameState]);

    // Spawn notes effect
    useEffect(() => {
        if (gameState === "playing") {
            const spawnNote = () => {
                // For single lane, we just randomize the gesture
                const randomGestureIndex = Math.floor(
                    Math.random() * GESTURES.length
                );
                const randomKeyIndex = Math.floor(
                    Math.random() * Object.keys(KEY_TO_GESTURE).length
                );
                const randomKey = Object.keys(KEY_TO_GESTURE)[randomKeyIndex];
                const now = Date.now();

                setNotes((prev) => [
                    ...prev,
                    {
                        id: `note-${now}-${Math.random()}`,
                        lane: 0, // Always lane 0 for single lane
                        key: randomKey, // For backward compatibility with key display
                        gestureKey: GESTURES[randomGestureIndex], // The gesture needed to hit this note
                        timestamp: now,
                        status: "falling",
                        startTime: now,
                    },
                ]);

                setTotalNotes((prev) => prev + 1);
            };

            // Initial spawn
            spawnNote();

            // Set up regular spawning
            spawnTimerRef.current = window.setInterval(
                spawnNote,
                NOTE_SPAWN_RATE
            );
        }

        return () => {
            if (spawnTimerRef.current) {
                clearInterval(spawnTimerRef.current);
                spawnTimerRef.current = null;
            }
        };
    }, [gameState]);

    // Check for missed notes
    useEffect(() => {
        if (gameState !== "playing") {
            return; // Do nothing if not playing
        }

        const checkMissedNotesInterval = setInterval(() => {
            const now = Date.now();
            setNotes((prevNotes) => {
                let missedOccurred = false;
                const updatedNotes = prevNotes.map((note) => {
                    if (
                        note.status === "falling" &&
                        !notesProcessedRef.current.has(note.id)
                    ) {
                        const timeToTargetZone =
                            NOTE_SPEED * 1000 * (TARGET_ZONE_POSITION / 100);
                        const expectedArrivalAtTarget =
                            note.startTime +
                            timeToTargetZone +
                            USER_PERCEPTION_OFFSET_MS;

                        // A note is missed if it's past the target zone + accuracy threshold (late side)
                        const missLineTime =
                            expectedArrivalAtTarget + NOTE_ACCURACY_THRESHOLD;

                        if (now > missLineTime) {
                            notesProcessedRef.current.add(note.id);
                            setMissedNotes((prev) => prev + 1);
                            setCombo(0);
                            missedOccurred = true;
                            return { ...note, status: "miss" as const };
                        }
                    }
                    return note;
                });

                if (missedOccurred) {
                    setLastFeedback({
                        text: "MISS!",
                        color: "text-game-miss",
                        timestamp: now,
                    });
                }

                // Remove notes that are visually far off-screen or processed
                return updatedNotes.filter((note) => {
                    const noteAge = now - note.startTime;
                    const maxNoteAge = NOTE_SPEED * 1000 * 1.5; // Keep notes for 1.5x the full fall duration
                    return noteAge < maxNoteAge; // This will eventually remove old hit/miss notes too
                });
            });
        }, 100); // Check every 100ms

        return () => clearInterval(checkMissedNotesInterval);
    }, [gameState]); // Dependencies: gameState. State setters are stable.

    // Keyboard event listeners for spacebar
    useEffect(() => {
        if (gameState === "playing") {
            window.addEventListener("keydown", handleSpaceKeyDown);
        }

        return () => {
            window.removeEventListener("keydown", handleSpaceKeyDown);
        };
    }, [gameState, handleSpaceKeyDown]);

    // Reset game
    const resetGame = () => {
        setGameState("idle");
        setNotes([]);
        setScore(0);
        setCombo(0);
        setMaxCombo(0);
        setTimer(GAME_DURATION);
        setPerfectHits(0);
        setGoodHits(0);
        setMissedNotes(0);
        setTotalNotes(0);
        notesProcessedRef.current.clear();
        lastGestureRef.current = "";
    };

    // Pause game
    const pauseGame = () => {
        if (gameState === "playing") {
            setGameState("paused");
            toast({
                title: "Game Paused",
                description: "Take a break! Resume when you're ready.",
            });
        } else if (gameState === "paused") {
            setGameState("playing");
            toast({
                title: "Game Resumed",
                description: "Let's continue!",
            });
        }
    };

    // Go to home
    const goToHome = () => {
        navigate("/");
        resetGame();
    };

    // Get accuracy percentage
    const getAccuracy = () => {
        if (totalNotes === 0) return 0;
        return Math.round(
            ((perfectHits * 1.0 + goodHits * 0.5) / totalNotes) * 100
        );
    };

    // Render feedback
    const renderFeedback = () => {
        if (!lastFeedback) return null;

        // Only show feedback if it's recent (last 500ms)
        if (Date.now() - lastFeedback.timestamp > 500) return null;

        return (
            <div
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold ${lastFeedback.color} animate-fade-in`}
            >
                {lastFeedback.text}
            </div>
        );
    };

    return (
        <div
            ref={gameRef}
            className="w-full h-screen flex flex-col items-center justify-center bg-game-bg relative overflow-hidden"
        >
            {/* Placeholder audio to generate sounds if real ones are not available */}
            {gameState !== "idle" && <PlaceholderAudio />}
            {/* Game UI - Header */}
            <div className="absolute top-0 left-0 w-full p-4 bg-black/30 backdrop-blur-sm flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-black/50 p-2 rounded-md">
                        <h2 className="text-xl font-bold">Time: {timer}s</h2>
                    </div>
                    <div className="bg-black/50 p-2 rounded-md">
                        <h2 className="text-xl font-bold">Score: {score}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-black/50 p-2 rounded-md">
                        <h2 className="text-xl font-bold">Combo: {combo}</h2>
                    </div>
                    <div className="bg-black/50 p-2 rounded-md">
                        <h2 className="text-xl font-bold">
                            Accuracy: {getAccuracy()}%
                        </h2>
                    </div>
                </div>
            </div>

            {/* Control buttons (visible during gameplay) */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className="absolute top-16 right-4 flex gap-2 z-20">
                    <Button
                        variant="outline"
                        size="icon"
                        className="bg-black/50 border-white/20 hover:bg-black/70"
                        onClick={goToHome}
                        title="Go to Home"
                    >
                        <Home className="text-white" />
                    </Button>
                </div>
            )}

            {/* Game Content Area - flex container for Lanes and Camera */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className="flex justify-center items-start w-full h-full pt-24">
                    {/* Game Lanes - Now a single lane */}
                    <div className="w-1/3 flex justify-center">
                        <Lanes
                            keys={[""]} // Just a single empty lane
                            targetZonePosition={TARGET_ZONE_POSITION}
                        />
                    </div>
                    {/* Camera Viewport */}
                    <div className="w-1/3 translate-x-1/3 flex justify-center">
                        <CameraView ref={cameraViewRef} />
                    </div>
                </div>
            )}

            {/* Current Gesture Instruction */}
            {(gameState === "playing" || gameState === "paused") && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-6 py-3 rounded-lg z-20">
                    <div className="text-center">
                        <p className="text-lg font-bold mb-1">
                            Press SPACE when your gesture matches the falling
                            note
                        </p>
                        <p className="text-sm text-gray-300">
                            Current detected gesture:{" "}
                            <span className="font-bold text-white">
                                {lastGestureRef.current || "None"}
                            </span>
                        </p>
                    </div>
                </div>
            )}

            {/* Falling Notes - only visible during gameplay or paused */}
            {(gameState === "playing" || gameState === "paused") &&
                notes.map((note) => (
                    <Note
                        key={note.id}
                        note={note}
                        laneCount={1} // Only one lane
                        speed={NOTE_SPEED}
                    />
                ))}

            {/* Paused overlay */}
            {gameState === "paused" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                    <div className="text-4xl font-bold text-white">PAUSED</div>
                </div>
            )}

            {/* Feedback Display */}
            {renderFeedback()}

            {/* Countdown Display */}
            {gameState === "countdown" && (
                <CountdownTimer key={countdown} count={countdown} />
            )}

            {/* Game State UI */}
            {gameState === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-20">
                    <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                        Gesture Groove Symphony
                    </h1>
                    <p className="text-xl mb-8 max-w-md text-center">
                        Make the gesture matching the falling note and press
                        SPACE when it reaches the target zone. Time your
                        gestures perfectly for maximum score!
                    </p>
                    <div className="flex gap-4 mb-8">
                        {Object.entries(KEY_TO_GESTURE)
                            .slice(0, 4)
                            .map(([key, gesture]) => (
                                <div
                                    key={key}
                                    className="p-3 rounded flex items-center justify-center bg-white/10 border border-white/30 text-lg font-bold"
                                >
                                    {gesture}
                                </div>
                            ))}
                    </div>
                    <Button
                        onClick={startGame}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold px-8 py-6 text-xl rounded-full"
                    >
                        Start Game
                    </Button>
                </div>
            )}

            {/* Game Results */}
            {gameState === "finished" && (
                <GameScore
                    score={score}
                    perfectHits={perfectHits}
                    goodHits={goodHits}
                    missedNotes={missedNotes}
                    maxCombo={maxCombo}
                    accuracy={getAccuracy()}
                    onPlayAgain={() => {
                        resetGame();
                        toast({
                            title: "Game Reset",
                            description:
                                "Let's try to beat your previous score!",
                        });
                    }}
                />
            )}
        </div>
    );
};

export default RhythmGame;
