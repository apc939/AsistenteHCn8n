import React from 'react';
import { RecordingState } from '../hooks/useAudioRecorder';

interface AudioVisualizerProps {
  recordingState: RecordingState;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ recordingState }) => {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="flex items-center justify-center space-x-2 h-16">
      {bars.map((bar) => (
        <div
          key={bar}
          className={`
            w-2 bg-blue-500 rounded-full transition-all duration-300
            ${recordingState === 'recording' 
              ? `h-8 animate-pulse` 
              : recordingState === 'paused'
              ? 'h-4 bg-yellow-500'
              : 'h-2 bg-gray-300'
            }
          `}
          style={{
            animationDelay: recordingState === 'recording' ? `${bar * 0.1}s` : '0s',
          }}
        />
      ))}
    </div>
  );
};