import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Stethoscope, Download, User, CreditCard, MessageSquare } from 'lucide-react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useNotes } from './hooks/useNotes';
import { useTranscription } from './hooks/useTranscription';
import { useParaclinics } from './hooks/useParaclinics';
import { webhookService, WebhookConfig } from './services/webhookService';
import { RecordingControls } from './components/RecordingControls';
import { Timer } from './components/Timer';
import { StatusMessage } from './components/StatusMessage';
import { WebhookSettings } from './components/WebhookSettings';
import { NotesSettings } from './components/NotesSettings';
import { NotesPanel } from './components/NotesPanel';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { TranscriptionSettings } from './components/TranscriptionSettings';
import { ParaclinicPanel } from './components/ParaclinicPanel';
import { ParaclinicSettings } from './components/ParaclinicSettings';

const MAX_AUDIO_DURATION_SECONDS = 60 * 60; // 1 hour limit
const MAX_AUDIO_FILE_SIZE = 120 * 1024 * 1024; // ~120 MB safety limit

const ACCEPTED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/x-caf',
  'application/octet-stream',
  'video/mp4',
  'video/quicktime'
]);

const ACCEPTED_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.webm', '.mp4', '.m4p', '.caf'];

const hasAllowedAudioExtension = (fileName: string) =>
  ACCEPTED_AUDIO_EXTENSIONS.some(extension => fileName.toLowerCase().endsWith(extension));

const formatSeconds = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.round(totalSeconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }

  const megabytes = bytes / (1024 * 1024);
  if (megabytes < 0.1) {
    const kilobytes = bytes / 1024;
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${megabytes.toFixed(megabytes < 10 ? 2 : 1)} MB`;
};

const getAudioDurationFromFile = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      audio.src = '';
      URL.revokeObjectURL(objectUrl);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        resolve(audio.duration);
      } else {
        reject(new Error('No se pudo calcular la duración del audio'));
      }
      cleanup();
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error('Formato de audio no soportado'));
    };

    audio.src = objectUrl;
  });

function App() {
  const {
    state,
    startRecording,
    pauseRecording,
    stopRecording,
    resetRecording,
    recordingTime,
    audioBlob,
    error: recordingError,
  } = useAudioRecorder();

  const {
    notes,
    noteTypes,
    error: notesError,
    addNote,
    updateNoteContent,
    updateNoteType,
    removeNote,
    clearNotes,
    addNoteType,
    updateNoteTypeLabel,
    removeNoteType,
    resetNoteTypes,
    getNotesForSubmission
  } = useNotes();

  const {
    config: transcriptionConfig,
    isTranscribing,
    transcriptionResult,
    error: transcriptionError,
    setConfig: setTranscriptionConfig,
    testConnection: testTranscriptionConnection,
    transcribeBlob,
    transcribeFile,
    clearResult: clearTranscriptionResult,
    clearError: clearTranscriptionError,
  } = useTranscription();

  const {
    config: paraclinicConfig,
    setConfig: setParaclinicConfig,
    testConnection: testParaclinicConnection,
    isUploading: isUploadingParaclinic,
    analysis: paraclinicAnalysis,
    error: paraclinicError,
    logs: paraclinicLogs,
    uploadImages: uploadParaclinicImages,
    clearAnalysis: clearParaclinicAnalysis,
    clearError: clearParaclinicError,
    clearLogs: clearParaclinicLogs,
  } = useParaclinics();

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: '',
    enabled: false,
    isVerified: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  } | null>(null);
  const [showGlobalUploadStatus, setShowGlobalUploadStatus] = useState(false);
  
  const [sendingLogs, setSendingLogs] = useState<Array<{
    id: string;
    timestamp: string;
    duration: number;
    status: 'success' | 'error';
    message: string;
  }>>([]);

  const [lastTranscriptionOrigin, setLastTranscriptionOrigin] = useState<'recorded' | 'uploaded' | null>(null);

  const [patientInfo, setPatientInfo] = useState({
    name: '',
    cedula: ''
  });

  const isConfigReady =
    transcriptionConfig.isVerified &&
    webhookConfig.isVerified &&
    paraclinicConfig.isVerified;

  const [activeTab, setActiveTab] = useState<'workflow' | 'config'>(() =>
    isConfigReady ? 'workflow' : 'config'
  );

  useEffect(() => {
    if (!isConfigReady && activeTab !== 'config') {
      setActiveTab('config');
    }
  }, [isConfigReady, activeTab]);

  const configurationChecklist = [
    {
      id: 'assemblyai',
      title: 'AssemblyAI listo',
      description: 'Transcripción automática verificada y habilitada.',
      completed: transcriptionConfig.isVerified && transcriptionConfig.enabled,
    },
    {
      id: 'webhook',
      title: 'Webhook n8n listo',
      description: 'Envío automático de transcripciones activado.',
      completed: webhookConfig.isVerified && webhookConfig.enabled,
    },
    {
      id: 'paraclinics',
      title: 'Paraclínicos configurados',
      description: 'Webhook de imágenes verificado y habilitado.',
      completed: paraclinicConfig.isVerified && paraclinicConfig.enabled,
    },
  ];

  const [showPatientForm, setShowPatientForm] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{
    file: File;
    duration: number | null;
  } | null>(null);
  const [uploadedAudioMessage, setUploadedAudioMessage] = useState<{
    type: 'info' | 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [showRecordingPrivacyWarning, setShowRecordingPrivacyWarning] = useState(false);
  const [pendingRecordingAction, setPendingRecordingAction] = useState<'start' | null>(null);
  const generateEncounterId = () => `encounter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const [encounterId, setEncounterId] = useState<string>(() => generateEncounterId());

  const isWebhookConfigured = Boolean(webhookConfig.url?.trim() && webhookConfig.isVerified);

  useEffect(() => {
    const config = webhookService.getConfig();
    setWebhookConfig(config);
    
    // POR SEGURIDAD MÉDICA: Limpiar cualquier dato médico existente
    localStorage.removeItem('n8n-sending-logs');
    
    // Limpiar datos al cerrar ventana/pestaña
    const handleBeforeUnload = () => {
      localStorage.removeItem('n8n-sending-logs');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStorage.removeItem('n8n-sending-logs');
    };
  }, []);

  useEffect(() => {
    if (!showPatientForm && notes.length === 0) {
      addNote();
    }
  }, [showPatientForm, notes.length, addNote]);

  const addLog = (status: 'success' | 'error', duration: number, message: string) => {
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      duration,
      status,
      message
    };

    setSendingLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs].slice(0, 10); // Mantener solo los últimos 10
      // POR SEGURIDAD MÉDICA: NO guardar logs en localStorage
      // Solo mantener en memoria durante la sesión
      return updatedLogs;
    });
  };

  async function sendTranscriptionToWebhook(
    transcript: string,
    options: {
      durationSeconds?: number;
      origin?: 'recorded' | 'uploaded';
      allowDisabledWebhook?: boolean;
    } = {}
  ): Promise<void> {
    if (!transcript?.trim()) {
      setUploadStatus({
        message: 'No hay transcripción disponible para enviar',
        type: 'warning'
      });
      return;
    }

    if (!patientInfo.name.trim() || !patientInfo.cedula.trim()) {
      setUploadStatus({
        message: 'Completa el alias y el identificador interno antes de enviar audio o notas.',
        type: 'warning'
      });
      return;
    }

    if (!webhookConfig.url) {
      setUploadStatus({
        message: 'Configure la URL del webhook de n8n antes de enviar audio',
        type: 'warning'
      });
      return;
    }

    const allowDisabledWebhook = options.allowDisabledWebhook ?? false;

    if (!webhookConfig.enabled && !allowDisabledWebhook) {
      setUploadStatus({
        message: 'Active el envío automático para habilitar la comunicación con n8n',
        type: 'warning'
      });
      return;
    }

    const baseLabel = options.origin === 'uploaded' ? 'transcripción de audio cargado' : 'transcripción de grabación';
    const useGlobalStatus = options.origin !== 'uploaded';

    setIsUploading(true);
    setShowGlobalUploadStatus(useGlobalStatus);

    if (useGlobalStatus) {
      setUploadStatus({ message: `Enviando ${baseLabel} al sistema n8n...`, type: 'info' });
    } else {
      setUploadStatus(null);
      setUploadedAudioMessage({ type: 'info', text: 'Enviando transcripción a n8n...' });
    }

    const uploadStartTime = Date.now();
    const safeDuration = Number.isFinite(options.durationSeconds)
      ? Math.max(0, Math.round(options.durationSeconds as number))
      : Math.max(0, Math.round(recordingTime));
    const notesForSubmission = getNotesForSubmission();

    const metadata = {
      duration: safeDuration,
      encounter_id: encounterId,
      capture_method: options.origin ?? 'recorded',
      ...(notesForSubmission.length > 0 && { notes: notesForSubmission })
    };

    try {
      await webhookService.sendTranscription(transcript, metadata, {
        skipEnabledCheck: allowDisabledWebhook
      });

      const uploadDuration = Date.now() - uploadStartTime;
      const hasNotes = notesForSubmission.length > 0;
      const successMessage = `${options.origin === 'uploaded' ? 'Transcripción de audio cargado' : 'Transcripción de grabación'}${hasNotes ? ' y notas' : ''} enviada exitosamente al sistema n8n`;

      if (useGlobalStatus) {
        setUploadStatus({
          message: successMessage,
          type: 'success'
        });
      } else {
        setUploadedAudioMessage({
          type: 'success',
          text: successMessage
        });
      }

      const notesSummary = hasNotes
        ? ` con ${notesForSubmission.length} nota${notesForSubmission.length === 1 ? '' : 's'}`
        : '';
      const logLabel = options.origin === 'uploaded' ? 'Transcripción de audio cargado' : 'Transcripción de grabación';
      const logMessage = `Encuentro ${encounterId} - ${logLabel.toLowerCase()} de ${formatSeconds(safeDuration)}${notesSummary} enviada exitosamente (${uploadDuration}ms)`;

      addLog('success', safeDuration, logMessage);

      if (options.origin === 'recorded') {
        setTimeout(() => {
          resetOnlyRecording();
        }, 2000);
      } else {
        setUploadedAudio(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      if (useGlobalStatus) {
        setUploadStatus({
          message: `Error al enviar la transcripción: ${errorMessage}`,
          type: 'error'
        });
      } else {
        setUploadedAudioMessage({
          type: 'error',
          text: `Error al enviar la transcripción: ${errorMessage}`
        });
      }

      addLog(
        'error',
        safeDuration,
        `Encuentro ${encounterId} - error al enviar transcripción: ${errorMessage}`
      );
    } finally {
      setIsUploading(false);
      setShowGlobalUploadStatus(false);
    }
  }

  const handleTranscribeAndSend = async (source: 'recorded' | 'uploaded') => {
    try {
      let transcript;
      let duration;

      if (source === 'recorded') {
        if (!audioBlob) return;
        setLastTranscriptionOrigin('recorded');
        transcript = await transcribeBlob(audioBlob);
        duration = recordingTime;
      } else {
        if (!uploadedAudio) return;
        setLastTranscriptionOrigin('uploaded');
        transcript = await transcribeFile(uploadedAudio.file);
        duration = uploadedAudio.duration ?? undefined;
      }

      await sendTranscriptionToWebhook(transcript.text, {
        durationSeconds: duration,
        origin: source,
        allowDisabledWebhook: true
      });
      setLastTranscriptionOrigin(null);
    } catch (error) {
      console.error('Error in transcribe and send:', error);
    }
  };

  const handleRecordedManualUpload = async () => {
    if (!audioBlob) return;
    const proceed = window.confirm('¿Desea transcribir y enviar la grabación con las notas a n8n?');
    if (!proceed) {
      return;
    }
    await handleTranscribeAndSend('recorded');
  };

  const handleUploadedAudioSend = async () => {
    if (!uploadedAudio) return;
    const proceed = window.confirm('¿Desea transcribir y enviar el audio cargado con las notas a n8n?');
    if (!proceed) {
      return;
    }
    await handleTranscribeAndSend('uploaded');
  };

  const handleManualTranscribe = async (source: 'recorded' | 'uploaded') => {
    try {
      if (source === 'recorded' && audioBlob) {
        setLastTranscriptionOrigin('recorded');
        await transcribeBlob(audioBlob);
      } else if (source === 'uploaded' && uploadedAudio) {
        setLastTranscriptionOrigin('uploaded');
        await transcribeFile(uploadedAudio.file);
      }
    } catch (error) {
      console.error('Error in manual transcribe:', error);
    }
  };

  const handleSendCurrentTranscription = async () => {
    if (!transcriptionResult?.text?.trim()) {
      setUploadStatus({ message: 'No hay transcripción lista para enviar.', type: 'warning' });
      return;
    }

    const origin = lastTranscriptionOrigin ?? (uploadedAudio ? 'uploaded' : 'recorded');

    await sendTranscriptionToWebhook(transcriptionResult.text, {
      origin,
      allowDisabledWebhook: true,
    });

    setLastTranscriptionOrigin(null);
  };

  const handleClearTranscription = () => {
    clearTranscriptionResult();
    setLastTranscriptionOrigin(null);
  };

  const handleParaclinicUpload = async (files: File[]) => {
    if (!patientInfo.name.trim() || !patientInfo.cedula.trim()) {
      setUploadStatus({
        message: 'Completa alias e identificador interno antes de subir paraclínicos.',
        type: 'warning',
      });
      return;
    }

    await uploadParaclinicImages(files, {
      encounterId,
      patientAlias: patientInfo.name.trim(),
      patientInternalId: patientInfo.cedula.trim(),
    });
  };

  const handleAudioFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadedAudioMessage(null);

    if (!patientInfo.name.trim() || !patientInfo.cedula.trim()) {
      setUploadedAudio(null);
      setUploadedAudioMessage({
        type: 'warning',
        text: 'Ingresa un alias y un identificador interno antes de cargar un audio.'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const mimeType = file.type?.toLowerCase() ?? '';
    const hasValidMime = mimeType.startsWith('audio/') || ACCEPTED_AUDIO_MIME_TYPES.has(mimeType);
    const hasValidExtension = hasAllowedAudioExtension(file.name);

    if (!hasValidMime && !hasValidExtension) {
      setUploadedAudioMessage({
        type: 'error',
        text: 'Formato de archivo no válido. Seleccione un archivo de audio.'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_AUDIO_FILE_SIZE) {
      setUploadedAudioMessage({
        type: 'error',
        text: 'El archivo supera el tamaño máximo permitido (~120 MB).'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsProcessingFile(true);

    try {
      const duration = await getAudioDurationFromFile(file);

      if (duration > MAX_AUDIO_DURATION_SECONDS) {
        setUploadedAudio(null);
        setUploadedAudioMessage({
          type: 'error',
          text: 'El audio supera la duración máxima permitida de 60 minutos.'
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setUploadedAudio({ file, duration });
      setUploadedAudioMessage({
        type: 'success',
        text: `Audio listo: ${file.name} (${formatSeconds(duration)} • ${formatFileSize(file.size)})`
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      setUploadedAudio(null);
      setUploadedAudioMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudo procesar el audio seleccionado.'
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsProcessingFile(false);
    }
  };

  useEffect(() => {
    if (state === 'stopped' && audioBlob && webhookConfig.enabled && transcriptionConfig.enabled) {
      void handleTranscribeAndSend('recorded');
    }
  }, [state, audioBlob, webhookConfig.enabled, transcriptionConfig.enabled, recordingTime]);

  const clearStatus = () => {
    setUploadStatus(null);
  };

  const downloadAudio = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    
    // Crear nombre de archivo anónimo para la descarga local
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `consulta_${encounterId}_${timestamp}.webm`;
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startRecordingWithInfo = () => {
    if (!patientInfo.name.trim() || !patientInfo.cedula.trim()) {
      setUploadStatus({
        message: 'Completa el alias y el identificador interno antes de iniciar la grabación.',
        type: 'warning'
      });
      return;
    }
    setShowPatientForm(false);
    setPendingRecordingAction('start');
    setShowRecordingPrivacyWarning(true);
  };

  const openControlsForUpload = () => {
    if (!patientInfo.name.trim() || !patientInfo.cedula.trim()) {
      setUploadStatus({
        message: 'Completa el alias y el identificador interno antes de continuar.',
        type: 'warning'
      });
      return;
    }

    setShowPatientForm(false);
  };

  const resetToPatientForm = () => {
    setShowPatientForm(true);
    setPatientInfo({ name: '', cedula: '' });
    resetRecording();
    setUploadStatus(null);
    setSendingLogs([]);
    clearNotes();
    setUploadedAudio(null);
    setUploadedAudioMessage(null);
    setShowRecordingPrivacyWarning(false);
    setPendingRecordingAction(null);
    setEncounterId(generateEncounterId());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetOnlyRecording = () => {
    resetRecording();
    setUploadStatus(null);
    setShowRecordingPrivacyWarning(false);
    setPendingRecordingAction(null);
    // NO cambia showPatientForm ni patientInfo
  };

  const requestStartRecording = () => {
    setPendingRecordingAction('start');
    setShowRecordingPrivacyWarning(true);
  };

  const confirmRecordingPrivacyWarning = async () => {
    const action = pendingRecordingAction;
    setShowRecordingPrivacyWarning(false);
    setPendingRecordingAction(null);

    if (action === 'start') {
      try {
        await startRecording();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo iniciar la grabación';
        setUploadStatus({ message, type: 'error' });
      }
    }
  };

  const cancelRecordingPrivacyWarning = () => {
    setShowRecordingPrivacyWarning(false);
    setPendingRecordingAction(null);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-teal-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Stethoscope className="h-12 w-12 text-blue-600 mr-4" />
              <h1 className="text-4xl font-bold text-gray-900">
                Asistente HC
              </h1>
            </div>
            <p className="text-xl text-gray-600">
              Grabación Inteligente de Consultas Médicas
            </p>
            <p className="text-gray-500 mt-2">
              Sistema profesional con integración automática a n8n
            </p>
            <p className="mt-3 text-sm font-semibold text-red-600">
              No pronuncies ni incluyas datos personales. Usa alias e identificadores internos en todo momento.
            </p>
          </div>
          {/* Navigation */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-full shadow-lg overflow-hidden">
              <button
                onClick={() => setActiveTab('config')}
                className={`px-6 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                  activeTab === 'config'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-500 hover:text-blue-500'
                }`}
              >
                Configuraciones
              </button>
              <button
                onClick={() => isConfigReady && setActiveTab('workflow')}
                disabled={!isConfigReady}
                className={`px-6 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                  activeTab === 'workflow'
                    ? 'bg-white text-blue-600 shadow'
                    : isConfigReady
                      ? 'text-gray-500 hover:text-blue-500'
                      : 'text-gray-300'
                }`}
              >
                Flujo clínico
              </button>
            </div>
          </div>

          {activeTab === 'config' ? (
            <div className="space-y-10">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-semibold text-gray-800">Checklist de configuración</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Completa estos pasos antes de comenzar una consulta. Las secciones verificadas muestran un estado verde.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {configurationChecklist.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border px-4 py-5 transition-colors ${
                        item.completed
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <p className={`text-sm font-semibold ${
                        item.completed ? 'text-green-800' : 'text-gray-700'
                      }`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    </div>
                  ))}
                </div>
                {!isConfigReady && (
                  <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    Configura y verifica todas las secciones para desbloquear el flujo clínico.
                  </div>
                )}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <TranscriptionSettings
                  config={transcriptionConfig}
                  onConfigChange={setTranscriptionConfig}
                  onTestConnection={testTranscriptionConnection}
                />
                <WebhookSettings onConfigChange={setWebhookConfig} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ParaclinicSettings
                  config={paraclinicConfig}
                  onConfigChange={setParaclinicConfig}
                  onTestConnection={testParaclinicConnection}
                />
                <NotesSettings
                  noteTypes={noteTypes}
                  error={notesError}
                  onAddType={addNoteType}
                  onUpdateType={updateNoteTypeLabel}
                  onRemoveType={removeNoteType}
                  onResetTypes={resetNoteTypes}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {!isConfigReady ? (
                <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
                  <h2 className="text-2xl font-semibold text-gray-800">Configura el sistema antes de continuar</h2>
                  <p className="text-sm text-gray-600 mt-3">
                    Completa la pestaña de configuraciones para habilitar grabaciones, transcripciones y paraclínicos.
                  </p>
                  <button
                    onClick={() => setActiveTab('config')}
                    className="mt-6 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    Ir a configuraciones
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                      {showPatientForm ? (
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                            Configuración de la Consulta
                          </h2>

                          <div className="space-y-4">
                            <div>
                              <label htmlFor="patient-name" className="block text-sm font-medium text-gray-700 mb-2">
                                <User className="w-4 h-4 inline mr-2" />
                                Alias del paciente (no usar nombre real)
                              </label>
                              <input
                                id="patient-name"
                                type="text"
                                value={patientInfo.name}
                                onChange={(e) => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej. Paciente-A"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Usa un alias o folio interno para mantener la sesión anonimizada.
                              </p>
                            </div>

                            <div>
                              <label htmlFor="patient-cedula" className="block text-sm font-medium text-gray-700 mb-2">
                                <CreditCard className="w-4 h-4 inline mr-2" />
                                Identificador interno (no usar cédula real)
                              </label>
                              <input
                                id="patient-cedula"
                                type="text"
                                value={patientInfo.cedula}
                                onChange={(e) => setPatientInfo(prev => ({ ...prev, cedula: e.target.value }))}
                                placeholder="Ej. caso-12345"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Puedes usar un código generado desde tu sistema clínico.
                              </p>
                            </div>

                            <button
                              onClick={startRecordingWithInfo}
                              disabled={!patientInfo.name.trim() || !patientInfo.cedula.trim()}
                              className="w-full px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg mt-6"
                            >
                              Iniciar Grabación de Consulta
                            </button>

                            <button
                              onClick={openControlsForUpload}
                              disabled={!patientInfo.name.trim() || !patientInfo.cedula.trim()}
                              className="w-full px-6 py-3 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 mt-3"
                            >
                              Usar audio existente
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                          <div className="text-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800">
                              Control de Grabación
                            </h2>
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <User className="w-4 h-4 inline mr-1" />
                                <strong>{encounterId}</strong>
                              </p>
                              {(patientInfo.name.trim() || patientInfo.cedula.trim()) && (
                                <p className="text-xs text-blue-800/80 mt-1">
                                  Alias registrado: {patientInfo.name.trim() || 'N/D'}
                                  {patientInfo.cedula.trim() && ` • ID interno: ${patientInfo.cedula.trim()}`}
                                </p>
                              )}
                              {state === 'idle' && recordingTime === 0 && (
                                <p className="text-xs text-gray-600 mt-1">
                                  ✨ Listo para grabar o subir audio anonimizado para este encuentro
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-center mb-8">
                            <Timer seconds={recordingTime} isRecording={state === 'recording'} />
                          </div>

                          <div className="text-center mb-6">
                            <RecordingControls
                              state={state}
                              onStartRecording={requestStartRecording}
                              onPauseRecording={pauseRecording}
                              onStopRecording={() => {
                                if (state === 'recording' || state === 'paused') {
                                  const confirmStop = window.confirm(
                                    '¿Desea detener la grabación? El audio y las notas se enviarán automáticamente a n8n.'
                                  );
                                  if (!confirmStop) {
                                    return;
                                  }
                                }
                                stopRecording();
                              }}
                              disabled={isUploading || showRecordingPrivacyWarning}
                            />
                          </div>

                          <div className="flex justify-center flex-wrap gap-2">
                            {state === 'stopped' && audioBlob && (
                              <button
                                onClick={() => handleManualTranscribe('recorded')}
                                disabled={isTranscribing || !transcriptionConfig.isVerified}
                                className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Transcribir</span>
                              </button>
                            )}

                            {state === 'stopped' && (
                              <button
                                onClick={() => resetOnlyRecording()}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                              >
                                Nueva Grabación
                              </button>
                            )}

                            {state === 'stopped' && audioBlob && (
                              <button
                                onClick={downloadAudio}
                                className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
                              >
                                <Download className="w-4 h-4" />
                                <span>Descargar</span>
                              </button>
                            )}

                            <button
                              onClick={resetToPatientForm}
                              className="px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                            >
                              Nueva Consulta
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        {recordingError && (
                          <StatusMessage
                            message={recordingError}
                            type="error"
                          />
                        )}

                        {transcriptionError && (
                          <StatusMessage
                            message={transcriptionError}
                            type="error"
                            onClose={clearTranscriptionError}
                          />
                        )}

                        {uploadStatus && (
                          <StatusMessage
                            message={uploadStatus.message}
                            type={uploadStatus.type}
                            onClose={clearStatus}
                          />
                        )}

                        {showRecordingPrivacyWarning && (
                          <div className="border border-yellow-300 bg-yellow-50 text-yellow-800 px-6 py-5 rounded-xl shadow-sm">
                            <p className="font-semibold text-sm">
                              Antes de iniciar, recuerde no mencionar datos personales durante esta grabación y firmar consentimiento informado.
                            </p>
                            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
                              <button
                                onClick={() => {
                                  void confirmRecordingPrivacyWarning();
                                }}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition-colors"
                              >
                                Entendido, iniciar grabación
                              </button>
                              <button
                                onClick={cancelRecordingPrivacyWarning}
                                className="px-4 py-2 bg-white border border-yellow-300 text-yellow-700 hover:bg-yellow-100 rounded-lg text-sm font-medium transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {isUploading && showGlobalUploadStatus && (
                          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-xl">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                              <span className="font-medium">Enviando transcripción a n8n...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {state === 'stopped' && audioBlob && !webhookConfig.enabled && (
                        <button
                          onClick={handleRecordedManualUpload}
                          disabled={isUploading || isTranscribing || !transcriptionConfig.isVerified}
                          className="w-full px-6 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                        >
                          {isUploading ? 'Enviando...' : isTranscribing ? 'Transcribiendo...' : 'Transcribir y enviar a n8n'}
                        </button>
                      )}

                      {!showPatientForm && (
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-semibold text-gray-800">Subir audio existente</h3>
                              <p className="text-sm text-gray-500">Formatos aceptados: WebM, MP3, WAV, M4A, OGG • Máximo 60 minutos</p>
                            </div>
                            {isProcessingFile && (
                              <div className="flex items-center text-sm text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                Analizando audio...
                              </div>
                            )}
                          </div>

                          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            Verifique que el audio no contenga nombres, números de identificación u otros datos personales antes de subirlo.
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="audio/*,video/mp4,video/quicktime,application/octet-stream,.mp3,.m4a,.wav,.aac,.ogg,.webm,.caf"
                              onChange={handleAudioFileSelect}
                              disabled={isProcessingFile || isUploading}
                              className="block w-full md:w-auto text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                            />
                            <p className="text-xs text-gray-400">El archivo debe pesar menos de {formatFileSize(MAX_AUDIO_FILE_SIZE)}.</p>
                          </div>

                          {uploadedAudioMessage && (
                            <div
                              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                                uploadedAudioMessage.type === 'success'
                                  ? 'border-green-200 bg-green-50 text-green-700'
                                  : uploadedAudioMessage.type === 'error'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : uploadedAudioMessage.type === 'warning'
                                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                              }`}
                            >
                              {uploadedAudioMessage.text}
                            </div>
                          )}

                          {uploadedAudio && (
                            <div className="mt-6 border border-dashed border-blue-200 bg-blue-50 rounded-xl p-4">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-blue-800">{uploadedAudio.file.name}</p>
                                  <p className="text-xs text-blue-700 mt-1">
                                    Duración estimada: {uploadedAudio.duration ? formatSeconds(uploadedAudio.duration) : 'No disponible'} • Tamaño: {formatFileSize(uploadedAudio.file.size)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={() => handleManualTranscribe('uploaded')}
                                    disabled={isTranscribing || !transcriptionConfig.isVerified || isProcessingFile}
                                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isTranscribing ? 'Transcribiendo...' : 'Transcribir'}
                                  </button>
                                  <button
                                    onClick={handleUploadedAudioSend}
                                    disabled={isUploading || isTranscribing || !transcriptionConfig.isVerified || isProcessingFile}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isUploading ? 'Enviando...' : isTranscribing ? 'Transcribiendo...' : 'Transcribir y enviar a n8n'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setUploadedAudio(null);
                                      setUploadedAudioMessage(null);
                                      if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                      }
                                    }}
                                    className="px-4 py-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!showPatientForm && (
                        <TranscriptionPanel
                          transcriptionResult={transcriptionResult}
                          isTranscribing={isTranscribing}
                          error={transcriptionError}
                          onClearResult={handleClearTranscription}
                          onSendResult={handleSendCurrentTranscription}
                          isSending={isUploading}
                          encounterId={encounterId}
                        />
                      )}

                    </div>

                    <div className="space-y-6">
                      {!showPatientForm && (
                        <ParaclinicPanel
                          isUploading={isUploadingParaclinic}
                          analysis={paraclinicAnalysis}
                          error={paraclinicError}
                          onUpload={handleParaclinicUpload}
                          onClear={clearParaclinicAnalysis}
                          onClearError={clearParaclinicError}
                          patientAlias={patientInfo.name}
                          patientId={patientInfo.cedula}
                          encounterId={encounterId}
                        />
                      )}

                      {!showPatientForm && (
                        <NotesPanel
                          notes={notes}
                          noteTypes={noteTypes}
                          error={notesError}
                          onAddNote={addNote}
                          onUpdateNoteContent={updateNoteContent}
                          onUpdateNoteType={updateNoteType}
                          onRemoveNote={removeNote}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                      <h3 className="text-xl font-semibold text-gray-800 mb-6">Instrucciones de Uso</h3>
                      <div className="space-y-4 text-gray-600">
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</div>
                          <p>Configure la API key de AssemblyAI, el webhook n8n y defina los tipos de notas clínicas.</p>
                        </div>
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</div>
                          <p>Registra un alias y un identificador interno (sin datos reales) antes de grabar.</p>
                        </div>
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</div>
                          <p>Usa los controles de grabación para capturar la consulta y documenta notas clínicas en paralelo.</p>
                        </div>
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</div>
                          <p>El audio se transcribe automáticamente tras finalizar o puedes cargar un archivo anonimizado para análisis.</p>
                        </div>
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</div>
                          <p>Sube los paraclínicos en imagen para recibir el resumen estructurado y envía todo a n8n.</p>
                        </div>
                        <div className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</div>
                          <p>Usa "Nueva Grabación" para continuar en el mismo encuentro o "Nueva Consulta" para reiniciar.</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                      <h3 className="text-xl font-semibold text-gray-800 mb-6">Estado del Sistema</h3>
                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Estado actual:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            state === 'idle' && 'bg-gray-100 text-gray-800'
                          }${
                            state === 'recording' && 'bg-red-100 text-red-800'
                          }${
                            state === 'paused' && 'bg-yellow-100 text-yellow-800'
                          }${
                            state === 'stopped' && 'bg-green-100 text-green-800'
                          }`}>
                            {state === 'idle' && 'Listo para grabar'}
                            {state === 'recording' && 'Grabando...'}
                            {state === 'paused' && 'Pausado'}
                            {state === 'stopped' && 'Finalizado'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">AssemblyAI:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            transcriptionConfig.isVerified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transcriptionConfig.isVerified ? 'Configurado' : 'No configurado'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Webhook n8n:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            isWebhookConfigured
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {isWebhookConfigured ? 'Configurado' : 'No configurado'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Notas clínicas:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            notes.some((note) => note.content.trim().length > 0)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {notes.some((note) => note.content.trim().length > 0)
                              ? `${notes.length} nota${notes.length === 1 ? '' : 's'} registradas`
                              : 'Sin notas registradas'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Transcripción:</span>
                          <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                            transcriptionResult
                              ? 'bg-green-100 text-green-800'
                              : isTranscribing
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {transcriptionResult
                              ? 'Completada'
                              : isTranscribing
                              ? 'En proceso...'
                              : 'Pendiente'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Formato de audio:</span>
                          <span className="text-gray-600">WebM (Opus)</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Calidad:</span>
                          <span className="text-gray-600">44.1kHz, Stereo</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Duración actual:</span>
                          <span className="text-gray-600">
                            {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                            {(recordingTime % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sendingLogs.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">📋 Historial de Envíos n8n</h3>
                        <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                          🔒 Solo en memoria
                        </span>
                      </div>
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {sendingLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`flex items-center justify-between p-4 rounded-xl border-l-4 ${
                              log.status === 'success'
                                ? 'bg-green-50 border-green-400'
                                : 'bg-red-50 border-red-400'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <p className={`font-medium text-sm ${
                                  log.status === 'success' ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {log.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                              </div>
                            </div>
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                              log.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {log.status === 'success' ? '✅ ENVIADO' : '❌ ERROR'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 text-center space-x-4">
                        <button
                          onClick={() => {
                            setSendingLogs([]);
                          }}
                          className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                          Limpiar historial
                        </button>

                        <button
                          onClick={() => {
                            if (transcriptionResult?.text?.trim()) {
                              void sendTranscriptionToWebhook(transcriptionResult.text, {
                                allowDisabledWebhook: true,
                                origin: 'recorded',
                              });
                            } else {
                              setUploadStatus({
                                message: 'No hay transcripción reciente para reenviar',
                                type: 'warning',
                              });
                            }
                          }}
                          className="text-sm text-blue-500 hover:text-blue-700 underline"
                        >
                          Reintentar último envío
                        </button>
                      </div>
                    </div>
                  )}

                  {paraclinicLogs.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-800">🧪 Paraclínicos procesados</h3>
                        <span className="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-medium">
                          🔒 Solo en memoria
                        </span>
                      </div>
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {paraclinicLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`flex items-center justify-between p-4 rounded-xl border-l-4 ${
                              log.status === 'success'
                                ? 'bg-purple-50 border-purple-400'
                                : 'bg-red-50 border-red-400'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                log.status === 'success' ? 'bg-purple-500' : 'bg-red-500'
                              }`}></div>
                              <div>
                                <p className={`font-medium text-sm ${
                                  log.status === 'success' ? 'text-purple-800' : 'text-red-800'
                                }`}>
                                  {log.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                              </div>
                            </div>
                            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                              log.status === 'success'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {log.status === 'success' ? '✅ ANÁLISIS' : '❌ ERROR'}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 text-center">
                        <button
                          onClick={clearParaclinicLogs}
                          className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                          Limpiar historial
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
