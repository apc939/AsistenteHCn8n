import { useState } from 'react';
import { FlaskConical, CheckCircle, Loader, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { ParaclinicWebhookConfig } from '../services/paraclinicService';
import {
  settingsCardBase,
  settingsHeaderButton,
  statusPill,
  accordionIconActive,
} from './settingsStyles';

interface ParaclinicSettingsProps {
  config: ParaclinicWebhookConfig;
  onConfigChange?: (config: Partial<ParaclinicWebhookConfig>) => void;
  onTestConnection: () => Promise<boolean>;
}

export function ParaclinicSettings({
  config,
  onConfigChange: _onConfigChange,
  onTestConnection,
}: ParaclinicSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [url] = useState(config.url ?? '');

  const handleTestConnection = async () => {
    if (!url.trim()) {
      alert('La URL del webhook de paraclínicos está definida en el backend.');
      return;
    }
    setIsTesting(true);
    try {
      const ok = await onTestConnection();
      if (ok) {
        alert('✅ Conexión exitosa con el webhook de paraclínicos.');
      } else {
        alert('❌ No se pudo verificar el webhook de paraclínicos. Revisa la configuración en el backend.');
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const isReady = config.isVerified;

  return (
    <div className={settingsCardBase}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${settingsHeaderButton} flex items-center justify-between`}
      >
        <div className="flex items-center space-x-3">
          <FlaskConical className="h-6 w-6 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Paraclínicos (imágenes)</h3>
            <p className="text-sm text-gray-600">Webhook para análisis de laboratorio</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={statusPill(isReady)}>
            {isReady ? (config.enabled ? 'Configurado con envío automático' : 'Configurado sin envío automático') : 'Pendiente'}
          </span>
          {isExpanded ? (
            <ChevronUp className={accordionIconActive} />
          ) : (
            <ChevronDown className={accordionIconActive} />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="space-y-6 mt-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-start space-x-3">
                <Lock className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">URL del webhook de paraclínicos</h4>
                  <p className="text-sm text-gray-600">
                    Endpoint gestionado en el backend. Puedes copiarlo, pero permanece bloqueado para cambios.
                  </p>
                  <code className="mt-3 block w-full break-all rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-800">
                    {url}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              <button
                onClick={handleTestConnection}
                disabled={!url.trim() || isTesting}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isTesting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Probar conexión</span>
                  </>
                )}
              </button>

              {config.lastTestedAt && (
                <p className="text-xs text-gray-500">
                  Última prueba: {new Date(config.lastTestedAt).toLocaleString('es-ES')}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">Recomendaciones</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Utiliza imágenes enfocadas y legibles (preferible formato JPG o PNG).</li>
                <li>• Anonimiza resultados eliminando nombres o identificadores visibles.</li>
                <li>• El webhook debe devolver un JSON con el análisis estructurado.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
