import { AssemblyAI, type PiiPolicy, type SubstitutionPolicy } from 'assemblyai';

export interface TranscriptionConfig {
  apiKey: string;
  enabled: boolean;
  isVerified: boolean;
  lastTestedAt?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  id: string;
  status: string;
  error?: string;
}

const DEFAULT_PII_POLICIES: PiiPolicy[] = [
  'person_name',
  'organization',
  'occupation',
  // Cedula o identificadores suelen detectarse como secuencias numéricas o credenciales
  'number_sequence',
  'drivers_license',
  'passport_number',
];

const DEFAULT_PII_SUBSTITUTION: SubstitutionPolicy = 'hash';

export class TranscriptionService {
  private config: TranscriptionConfig = {
    apiKey: 'aec616f9024f430eaea9d9a687d62e89',
    enabled: false,
    isVerified: false,
  };

  setConfig(config: Partial<TranscriptionConfig>) {
    this.config = { ...this.config, ...config };

    // Store config but exclude API key for security
    const configToStore = {
      enabled: this.config.enabled,
      isVerified: this.config.isVerified,
      lastTestedAt: this.config.lastTestedAt,
    };

    localStorage.setItem('transcription-config', JSON.stringify(configToStore));

    // Store API key separately (could be enhanced with encryption)
    if (config.apiKey) {
      localStorage.setItem('assemblyai-api-key', config.apiKey);
    }
  }

  getConfig(): TranscriptionConfig {
    const stored = localStorage.getItem('transcription-config');
    const storedApiKey = localStorage.getItem('assemblyai-api-key');

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<TranscriptionConfig>;
        this.config = {
          ...this.config,
          ...parsed,
          apiKey: storedApiKey || '',
          isVerified: Boolean(parsed?.isVerified),
          lastTestedAt: parsed?.lastTestedAt,
        };
      } catch (error) {
        // Ignore invalid config
      }
    } else if (storedApiKey) {
      this.config.apiKey = storedApiKey;
    }

    return this.config;
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('API Key de AssemblyAI no configurada');
    }

    try {
      const client = new AssemblyAI({
        apiKey: this.config.apiKey,
      });

      // Use the official SDK to perform a lightweight request that validates the API key
      await client.transcripts.list({ limit: 1 });

      const updates: Partial<TranscriptionConfig> = {
        isVerified: true,
        lastTestedAt: new Date().toISOString(),
      };

      // Enable transcription automatically on first successful verification
      if (!this.config.enabled) {
        updates.enabled = true;
      }

      this.setConfig(updates);

      return true;
    } catch (error) {
      this.setConfig({
        isVerified: false,
        lastTestedAt: new Date().toISOString(),
      });

      if (error instanceof Error) {
        const normalizedMessage = error.message.toLowerCase();
        if (normalizedMessage.includes('401') || normalizedMessage.includes('unauthorized')) {
          throw new Error('API key inválida o sin permisos en AssemblyAI');
        }
        throw new Error(`No se pudo verificar la conexión con AssemblyAI: ${error.message}`);
      }

      throw new Error('No se pudo verificar la conexión con AssemblyAI por un error desconocido');
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('API Key de AssemblyAI no configurada');
    }

    if (!this.config.isVerified) {
      throw new Error('Primero debes verificar tu conexión con AssemblyAI');
    }

    if (!this.config.enabled) {
      throw new Error('La transcripción está deshabilitada. Actívala en la sección Configuración → AssemblyAI');
    }

    try {
      const client = new AssemblyAI({
        apiKey: this.config.apiKey,
      });

      // Convert Blob to File-like object
      const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

      // Configure transcription for Spanish
      const params = {
        audio: audioFile,
        language_code: 'es' as const,
        punctuate: true,
        format_text: true,
        redact_pii: true,
        redact_pii_policies: DEFAULT_PII_POLICIES,
        redact_pii_sub: DEFAULT_PII_SUBSTITUTION,
      };

      // Upload and transcribe
      const transcript = await client.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Error en la transcripción');
      }

      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        id: transcript.id,
        status: transcript.status,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Error de transcripción: ${error.message}`
          : 'Error desconocido en la transcripción'
      );
    }
  }

  async transcribeAudioFile(file: File): Promise<TranscriptionResult> {
    if (!this.config.apiKey) {
      throw new Error('API Key de AssemblyAI no configurada');
    }

    if (!this.config.isVerified) {
      throw new Error('Primero debes verificar tu conexión con AssemblyAI');
    }

    if (!this.config.enabled) {
      throw new Error('La transcripción está deshabilitada. Actívala en la sección Configuración → AssemblyAI');
    }

    try {
      const client = new AssemblyAI({
        apiKey: this.config.apiKey,
      });

      // Configure transcription for Spanish
      const params = {
        audio: file,
        language_code: 'es' as const,
        punctuate: true,
        format_text: true,
        redact_pii: true,
        redact_pii_policies: DEFAULT_PII_POLICIES,
        redact_pii_sub: DEFAULT_PII_SUBSTITUTION,
      };

      // Upload and transcribe
      const transcript = await client.transcripts.transcribe(params);

      if (transcript.status === 'error') {
        throw new Error(transcript.error || 'Error en la transcripción');
      }

      return {
        text: transcript.text || '',
        confidence: transcript.confidence || 0,
        id: transcript.id,
        status: transcript.status,
      };
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Error de transcripción: ${error.message}`
          : 'Error desconocido en la transcripción'
      );
    }
  }

  clearConfig() {
    localStorage.removeItem('transcription-config');
    localStorage.removeItem('assemblyai-api-key');
    this.config = {
      apiKey: '',
      enabled: false,
      isVerified: false,
    };
  }
}

export const transcriptionService = new TranscriptionService();
