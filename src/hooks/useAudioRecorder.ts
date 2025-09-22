import { useState, useRef, useCallback } from 'react';

export type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface UseAudioRecorderReturn {
  state: RecordingState;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  stopRecording: () => void;
  resetRecording: () => void;
  recordingTime: number;
  audioBlob: Blob | null;
  audioStream: MediaStream | null;
  error: string | null;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>();

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Configuración más compatible para móviles
          sampleRate: { ideal: 44100, min: 8000 },
          channelCount: { ideal: 1, min: 1 } // Mono para mejor compatibilidad
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Detectar el mejor formato soportado por el navegador
      let mimeType = 'audio/webm;codecs=opus';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/mpeg',
        'audio/wav',
        '' // Formato por defecto del navegador
      ];

      for (const type of supportedTypes) {
        if (!type || MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setState('stopped');
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100);
      setState('recording');
      setRecordingTime(0);
      startTimer();

    } catch (err) {
      setError('Error al acceder al micrófono: ' + (err as Error).message);
      setState('idle');
    }
  }, [startTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      stopTimer();
    }
  }, [state, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      startTimer();
    }
  }, [state, startTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop();
      stopTimer();
    }
  }, [state, stopTimer]);

  const resetRecording = useCallback(() => {
    // Limpiar estado para nueva grabación
    setState('idle');
    setRecordingTime(0);
    setAudioBlob(null);
    setError(null);
    
    // Limpiar referencias
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    chunksRef.current = [];
  }, []);

  return {
    state,
    startRecording,
    pauseRecording: state === 'paused' ? resumeRecording : pauseRecording,
    stopRecording,
    resetRecording,
    recordingTime,
    audioBlob,
    audioStream: streamRef.current,
    error,
  };
};