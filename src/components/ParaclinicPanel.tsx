import { useMemo, useState } from 'react';
import { Images, UploadCloud, Loader, Trash2, Sparkles, Copy } from 'lucide-react';
import { ParaclinicAnalysisResult } from '../services/paraclinicService';

interface ParaclinicPanelProps {
  isUploading: boolean;
  analysis: ParaclinicAnalysisResult | null;
  error: string | null;
  onUpload: (files: File[]) => Promise<void>;
  onClear: () => void;
  onClearError: () => void;
  patientAlias: string;
  patientId: string;
  encounterId: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
const MAX_IMAGES = 6;

export function ParaclinicPanel({
  isUploading,
  analysis,
  error,
  onUpload,
  onClear,
  onClearError,
  patientAlias,
  patientId,
  encounterId,
}: ParaclinicPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const previews = useMemo(() => selectedFiles.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
  })), [selectedFiles]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const valid: File[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach(file => {
      if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        valid.push(file);
      } else {
        rejected.push(file.name);
      }
    });

    if (rejected.length > 0) {
      alert(`Se ignoraron ${rejected.length} archivo(s) por formato no soportado.`);
    }

    setSelectedFiles(prev => {
      const combined = [...prev, ...valid].slice(0, MAX_IMAGES);
      return combined;
    });

    event.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      alert('Selecciona al menos una imagen de paraclínicos.');
      return;
    }

    await onUpload(selectedFiles);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const handleCopyAnalysis = async () => {
    if (!analysis?.summary) return;
    try {
      await navigator.clipboard.writeText(analysis.summary);
      alert('Resumen copiado al portapapeles');
    } catch (err) {
      alert('No se pudo copiar. Copia manualmente desde el panel.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Images className="h-6 w-6 text-emerald-600" />
          <h3 className="text-xl font-semibold text-gray-800">
            Paraclínicos: imágenes y análisis
          </h3>
        </div>
        {analysis && (
          <button
            onClick={() => {
              clearSelection();
              onClear();
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Limpiar análisis
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6">
          <div className="flex flex-col items-center text-center">
            <UploadCloud className="h-10 w-10 text-emerald-500 mb-3" />
            <p className="text-sm text-emerald-800 font-medium">
              Adjunta hasta {MAX_IMAGES} imágenes (JPG, PNG, HEIC, WEBP)
            </p>
            <p className="text-xs text-emerald-700 mb-4">
              Anonimiza los reportes antes de subirlos. El análisis se vinculará al encuentro actual.
            </p>
            <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors">
              Seleccionar imágenes
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {previews.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Imágenes seleccionadas ({previews.length})</p>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>Limpiar</span>
              </button>
            </div>

            <ul className="space-y-2 text-sm text-gray-600">
              {previews.map((file) => (
                <li key={file.name} className="flex items-center justify-between">
                  <span className="truncate max-w-[70%]">{file.name}</span>
                  <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="border border-red-300 bg-red-50 text-red-800 px-4 py-3 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Error en el análisis</p>
                <p className="text-xs mt-1">{error}</p>
                <button
                  onClick={onClearError}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Ocultar mensaje
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={isUploading || selectedFiles.length === 0}
          className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {isUploading ? (
            <>
              <Loader className="h-5 w-5 animate-spin" />
              <span>Analizando paraclínicos…</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Enviar a n8n</span>
            </>
          )}
        </button>

        {analysis && (
          <div className="bg-white border border-emerald-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h4 className="text-lg font-semibold text-emerald-700">Resultado del análisis</h4>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCopyAnalysis}
                className="inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                <Copy className="h-4 w-4" />
                <span>Copiar texto</span>
              </button>
            </div>

            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              {analysis.summary}
            </div>

            {analysis.sections?.length ? (
              <div className="space-y-3">
                {analysis.sections.map((section, index) => (
                  <div key={`${section.title}-${index}`} className="bg-gray-50 rounded-lg p-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-1">{section.title}</h5>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="text-xs text-gray-400">
              Encuentro: {encounterId} • Alias: {patientAlias || 'N/D'} • ID interno: {patientId || 'N/D'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
