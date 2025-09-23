import { Copy, Download, FileText, Loader, Share2 } from 'lucide-react';
import { TranscriptionResult } from '../services/transcriptionService';

interface TranscriptionPanelProps {
  transcriptionResult: TranscriptionResult | null;
  isTranscribing: boolean;
  error: string | null;
  onClearResult: () => void;
  onSendResult?: () => void;
  isSending?: boolean;
  encounterId: string;
}

export function TranscriptionPanel({
  transcriptionResult,
  isTranscribing,
  error,
  onClearResult,
  onSendResult,
  isSending,
  encounterId,
}: TranscriptionPanelProps) {
  const copyToClipboard = async () => {
    if (!transcriptionResult?.text) return;

    try {
      await navigator.clipboard.writeText(transcriptionResult.text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const downloadTranscript = () => {
    if (!transcriptionResult?.text) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `transcripcion_${encounterId}_${timestamp}.txt`;

    const blob = new Blob([transcriptionResult.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  if (!isTranscribing && !transcriptionResult && !error) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-800">
            Transcripción de Audio
          </h3>
        </div>
        {transcriptionResult && (
          <button
            onClick={onClearResult}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar transcripción
          </button>
        )}
        {transcriptionResult && onSendResult && (
          <button
            onClick={onSendResult}
            disabled={isSending}
            className="text-sm text-blue-500 hover:text-blue-700 underline flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="h-4 w-4" />
            <span>{isSending ? 'Enviando…' : 'Enviar a n8n'}</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {isTranscribing && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Transcribiendo audio...</p>
            <p className="text-sm text-gray-500 mt-2">
              Esto puede tomar unos momentos dependiendo de la duración del audio
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-6 py-4 rounded-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center mt-0.5">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="font-medium">Error en la transcripción</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {transcriptionResult && !isTranscribing && (
        <div className="space-y-6">
          {/* Transcript Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800">ID de Transcripción</p>
              <p className="text-xs text-purple-600 font-mono">{transcriptionResult.id}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-800">Confianza</p>
              <p className="text-sm text-green-600">
                {transcriptionResult.confidence ? formatConfidence(transcriptionResult.confidence) : 'N/A'}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Estado</p>
              <p className="text-sm text-blue-600 capitalize">{transcriptionResult.status}</p>
            </div>
          </div>

          {/* Transcript Text */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto Transcrito
            </label>
            <div className="relative">
              <textarea
                value={transcriptionResult.text}
                readOnly
                className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 text-gray-900 font-mono text-sm resize-none min-h-[200px] focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="El texto transcrito aparecerá aquí..."
              />

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Copiar al portapapeles"
                >
                  <Copy className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={downloadTranscript}
                  className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Descargar transcripción"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Word Count and Character Count */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>
              Palabras: {transcriptionResult.text.trim().split(/\s+/).filter(word => word.length > 0).length}
            </span>
            <span>
              Caracteres: {transcriptionResult.text.length}
            </span>
          </div>

          {/* Privacy Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-yellow-200 flex items-center justify-center">
                  <span className="text-yellow-700 text-xs font-bold">!</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">
                  Recordatorio de Privacidad
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Esta transcripción se mantiene solo en memoria durante la sesión.
                  AssemblyAI sustituye nombres, organizaciones e identificadores detectados por hashes, pero verifica manualmente antes de enviarla.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
