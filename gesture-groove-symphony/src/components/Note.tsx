import React, { useRef, useEffect } from "react";
import { NoteType } from "./RhythmGame";

type NoteProps = {
    note: NoteType;
    laneCount: number;
    speed: number;
};

// Map of colors for different gestures
const NOTE_COLORS = {
    Gesture_1: "text-game-note-1",
    Gesture_2: "text-game-note-2",
    Gesture_3: "text-game-note-3",
    Gesture_4: "text-game-note-4",
    Gesture_5: "text-game-note-5",
    Gesture_6: "text-game-note-6",
    Gesture_7: "text-game-note-7",
    Gesture_8: "text-game-note-1",
};

const Note = ({ note, speed }: NoteProps) => {
    const noteRef = useRef<HTMLDivElement>(null);

    // Apply status-specific animations
    useEffect(() => {
        if (!noteRef.current) return;

        const noteElement = noteRef.current;

        if (
            note.status === "perfect" ||
            note.status === "good" ||
            note.status === "hit" ||
            note.status === "miss"
        ) {
            // Success/miss animation - use the same animation for all states
            noteElement.classList.remove("animate-note-fall");
            noteElement.classList.add("animate-success-effect");
        }
    }, [note.status]);

    // Don't render if not falling or already processed
    if (
        note.status !== "falling" &&
        note.status !== "perfect" &&
        note.status !== "good" &&
        note.status !== "miss"
    ) {
        return null;
    }

    // Calculate position - centered in the middle of the screen
    const leftPosition = "48%";

    // Select color based on gesture
    const noteColor =
        NOTE_COLORS[note.gestureKey as keyof typeof NOTE_COLORS] ||
        "text-white";

    // Determine appearance based on note status
    let noteClassName =
        "note absolute transform -translate-x-1/2 flex items-center justify-center text-lg font-bold";

    // Base on size, making circles consistent
    noteClassName += " w-16 h-16 rounded-full";

    if (note.status === "falling") {
        noteClassName += " animate-note-fall";
    } else {
        // Use the same animation for all hit statuses (perfect, good, miss)
        noteClassName += " animate-success-effect";
    }

    // Add color based on note status
    if (note.status === "perfect") {
        noteClassName += " text-game-perfect";
    } else if (note.status === "good") {
        noteClassName += " text-game-good";
    } else if (note.status === "miss") {
        noteClassName += " text-game-miss";
    } else {
        noteClassName += ` ${noteColor}`;
    }

    // Calculate top position based on note status
    const topPosition =
        note.status === "falling"
            ? "-0px" // Start above screen for falling notes
            : "57%"; // Place at target zone for hit/miss notes

    // Format gesture name to be more readable (e.g., "Gesture_1" -> "G1")
    const formattedGesture = note.gestureKey.replace("Gesture_", "G");

    return (
        <div
            ref={noteRef}
            className={noteClassName}
            style={
                {
                    left: leftPosition,
                    top: topPosition,
                    "--fall-duration": `${speed}s`,
                } as React.CSSProperties
            }
        >
            <div className="w-full h-full rounded-full bg-current opacity-20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-current"></div>
            <span className="absolute inset-0 flex items-center justify-center text-white z-10">
                {note.status === "perfect"
                    ? "Perfect"
                    : note.status === "good"
                    ? "Good"
                    : note.status === "miss"
                    ? "Miss"
                    : formattedGesture}
            </span>
        </div>
    );
};

export default Note;
