export interface WebhookConfig {
  url: string;
  enabled: boolean;
  isVerified: boolean;
  lastTestedAt?: string;
}

const DEFAULT_TRANSCRIPTION_WEBHOOK =
  'https://piloto-n8n.2ppzbm.easypanel.host/webhook/a9259909-885a-4670-8c65-85036a79b582';

const rawAllowedWebhookDomains = import.meta.env.VITE_ALLOWED_WEBHOOK_DOMAINS ?? '';
const allowedWebhookDomains = rawAllowedWebhookDomains
  .split(',')
  .map((domain: string) => domain.trim().toLowerCase())
  .filter(Boolean);

const isIpAddress = (hostname: string): boolean => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);

const isHostnameAllowed = (hostname: string): boolean =>
  allowedWebhookDomains.length === 0 ||
  allowedWebhookDomains.some(
    (domain: string) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

export const ensureSecureWebhookUrl = (value: string): URL => {
  if (!value) {
    throw new Error('URL del webhook no configurada');
  }

  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') {
    throw new Error('La URL del webhook debe usar https://');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isIpAddress(hostname)) {
    throw new Error('La URL del webhook no puede usar una dirección IP directa');
  }

  if (!isHostnameAllowed(hostname)) {
    throw new Error('El dominio del webhook configurado no está permitido');
  }

  return parsed;
};

export class WebhookService {
  private config: WebhookConfig = {
    url: DEFAULT_TRANSCRIPTION_WEBHOOK,
    enabled: false,
    isVerified: false,
  };

  setConfig(config: Partial<WebhookConfig>) {
    const { url: _ignoredUrl, ...rest } = config;
    this.config = { ...this.config, ...rest, url: DEFAULT_TRANSCRIPTION_WEBHOOK };

    if (this.config.enabled) {
      try {
        ensureSecureWebhookUrl(this.config.url);
      } catch {
        this.config = { ...this.config, enabled: false };
      }
    }

    localStorage.setItem(
      'webhook-config',
      JSON.stringify({ ...this.config, url: DEFAULT_TRANSCRIPTION_WEBHOOK })
    );
  }

  getConfig(): WebhookConfig {
    const stored = localStorage.getItem('webhook-config');
    if (stored) {
      try {
        const { url: _ignoredUrl, ...rest } = JSON.parse(stored) as Partial<WebhookConfig>;
        this.config = {
          ...this.config,
          ...rest,
          isVerified: Boolean(rest?.isVerified),
          lastTestedAt: rest?.lastTestedAt,
          url: DEFAULT_TRANSCRIPTION_WEBHOOK,
        };
        if (this.config.enabled) {
          try {
            ensureSecureWebhookUrl(this.config.url);
          } catch {
            this.config = { ...this.config, enabled: false };
          }
        }
      } catch (error) {
        // Ignore invalid config
      }
    }
    this.config.url = DEFAULT_TRANSCRIPTION_WEBHOOK;
    return this.config;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.url) {
      throw new Error('URL del webhook no configurada');
    }

    const secureUrl = ensureSecureWebhookUrl(this.config.url);

    try {
      const response = await fetch(secureUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });

      const isSuccess = response.ok;

      this.setConfig({
        isVerified: isSuccess,
        enabled: isSuccess ? true : this.config.enabled,
        lastTestedAt: new Date().toISOString(),
      });

      return isSuccess;
    } catch (error) {
      this.setConfig({
        isVerified: false,
        lastTestedAt: new Date().toISOString(),
      });
      return false;
    }
  }

  async sendTranscription(
    transcript: string,
    metadata?: Record<string, any>,
    options?: { skipEnabledCheck?: boolean }
  ): Promise<boolean> {
    if (!this.config.url) {
      throw new Error('URL del webhook no configurada');
    }

    if (!this.config.enabled && !options?.skipEnabledCheck) {
      throw new Error('El envío automático está deshabilitado');
    }

    const secureUrl = ensureSecureWebhookUrl(this.config.url);

    const timestamp = new Date().toISOString();

    const payload = {
      transcript,
      timestamp,
      type: 'medical_consultation',
      ...metadata
    };

    const response = await fetch(secureUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  }

  // Legacy method - kept for backward compatibility but deprecated
  async sendAudio(
    audioBlob: Blob,
    metadata?: Record<string, any>,
    options?: { fileName?: string; skipEnabledCheck?: boolean }
  ): Promise<boolean> {
    console.warn('sendAudio is deprecated. Use sendTranscription instead.');

    if (!this.config.url) {
      throw new Error('URL del webhook no configurada');
    }

    if (!this.config.enabled && !options?.skipEnabledCheck) {
      throw new Error('El envío automático está deshabilitado');
    }

    const secureUrl = ensureSecureWebhookUrl(this.config.url);

    const formData = new FormData();

    const timestamp = new Date().toISOString();
    const defaultExtension = (() => {
      if (audioBlob.type.includes('mp3') || audioBlob.type.includes('mpeg')) return 'mp3';
      if (audioBlob.type.includes('wav')) return 'wav';
      if (audioBlob.type.includes('ogg')) return 'ogg';
      if (audioBlob.type.includes('mp4') || audioBlob.type.includes('m4a')) return 'm4a';
      return 'webm';
    })();

    const defaultFilename = `consulta_${timestamp.replace(/[:.]/g, '-')}.${defaultExtension}`;

    const sanitizeFileName = (value: string): string =>
      value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120);

    let filename = defaultFilename;

    if (options?.fileName) {
      const sanitized = sanitizeFileName(options.fileName);
      if (sanitized) {
        const hasExtension = /\.[a-zA-Z0-9]{2,5}$/.test(sanitized);
        filename = hasExtension ? sanitized : `${sanitized}.${defaultExtension}`;
      }
    }

    formData.append('audio', audioBlob, filename);
    formData.append('timestamp', timestamp);
    formData.append('type', 'medical_consultation');

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });
    }

    const response = await fetch(secureUrl.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  }
}

export const webhookService = new WebhookService();
