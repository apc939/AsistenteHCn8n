import { useState, useCallback, useEffect } from 'react';
import {
  paraclinicService,
  type ParaclinicWebhookConfig,
  type ParaclinicAnalysisResult,
} from '../services/paraclinicService';

export interface ParaclinicUploadLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error';
  message: string;
}

interface UseParaclinicsReturn {
  config: ParaclinicWebhookConfig;
  setConfig: (config: Partial<ParaclinicWebhookConfig>) => void;
  testConnection: () => Promise<boolean>;
  isUploading: boolean;
  analysis: ParaclinicAnalysisResult | null;
  error: string | null;
  logs: ParaclinicUploadLog[];
  uploadImages: (files: File[], metadata?: Record<string, unknown>) => Promise<void>;
  clearAnalysis: () => void;
  clearError: () => void;
  clearLogs: () => void;
}

export function useParaclinics(): UseParaclinicsReturn {
  const [config, setConfigState] = useState<ParaclinicWebhookConfig>(() => paraclinicService.getConfig());
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState<ParaclinicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ParaclinicUploadLog[]>([]);

  useEffect(() => {
    setConfigState(paraclinicService.getConfig());
  }, []);

  const setConfig = useCallback((newConfig: Partial<ParaclinicWebhookConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    paraclinicService.setConfig(newConfig);
  }, [config]);

  const appendLog = useCallback((entry: ParaclinicUploadLog) => {
    setLogs(prev => [entry, ...prev].slice(0, 10));
  }, []);

  const testConnection = useCallback(async () => {
    setError(null);
    try {
      const ok = await paraclinicService.testConnection();
      setConfigState(paraclinicService.getConfig());
      if (!ok) {
        setError('No se pudo conectar con el webhook de paraclínicos. Verifica la URL.');
      }
      return ok;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo verificar el webhook de paraclínicos';
      setError(message);
      return false;
    }
  }, []);

  const uploadImages = useCallback(async (files: File[], metadata?: Record<string, unknown>) => {
    if (!files.length) {
      setError('Selecciona al menos una imagen.');
      return;
    }

    setError(null);
    setIsUploading(true);
    const startedAt = new Date();
    const logId = startedAt.getTime().toString();

    try {
      const result = await paraclinicService.sendImages(files, metadata);
      setAnalysis(result);

      appendLog({
        id: logId,
        timestamp: startedAt.toLocaleString('es-ES'),
        status: 'success',
        message: 'Paraclínicos analizados correctamente',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar el paraclínico';
      setError(message);
      appendLog({
        id: logId,
        timestamp: startedAt.toLocaleString('es-ES'),
        status: 'error',
        message,
      });
    } finally {
      setIsUploading(false);
    }
  }, [appendLog]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    config,
    setConfig,
    testConnection,
    isUploading,
    analysis,
    error,
    logs,
    uploadImages,
    clearAnalysis,
    clearError,
    clearLogs,
  };
}
