import { useState } from 'react';
import { ChevronDown, ChevronUp, Key, CheckCircle, Loader } from 'lucide-react';
import { TranscriptionConfig } from '../services/transcriptionService';
import {
  settingsCardBase,
  settingsHeaderButton,
  statusPill,
  accordionIconActive,
  toggleWrapper,
  toggleThumb,
} from './settingsStyles';

interface TranscriptionSettingsProps {
  config: TranscriptionConfig;
  onConfigChange: (config: Partial<TranscriptionConfig>) => void;
  onTestConnection: () => Promise<boolean>;
}

export function TranscriptionSettings({
  config,
  onConfigChange,
  onTestConnection,
}: TranscriptionSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [apiKey, setApiKey] = useState(config.apiKey || '');

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    onConfigChange({ apiKey: value });
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      alert('Por favor ingresa una API key antes de probar la conexión');
      return;
    }

    setIsTesting(true);
    try {
      const success = await onTestConnection();
      if (success) {
        alert('✅ Conexión exitosa con AssemblyAI');
      } else {
        alert('❌ Error de conexión. Verifica tu API key');
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleEnabled = () => {
    if (!config.isVerified && !config.enabled) {
      alert('Primero debes verificar la conexión con AssemblyAI');
      return;
    }
    onConfigChange({ enabled: !config.enabled });
  };

  const isApiKeyConfigured = Boolean(apiKey.trim());
  const isReady = config.isVerified;

  return (
    <div className={settingsCardBase}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${settingsHeaderButton} flex items-center justify-between`}
      >
        <div className="flex items-center space-x-3">
          <Key className="h-6 w-6 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AssemblyAI</h3>
            <p className="text-sm text-gray-600">Transcripción automática y PII</p>
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
            {/* API Key Input */}
            <div>
              <label htmlFor="assemblyai-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                API Key de AssemblyAI
              </label>
              <div className="relative">
                <input
                  id="assemblyai-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="Ingresa tu API key de AssemblyAI"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-12"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Key className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Puedes obtener tu API key gratuita en{' '}
                <a
                  href="https://www.assemblyai.com/dashboard/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 underline"
                >
                  assemblyai.com
                </a>
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              <button
                onClick={handleTestConnection}
                disabled={!isApiKeyConfigured || isTesting}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isTesting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Probando conexión...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Probar Conexión</span>
                  </>
                )}
              </button>

              {config.lastTestedAt && (
                <p className="text-xs text-gray-500">
                  Última prueba: {new Date(config.lastTestedAt).toLocaleString('es-ES')}
                </p>
              )}
            </div>

            {/* Enable/Disable Toggle */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Transcripción automática</h4>
                  <p className="text-sm text-gray-600">
                    Transcribir automáticamente el audio después de grabación
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
              <p className="text-xs text-gray-500">
                {config.enabled
                  ? 'El texto se enviará automáticamente a n8n y quedará disponible en el panel.'
                  : 'Puedes transcribir bajo demanda y decidir manualmente cuándo enviar a n8n.'}
              </p>
            </div>

            {/* Configuration Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 mb-2">Configuración de Transcripción</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Idioma: Español (es)</li>
                <li>• Puntuación: Activada</li>
                <li>• Formato de texto: Activado</li>
                <li>• Redacción PII: Activada (nombres, cédulas, organizaciones, ocupaciones → hash)</li>
                <li>• Almacenamiento: Solo en memoria durante la sesión</li>
              </ul>
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
                    Aviso de Privacidad
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Tu API key se almacena localmente en el navegador. Las transcripciones
                    se procesan en los servidores de AssemblyAI según sus políticas de privacidad.
                    Solo envíes audio anonimizado sin información personal identificable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
