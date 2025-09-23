import { useState } from 'react';
import { FlaskConical, CheckCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { ParaclinicWebhookConfig } from '../services/paraclinicService';
import {
  settingsCardBase,
  settingsHeaderButton,
  statusPill,
  accordionIconActive,
  toggleWrapper,
  toggleThumb,
} from './settingsStyles';

interface ParaclinicSettingsProps {
  config: ParaclinicWebhookConfig;
  onConfigChange: (config: Partial<ParaclinicWebhookConfig>) => void;
  onTestConnection: () => Promise<boolean>;
}

export function ParaclinicSettings({
  config,
  onConfigChange,
  onTestConnection,
}: ParaclinicSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [url, setUrl] = useState(config.url ?? '');

  const handleUrlChange = (value: string) => {
    setUrl(value);
    onConfigChange({ url: value });
  };

  const handleToggleEnabled = () => {
    if (!config.isVerified && !config.enabled) {
      alert('Verifica primero el webhook de paraclínicos antes de habilitarlo.');
      return;
    }
    onConfigChange({ enabled: !config.enabled });
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      alert('Ingresa la URL del webhook de paraclínicos antes de probar.');
      return;
    }
    setIsTesting(true);
    try {
      const ok = await onTestConnection();
      if (ok) {
        alert('✅ Conexión exitosa con el webhook de paraclínicos.');
      } else {
        alert('❌ No se pudo verificar el webhook de paraclínicos.');
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
            <div>
              <label htmlFor="paraclinic-webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
                URL del webhook de paraclínicos
              </label>
              <input
                id="paraclinic-webhook-url"
                type="url"
                value={url}
                onChange={(event) => handleUrlChange(event.target.value)}
                placeholder="https://mi-servidor.n8n.cloud/webhook/paraclinicos"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Asegúrate de que la URL use HTTPS y que el dominio esté incluido en la lista segura.
              </p>
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

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <h4 className="font-medium text-gray-900">Envío automático</h4>
                <p className="text-sm text-gray-600">
                  Enviar imágenes inmediatamente después de cargarlas
                </p>
              </div>
              <button
                onClick={handleToggleEnabled}
                disabled={!config.isVerified}
                className={`${toggleWrapper(config.enabled)} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className={toggleThumb(config.enabled)} />
              </button>
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
