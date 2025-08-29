import React from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number;
  isActive: boolean;
}

export const Timer: React.FC<TimerProps> = ({ duration, isActive }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Clock size={20} className={`transition-colors duration-300 ${
            isActive ? 'text-red-500' : 'text-gray-500'
          }`} />
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            Duration
          </p>
        </div>
        <p className={`text-4xl font-mono font-bold transition-colors duration-300 ${
          isActive ? 'text-red-600' : 'text-gray-800'
        }`}>
          {formatTime(duration)}
        </p>
      </div>
    </div>
  );
};