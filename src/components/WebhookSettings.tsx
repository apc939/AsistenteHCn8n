import React, { useState, useEffect } from 'react';
import { webhookService, WebhookConfig } from '../services/webhookService';
import { StatusMessage } from './StatusMessage';

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
  const [urlStatus, setUrlStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);

  const rawAllowlist = import.meta.env.VITE_ALLOWED_WEBHOOK_DOMAINS ?? '';
  const allowedDomains = rawAllowlist
    .split(',')
    .map((domain: string) => domain.trim().toLowerCase())
    .filter(Boolean);

  const validateWebhookUrl = (value: string): { isValid: boolean; message?: string } => {
    if (!value.trim()) {
      return { isValid: false, message: 'La URL no puede estar vacía.' };
    }

    try {
      const parsed = new URL(value.trim());
      if (parsed.protocol !== 'https:') {
        return { isValid: false, message: 'La URL debe usar https:// para proteger la información.' };
      }

      const hostname = parsed.hostname.toLowerCase();
      const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
      if (isIp) {
        return { isValid: false, message: 'No se permite configurar IPs directas; utiliza un dominio con certificado TLS.' };
      }

      if (
        allowedDomains.length > 0 &&
        !allowedDomains.some((domain: string) => hostname === domain || hostname.endsWith(`.${domain}`))
      ) {
        return {
          isValid: false,
          message: 'El dominio del webhook no está en la lista permitida. Verifica la configuración segura.',
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, message: 'Formato de URL no válido.' };
    }
  };

  useEffect(() => {
    const savedConfig = webhookService.getConfig();
    setConfig(savedConfig);
  }, []);

  const handleConfigChange = (newConfig: Partial<WebhookConfig>) => {
    const urlChanged =
      newConfig.url !== undefined && newConfig.url.trim() !== (config.url ?? '').trim();

    const updatedConfig = {
      ...config,
      ...newConfig,
      ...(urlChanged && { isVerified: false, lastTestedAt: undefined }),
    };

    if (newConfig.enabled) {
      const validation = validateWebhookUrl((newConfig.url ?? config.url).trim());
      if (!validation.isValid) {
        setUrlStatus({
          message: validation.message ?? 'No se pudo habilitar el webhook porque la URL no es segura.',
          type: 'error',
        });
        return;
      }
      setUrlStatus(null);
    }

    if (urlChanged) {
      if (updatedConfig.url.trim()) {
        const validation = validateWebhookUrl(updatedConfig.url);
        if (!validation.isValid) {
          setUrlStatus({
            message: validation.message ?? 'URL no válida. Utiliza un dominio HTTPS permitido.',
            type: 'warning',
          });
        } else {
          setUrlStatus(null);
        }
      } else {
        setUrlStatus(null);
      }
    }

    setConfig(updatedConfig);
    webhookService.setConfig(updatedConfig);
    onConfigChange?.(updatedConfig);
  };

  const testConnection = async () => {
    const trimmedUrl = config.url.trim();
    if (!trimmedUrl) {
      setTestStatus({
        message: 'Por favor ingresa una URL válida',
        type: 'warning'
      });
      return;
    }

    const validation = validateWebhookUrl(trimmedUrl);
    if (!validation.isValid) {
      setTestStatus({
        message: validation.message ?? 'La URL configurada no cumple con los requisitos de seguridad.',
        type: 'error'
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

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
          Configuración del Webhook n8n
        </h3>
        <div className="flex items-center space-x-3">
          {config.url.trim() && config.isVerified && (
            <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
              Activo
            </span>
          )}
          <span className={`transform transition-transform text-gray-400 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL del Webhook n8n
            </label>
            <input
              id="webhook-url"
              type="url"
              value={config.url}
              onChange={(e) => handleConfigChange({ url: e.target.value })}
              placeholder="https://n8n.tudominio.com/webhook/consultas-medicas"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center">
            <input
              id="webhook-enabled"
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleConfigChange({ enabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="webhook-enabled" className="ml-2 block text-sm text-gray-700">
              Habilitar envío automático al finalizar grabación
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={testConnection}
              disabled={isTesting || !config.url.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? 'Probando...' : 'Probar Conexión'}
            </button>
          </div>

          {urlStatus && (
            <StatusMessage
              message={urlStatus.message}
              type={urlStatus.type}
              onClose={() => setUrlStatus(null)}
            />
          )}

          {testStatus && (
            <StatusMessage
              message={testStatus.message}
              type={testStatus.type}
              onClose={clearStatus}
            />
          )}

          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
            <p><strong>Nota:</strong> El webhook recibirá un FormData con:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li><code>audio</code>: Archivo de audio en formato WebM</li>
              <li><code>timestamp</code>: Fecha y hora de la grabación</li>
              <li><code>type</code>: "medical_consultation"</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
