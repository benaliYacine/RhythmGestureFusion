import React, { useEffect } from "react";

// NOTE: This component is for development purposes only.
// It will create placeholder audio files in the console.
// In production, you should use real audio files instead.

const PlaceholderAudio: React.FC = () => {
    useEffect(() => {
        // Check if placeholders already exist to avoid duplicates
        if ((window as any).__placeholderSoundsInitialized) {
            return;
        }

        // Log instructions for adding real audio files
        console.log("===== AUDIO PLACEHOLDER =====");
        console.log(
            "For the best experience, please add real audio files to the /public/audio/ directory:"
        );
        console.log("- /audio/perfect.mp3: Sound for perfect hits");
        console.log("- /audio/good.mp3: Sound for good hits");
        console.log("- /audio/miss.mp3: Sound for misses");
        console.log("- /audio/countdown.mp3: Sound for countdown (3,2,1)");
        console.log("- /audio/countdown-go.mp3: Sound for GO!");
        console.log("- /audio/game-start.mp3: Sound when starting game");
        console.log("- /audio/game-over.mp3: Sound when game ends");
        console.log("- /audio/bg-music.mp3: Background music for gameplay");
        console.log("=============================");

        // Create the AudioContext
        try {
            const audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();

            // Create placeholders for each sound
            createPlaceholderSound("perfect", 220, 0.2, audioContext); // A3 note, short
            createPlaceholderSound("good", 196, 0.2, audioContext); // G3 note, short
            createPlaceholderSound("miss", 165, 0.3, audioContext); // E3 note, slightly longer
            createPlaceholderSound("countdown", 330, 0.1, audioContext); // E4 note, very short
            createPlaceholderSound("countdownGo", 440, 0.3, audioContext); // A4 note, medium
            createPlaceholderSound(
                "gameStart",
                [294, 370, 440],
                0.5,
                audioContext
            ); // D4+F#4+A4 chord, medium
            createPlaceholderSound(
                "gameOver",
                [523, 659, 784],
                1.0,
                audioContext
            ); // C5+E5+G5 chord, long

            // Create a simple background music pattern (repeating notes)
            createBackgroundMusic(audioContext);

            // Mark as initialized to prevent duplicate initialization
            (window as any).__placeholderSoundsInitialized = true;
        } catch (e) {
            console.error("Web Audio API is not supported in this browser", e);
        }

        // Cleanup function
        return () => {
            // Stop background music if it's playing
            if ((window as any).__placeholderSounds?.bgMusic?.pause) {
                (window as any).__placeholderSounds.bgMusic.pause();
            }
        };
    }, []);

    return null; // This component doesn't render anything
};

// Helper function to create a simple tone
function createPlaceholderSound(
    name: string,
    frequency: number | number[],
    duration: number,
    audioContext: AudioContext
) {
    // Save the sound to window for easy access
    (window as any).__placeholderSounds =
        (window as any).__placeholderSounds || {};

    // Create the actual sound generator function
    (window as any).__placeholderSounds[name] = () => {
        // For chords (multiple frequencies)
        if (Array.isArray(frequency)) {
            frequency.forEach((freq) => {
                playTone(freq, duration, audioContext);
            });
        } else {
            playTone(frequency, duration, audioContext);
        }
    };

    console.log(`Created placeholder sound: ${name}`);
}

// Helper function to play a tone
function playTone(
    frequency: number,
    duration: number,
    audioContext: AudioContext
) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Add a simple attack/decay envelope
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.start();
    oscillator.stop(now + duration);
}

// Create a simple background music pattern
function createBackgroundMusic(audioContext: AudioContext) {
    (window as any).__placeholderSounds =
        (window as any).__placeholderSounds || {};

    let bgMusicInterval: number | null = null;

    // Start the background music
    (window as any).__placeholderSounds.bgMusic = {
        play: () => {
            if (bgMusicInterval) return;

            // Simple sequence of notes that repeats
            const sequence = [262, 294, 330, 349, 392, 440, 494, 523]; // C4 major scale

            let index = 0;

            bgMusicInterval = window.setInterval(() => {
                playTone(sequence[index], 0.2, audioContext);
                index = (index + 1) % sequence.length;
            }, 350) as unknown as number;

            console.log("Background music started");
        },
        pause: () => {
            if (bgMusicInterval) {
                clearInterval(bgMusicInterval);
                bgMusicInterval = null;
                console.log("Background music paused");
            }
        },
    };

    console.log("Created placeholder background music");
}

export default PlaceholderAudio;
