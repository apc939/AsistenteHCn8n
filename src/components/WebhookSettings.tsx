import React, { useState, useEffect } from 'react';
import { Link2, ChevronDown, ChevronUp, Loader, CheckCircle, Lock } from 'lucide-react';
import { webhookService, WebhookConfig } from '../services/webhookService';
import { StatusMessage } from './StatusMessage';
import {
  settingsCardBase,
  settingsHeaderButton,
  statusPill,
  accordionIconActive,
} from './settingsStyles';

interface WebhookSettingsProps {
  onConfigChange?: (config: WebhookConfig) => void;
}

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<WebhookConfig>({ url: '', enabled: false, isVerified: false });
  const [isExpanded, setIsExpanded] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  useEffect(() => {
    const savedConfig = webhookService.getConfig();
    setConfig(savedConfig);
  }, []);

  const testConnection = async () => {
    const trimmedUrl = config.url.trim();
    if (!trimmedUrl) {
      setTestStatus({
        message: 'La URL del webhook está definida desde el backend. Contacta soporte si no aparece.',
        type: 'warning'
      });
      return;
    }

    setIsTesting(true);
    setTestStatus({ message: 'Probando conexión...', type: 'info' });

    try {
      const isConnected = await webhookService.testConnection();
      const updatedConfig = webhookService.getConfig();
      setConfig(updatedConfig);
      onConfigChange?.(updatedConfig);
      setTestStatus({
        message: isConnected 
          ? 'Conexión exitosa con el webhook de n8n' 
          : 'No se pudo conectar al webhook',
        type: isConnected ? 'success' : 'error'
      });
    } catch (error) {
      setTestStatus({
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        type: 'error'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearStatus = () => {
    setTestStatus(null);
  };

  const isReady = config.isVerified && config.enabled;

  return (
    <div className={settingsCardBase}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`${settingsHeaderButton} flex items-center justify-between`}
      >
        <div className="flex items-center space-x-3">
          <Link2 className="h-6 w-6 text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Webhook n8n (transcripciones y notas)</h3>
            <p className="text-sm text-gray-600">Entrega automática de resultados a tu flujo n8n</p>
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
        <div className="px-6 pb-6 border-t border-gray-100 space-y-6 mt-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <h4 className="font-medium text-gray-900">URL del Webhook n8n</h4>
                <p className="text-sm text-gray-600">
                  Este endpoint está preconfigurado y protegido. Puedes copiarlo si lo necesitas, pero no es editable.
                </p>
                <code className="mt-3 block w-full break-all rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-800">
                  {config.url}
                </code>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
            <button
              onClick={testConnection}
              disabled={isTesting || !config.url.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isTesting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Probando conexión...</span>
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

          {testStatus && (
            <StatusMessage
              message={testStatus.message}
              type={testStatus.type}
              onClose={clearStatus}
            />
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
            <p className="font-medium text-blue-900">Datos enviados al webhook:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>transcript</code>: texto final (cuando está habilitado)</li>
              <li><code>notes</code>: notas clínicas estructuradas</li>
              <li><code>timestamp</code>, <code>encounter_id</code>, <code>capture_method</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
