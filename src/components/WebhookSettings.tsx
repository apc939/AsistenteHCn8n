import React, { useState, useEffect } from 'react';
import { Link2, ChevronDown, ChevronUp, Loader, CheckCircle } from 'lucide-react';
import { webhookService, WebhookConfig } from '../services/webhookService';
import { StatusMessage } from './StatusMessage';
import {
  settingsCardBase,
  settingsHeaderButton,
  statusPill,
  accordionIconActive,
  toggleWrapper,
  toggleThumb,
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white placeholder-gray-400"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <h4 className="font-medium text-gray-900">Envío automático</h4>
              <p className="text-sm text-gray-600">
                Publicar transcripciones y notas al finalizar cada encuentro
              </p>
            </div>
            <button
              onClick={() => handleConfigChange({ enabled: !config.enabled })}
              disabled={!config.isVerified}
              className={`${toggleWrapper(config.enabled)} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className={toggleThumb(config.enabled)} />
            </button>
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
