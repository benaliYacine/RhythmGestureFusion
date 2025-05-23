
import React from 'react';
import { Button } from "@/components/ui/button";

type GameScoreProps = {
  score: number;
  perfectHits: number;
  goodHits: number;
  missedNotes: number;
  maxCombo: number;
  accuracy: number;
  onPlayAgain: () => void;
};

const GameScore = ({
  score,
  perfectHits,
  goodHits,
  missedNotes,
  maxCombo,
  accuracy,
  onPlayAgain
}: GameScoreProps) => {
  // Calculate grade based on accuracy
  const getGrade = () => {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A+';
    if (accuracy >= 85) return 'A';
    if (accuracy >= 80) return 'B+';
    if (accuracy >= 75) return 'B';
    if (accuracy >= 70) return 'C+';
    if (accuracy >= 65) return 'C';
    if (accuracy >= 60) return 'D+';
    if (accuracy >= 50) return 'D';
    return 'F';
  };

  // Get color for the grade
  const getGradeColor = () => {
    const grade = getGrade();
    if (grade === 'S') return 'text-yellow-400';
    if (grade.startsWith('A')) return 'text-green-500';
    if (grade.startsWith('B')) return 'text-blue-500';
    if (grade.startsWith('C')) return 'text-purple-500';
    if (grade.startsWith('D')) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-lg">
      <div className="bg-gray-900/90 w-[90%] max-w-md rounded-xl p-8 border border-white/10">
        <h2 className="text-3xl font-bold mb-2 text-center">Game Results</h2>
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6"></div>
        
        <div className="mb-6 text-center">
          <p className="text-lg mb-2">Final Score</p>
          <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">{score}</p>
        </div>
        
        <div className="mb-6 text-center">
          <p className="text-lg mb-1">Grade</p>
          <p className={`text-6xl font-bold ${getGradeColor()}`}>{getGrade()}</p>
          <p className="text-lg mt-1">Accuracy: {accuracy}%</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-400">Perfect Hits</p>
            <p className="text-2xl font-bold text-game-perfect">{perfectHits}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-400">Good Hits</p>
            <p className="text-2xl font-bold text-game-good">{goodHits}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-400">Misses</p>
            <p className="text-2xl font-bold text-game-miss">{missedNotes}</p>
          </div>
          <div className="bg-black/30 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-400">Max Combo</p>
            <p className="text-2xl font-bold">{maxCombo}</p>
          </div>
        </div>
        
        <Button
          onClick={onPlayAgain}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 rounded-lg"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
};

export default GameScore;
