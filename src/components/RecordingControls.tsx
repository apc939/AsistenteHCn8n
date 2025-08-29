import React from 'react';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { RecordingState } from '../hooks/useAudioRecorder';

interface RecordingControlsProps {
  recordingState: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  recordingState,
  onStart,
  onPause,
  onResume,
  onStop,
  disabled = false,
}) => {
  const getMainButtonConfig = () => {
    switch (recordingState) {
      case 'idle':
        return {
          text: 'Start Recording',
          icon: <Mic size={28} />,
          onClick: onStart,
          className: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        };
      case 'recording':
        return {
          text: 'Pause',
          icon: <Pause size={28} />,
          onClick: onPause,
          className: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
        };
      case 'paused':
        return {
          text: 'Resume',
          icon: <Play size={28} />,
          onClick: onResume,
          className: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
        };
    }
  };

  const mainButton = getMainButtonConfig();

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Main Control Button */}
      <div className="relative">
        <button
          onClick={mainButton.onClick}
          disabled={disabled}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center text-white font-semibold
            transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4
            shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed
            ${mainButton.className}
          `}
        >
          {mainButton.icon}
        </button>

        {/* Recording pulse effect */}
        {recordingState === 'recording' && (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-75 animate-ping"></div>
        )}
      </div>

      {/* Status Text */}
      <div className="text-center">
        <p className="text-xl font-semibold text-gray-800 mb-2">
          {mainButton.text}
        </p>
        {recordingState !== 'idle' && (
          <p className="text-sm text-gray-600">
            {recordingState === 'recording' 
              ? 'Tap to pause recording' 
              : 'Tap to resume recording'
            }
          </p>
        )}
      </div>

      {/* Stop Button */}
      {(recordingState === 'recording' || recordingState === 'paused') && (
        <button
          onClick={onStop}
          className="px-8 py-4 bg-gray-700 hover:bg-gray-800 text-white rounded-xl font-medium
                   transition-all duration-200 transform hover:scale-105 active:scale-95
                   shadow-lg hover:shadow-xl flex items-center space-x-3 focus:outline-none focus:ring-4 focus:ring-gray-500"
        >
          <Square size={20} />
          <span>Stop & Send Recording</span>
        </button>
      )}
    </div>
  );
};