import React from 'react';
import { Mic, Pause, Play, Square } from 'lucide-react';
import { RecordingState } from '../hooks/useAudioRecorder';

interface RecordingControlsProps {
  state: RecordingState;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  state,
  onStartRecording,
  onPauseRecording,
  onStopRecording,
  disabled = false,
}) => {
  const getMainButtonConfig = () => {
    switch (state) {
      case 'idle':
      case 'stopped':
        return {
          icon: Mic,
          color: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
          action: onStartRecording,
          text: 'Iniciar Grabación'
        };
      case 'recording':
        return {
          icon: Pause,
          color: 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700',
          action: onPauseRecording,
          text: 'Pausar'
        };
      case 'paused':
        return {
          icon: Play,
          color: 'bg-green-500 hover:bg-green-600 active:bg-green-700',
          action: onPauseRecording,
          text: 'Continuar'
        };
      default:
        return {
          icon: Mic,
          color: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700',
          action: onStartRecording,
          text: 'Iniciar Grabación'
        };
    }
  };

  const mainButton = getMainButtonConfig();
  const MainIcon = mainButton.icon;
  const canStop = state === 'recording' || state === 'paused';

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Main Recording Button */}
      <div className="relative">
        {/* Pulse effect during recording */}
        {state === 'recording' && (
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
        )}
        
        <button
          onClick={mainButton.action}
          disabled={disabled}
          className={`
            relative w-24 h-24 rounded-full text-white font-semibold text-lg
            transition-all duration-200 transform hover:scale-105 active:scale-95
            shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
            ${mainButton.color}
          `}
        >
          <MainIcon className="h-10 w-10 mx-auto" />
        </button>
      </div>

      {/* Stop Button (appears during recording/paused) */}
      {canStop && (
        <button
          onClick={onStopRecording}
          disabled={disabled}
          className="
            w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:bg-red-700 
            text-white transition-all duration-200 transform hover:scale-105 active:scale-95
            shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <Square className="h-6 w-6 mx-auto" />
        </button>
      )}

      {/* Status Text */}
      <div className="text-center">
        <p className={`font-semibold text-lg ${
          state === 'idle' && 'text-gray-600'
        }${
          state === 'recording' && 'text-red-600'
        }${
          state === 'paused' && 'text-yellow-600'
        }${
          state === 'stopped' && 'text-green-600'
        }`}>
          {state === 'idle' && 'Listo para grabar'}
          {state === 'recording' && 'Grabando...'}
          {state === 'paused' && 'En pausa'}
          {state === 'stopped' && 'Grabación completada'}
        </p>
        
        <p className="text-sm text-gray-500 mt-2">
          {state === 'idle' && 'Presiona el botón azul para iniciar'}
          {state === 'recording' && 'Presiona amarillo para pausar, rojo para parar'}
          {state === 'paused' && 'Presiona verde para continuar, rojo para parar'}
          {state === 'stopped' && 'Grabación lista para enviar'}
        </p>
      </div>
    </div>
  );
};