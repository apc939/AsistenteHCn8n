import { AssemblyAI, type PiiPolicy, type SubstitutionPolicy } from 'assemblyai';

const DEFAULT_ASSEMBLY_API_KEY = 'b99194c271594e8680dcdcd6102585f7';

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
    apiKey: DEFAULT_ASSEMBLY_API_KEY,
    enabled: false,
    isVerified: false,
  };

  setConfig(config: Partial<TranscriptionConfig>) {
    this.config = { ...this.config, ...config };

    const sanitizedConfig: Partial<TranscriptionConfig> = {
      enabled: config.enabled ?? this.config.enabled,
      isVerified: config.isVerified ?? this.config.isVerified,
      lastTestedAt: config.lastTestedAt ?? this.config.lastTestedAt,
    };

    this.config = { ...this.config, ...sanitizedConfig, apiKey: DEFAULT_ASSEMBLY_API_KEY };

    const configToStore = {
      enabled: this.config.enabled,
      isVerified: this.config.isVerified,
      lastTestedAt: this.config.lastTestedAt,
    };

    localStorage.setItem('transcription-config', JSON.stringify(configToStore));

    // Ensure legacy storage slots stay in sync with backend-managed credentials
    localStorage.setItem('assemblyai-api-key', DEFAULT_ASSEMBLY_API_KEY);
  }

  getConfig(): TranscriptionConfig {
    const stored = localStorage.getItem('transcription-config');

    if (stored) {
      try {
        const { apiKey: _ignoredApiKey, ...rest } = JSON.parse(stored) as Partial<TranscriptionConfig>;
        this.config = {
          ...this.config,
          ...rest,
          isVerified: Boolean(rest?.isVerified),
          lastTestedAt: rest?.lastTestedAt,
        };
      } catch (error) {
        // Ignore invalid config
      }
    }

    this.config.apiKey = DEFAULT_ASSEMBLY_API_KEY;
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
