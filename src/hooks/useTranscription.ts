import { useState, useCallback, useEffect } from 'react';
import { transcriptionService, TranscriptionConfig, TranscriptionResult } from '../services/transcriptionService';

interface UseTranscriptionReturn {
  config: TranscriptionConfig;
  isTranscribing: boolean;
  transcriptionResult: TranscriptionResult | null;
  error: string | null;
  setConfig: (config: Partial<TranscriptionConfig>) => void;
  testConnection: () => Promise<boolean>;
  transcribeBlob: (audioBlob: Blob) => Promise<TranscriptionResult>;
  transcribeFile: (file: File) => Promise<TranscriptionResult>;
  clearResult: () => void;
  clearError: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [config, setConfigState] = useState<TranscriptionConfig>(() =>
    transcriptionService.getConfig()
  );
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved configuration on mount
  useEffect(() => {
    const savedConfig = transcriptionService.getConfig();
    setConfigState(savedConfig);
  }, []);

  const setConfig = useCallback((newConfig: Partial<TranscriptionConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfigState(updatedConfig);
    transcriptionService.setConfig(newConfig);
  }, [config]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const result = await transcriptionService.testConnection();
      const updatedConfig = transcriptionService.getConfig();
      setConfigState(updatedConfig);

      if (!result) {
        setError('No se pudo conectar con AssemblyAI. Verifica tu API key.');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de conexión';
      setError(errorMessage);
      return false;
    }
  }, []);

  const transcribeBlob = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    setError(null);
    setIsTranscribing(true);
    setTranscriptionResult(null);

    try {
      const result = await transcriptionService.transcribeAudio(audioBlob);
      setTranscriptionResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de transcripción';
      setError(errorMessage);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const transcribeFile = useCallback(async (file: File): Promise<TranscriptionResult> => {
    setError(null);
    setIsTranscribing(true);
    setTranscriptionResult(null);

    try {
      const result = await transcriptionService.transcribeAudioFile(file);
      setTranscriptionResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error de transcripción';
      setError(errorMessage);
      throw err;
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setTranscriptionResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    config,
    isTranscribing,
    transcriptionResult,
    error,
    setConfig,
    testConnection,
    transcribeBlob,
    transcribeFile,
    clearResult,
    clearError,
  };
}