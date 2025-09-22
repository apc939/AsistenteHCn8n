import React from 'react';

interface TimerProps {
  seconds: number;
  isRecording: boolean;
}

export const Timer: React.FC<TimerProps> = ({ seconds, isRecording }) => {
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`
        text-4xl font-mono font-bold px-8 py-4 rounded-2xl shadow-lg
        transition-all duration-300 border-2
        ${isRecording 
          ? 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-300 shadow-red-200/50' 
          : 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-gray-300 shadow-gray-200/50'
        }
      `}>
        {formatTime(seconds)}
      </div>
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="ml-4 flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="ml-2 text-sm font-medium text-red-600">REC</span>
        </div>
      )}
    </div>
  );
};