import { ensureSecureWebhookUrl } from './webhookService';

export interface ParaclinicWebhookConfig {
  url: string;
  enabled: boolean;
  isVerified: boolean;
  lastTestedAt?: string;
}

export interface ParaclinicAnalysisResult {
  id: string;
  summary: string;
  sections?: Array<{ title: string; content: string }>;
  raw?: any;
}

class ParaclinicService {
  private config: ParaclinicWebhookConfig = {
    url: '',
    enabled: false,
    isVerified: false,
  };

  setConfig(config: Partial<ParaclinicWebhookConfig>) {
    this.config = { ...this.config, ...config };

    if (this.config.enabled) {
      try {
        ensureSecureWebhookUrl(this.config.url);
      } catch {
        this.config = { ...this.config, enabled: false };
      }
    }

    localStorage.setItem('paraclinic-webhook-config', JSON.stringify(this.config));
  }

  getConfig(): ParaclinicWebhookConfig {
    const stored = localStorage.getItem('paraclinic-webhook-config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<ParaclinicWebhookConfig>;
        this.config = {
          ...this.config,
          ...parsed,
          isVerified: Boolean(parsed?.isVerified),
          lastTestedAt: parsed?.lastTestedAt,
        };
        if (this.config.enabled) {
          try {
            ensureSecureWebhookUrl(this.config.url);
          } catch {
            this.config = { ...this.config, enabled: false };
          }
        }
      } catch {
        // noop
      }
    }
    return this.config;
  }

  clearConfig() {
    localStorage.removeItem('paraclinic-webhook-config');
    this.config = {
      url: '',
      enabled: false,
      isVerified: false,
    };
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.url) {
      throw new Error('Configura la URL del webhook de paraclínicos');
    }

    const secureUrl = ensureSecureWebhookUrl(this.config.url);

    try {
      const response = await fetch(secureUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true, type: 'paraclinic', timestamp: new Date().toISOString() }),
      });

      const ok = response.ok;
      const updates: Partial<ParaclinicWebhookConfig> = {
        isVerified: ok,
        lastTestedAt: new Date().toISOString(),
      };

      if (ok && !this.config.enabled) {
        updates.enabled = true;
      }

      this.setConfig(updates);
      return ok;
    } catch (error) {
      this.setConfig({
        isVerified: false,
        lastTestedAt: new Date().toISOString(),
      });
      return false;
    }
  }

  async sendImages(
    files: File[] | Blob[],
    metadata?: Record<string, unknown>,
    options?: { skipEnabledCheck?: boolean }
  ): Promise<ParaclinicAnalysisResult> {
    if (!this.config.url) {
      throw new Error('Configura la URL del webhook de paraclínicos');
    }

    if (!files?.length) {
      throw new Error('No se seleccionaron imágenes para enviar');
    }

    if (!this.config.enabled && !options?.skipEnabledCheck) {
      throw new Error('El envío automático de paraclínicos está deshabilitado');
    }

    const secureUrl = ensureSecureWebhookUrl(this.config.url);

    const formData = new FormData();
    const timestamp = new Date().toISOString();

    files.forEach((file, index) => {
      const filename = file instanceof File ? file.name : `paraclinico_${index + 1}.jpg`;
      formData.append('images', file, filename);
    });

    formData.append('timestamp', timestamp);
    formData.append('type', 'paraclinic_document');

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(secureUrl.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `HTTP error! status: ${response.status}`);
    }

    try {
      const data = await response.json();
      const extractText = (payload: any): string => {
        if (!payload) return '';
        if (Array.isArray(payload)) {
          for (const entry of payload) {
            const direct = extractText(entry);
            if (direct) return direct;
          }
          return '';
        }

        if (typeof payload === 'string') {
          return payload;
        }

        if (payload?.text && typeof payload.text === 'string') {
          return payload.text;
        }

        if (payload?.content?.parts && Array.isArray(payload.content.parts)) {
          const combined = payload.content.parts
            .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
            .filter(Boolean)
            .join('\n')
            .trim();
          if (combined) return combined;
        }

        if (payload?.summary && typeof payload.summary === 'string') {
          return payload.summary;
        }

        return '';
      };

      const summaryText = extractText(data);
      const derivedId = !Array.isArray(data) && typeof data === 'object' && data?.id
        ? data.id
        : Array.isArray(data) && data[0]?.id
        ? data[0].id
        : `paraclinic_${Date.now().toString(36)}`;

      const analysis: ParaclinicAnalysisResult = {
        id: derivedId,
        summary: summaryText || 'Análisis recibido correctamente.',
        sections: Array.isArray((data as any)?.sections) ? (data as any).sections : undefined,
        raw: data,
      };
      return analysis;
    } catch (error) {
      return {
        id: `paraclinic_${Date.now().toString(36)}`,
        summary: 'Imágenes enviadas correctamente. El webhook no devolvió un resumen estructurado.',
      };
    }
  }
}

export const paraclinicService = new ParaclinicService();
