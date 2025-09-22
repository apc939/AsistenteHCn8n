# Guía de Integración - Sistema de Grabación con n8n (Notas Clínicas)

Esta guía explica cómo integrar la aplicación React TypeScript de consultas médicas con n8n, incluyendo el flujo completo desde la configuración de alias/IDs internos hasta el envío de audio y notas clínicas estructuradas.

## 📋 Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Gestión de Consultas (Alias)](#gestión-de-consultas-alias)
3. [Hook de Grabación de Audio](#hook-de-grabación-de-audio)
4. [Servicio de Notas Clínicas](#servicio-de-notas-clínicas)
5. [Carga de Audio Existente](#carga-de-audio-existente)
6. [Servicio de Webhook](#servicio-de-webhook)
7. [Componentes UI Reutilizables](#componentes-ui-reutilizables)
8. [Formato de Datos Enviados](#formato-de-datos-enviados)
9. [Sistema de Logs y Estados](#sistema-de-logs-y-estados)
10. [Integración Completa](#integración-completa)
11. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
12. [Ventajas frente a HIPAA](#-ventajas-frente-a-hipaa)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ Alias Form      │───▶│ Recording/Upload    │───▶│ Webhook Service  │
│ (alias + id)    │    │ + Privacy Warnings  │    │   + Validation   │
└─────────────────┘    └─────────────────────┘    └──────────────────┘
         │                       │                         │
         ▼                       ▼                         ▼
┌─────────────────┐    ┌─────────────────────┐    ┌──────────────────┐
│ State Management│    │ Notes Management    │    │   n8n Workflow   │
│ + Privacy Reset │    │  + Type Config      │    │  + Logs System   │
└─────────────────┘    └─────────────────────┘    └──────────────────┘
```

### Estados y interfaces principales

```ts
type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface PatientInfo {
  name: string;   // alias anonimizado
  cedula: string; // identificador interno (no PHI)
}

interface NoteEntry {
  id: string;
  typeId: string;
  content: string;
  updatedAt: number;
}

interface UploadedAudio {
  file: File;
  duration: number | null;
}
```

---

## 👤 Gestión de Consultas (Alias)

El sistema solicita un alias y un identificador interno (sin PHI) antes de cualquier operación:

### Flujo de identificación

```ts
const [patientInfo, setPatientInfo] = useState({
  name: '',
  cedula: ''
});

const [showPatientForm, setShowPatientForm] = useState(true);

const generateEncounterId = () => `encounter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const [encounterId, setEncounterId] = useState(generateEncounterId);
```

### Validaciones integradas

- Alias e identificador interno obligatorios antes de grabar o cargar audio
- Regeneración del `encounterId` al iniciar una nueva consulta
- Reset automático de datos sensibles en memoria al reiniciar

---

## 🎤 Hook de Grabación de Audio

El hook `useAudioRecorder` mantiene el ciclo de vida del `MediaRecorder`, gestiona el temporizador y expone el `Blob` de audio final.

### API

```ts
const {
  state,
  startRecording,
  pauseRecording,
  stopRecording,
  resetRecording,
  recordingTime,
  audioBlob,
  error
} = useAudioRecorder();
```

### Puntos Clave

1. Solicita permisos de micrófono con cancelación de eco y reducción de ruido.
2. Detecta el mejor MIME soportado (webm, mp3, wav, mp4...).
3. Entrega un `Blob` con codec Opus listo para enviar a n8n.

---

## 📝 Servicio de Notas Clínicas

Las notas reemplazan la transcripción automática y permiten registrar hallazgos clínicos en secciones configurables.

### Storage

```ts
// src/services/notesService.ts
interface NoteType { id: string; label: string; }
interface NotesConfig { types: NoteType[]; }
```

- Persistencia en `localStorage` únicamente para los **tipos** de notas (no para el contenido de cada consulta).
- Tipos predeterminados: Análisis, Examen físico, Diagnóstico, Plan de tratamiento.

### Hook `useNotes`

```ts
const {
  notes,              // notas con metadata del tipo
  noteTypes,          // tipos disponibles
  addNote,
  updateNoteContent,
  updateNoteType,
  removeNote,
  clearNotes,
  addNoteType,
  updateNoteTypeLabel,
  removeNoteType,
  getNotesForSubmission // serialización lista para n8n
} = useNotes();
```

- Las notas sólo viven en memoria mientras dura la sesión.
- `getNotesForSubmission()` devuelve las notas listas para enviarse a n8n (filtrando textos vacíos).

---

## 📁 Carga de Audio Existente

Sistema completo de upload con validaciones asíncronas y feedback visual en tiempo real.

### Validaciones secuenciales

1. **Prerequisitos**: Validación de alias e identificadores internos obligatoria
2. **Tipo**: Verificación `file.type.startsWith('audio/')`
3. **Tamaño**: Límite de `MAX_AUDIO_FILE_SIZE` (~120 MB)
4. **Duración**: Análisis asíncrono con `getAudioDurationFromFile()`
5. **Estados**: Loading, success, error con mensajes contextuales

### Implementación

```ts
const [uploadedAudio, setUploadedAudio] = useState<{
  file: File;
  duration: number | null;
} | null>(null);

const [isProcessingFile, setIsProcessingFile] = useState(false);

const handleAudioFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
  // Validaciones secuenciales con estados visuales
  const duration = await getAudioDurationFromFile(file);
  if (duration > MAX_AUDIO_DURATION_SECONDS) {
    // Error handling con cleanup
  }
};
```

Audio cargado se integra completamente con el sistema de notas y se envía con `capture_method: 'uploaded'`.

---

## 🌐 Servicio de Webhook

`webhookService` implementa comunicación robusta con validaciones y estados granulares.

### API extendida

```ts
await webhookService.sendAudio(source, metadata, {
  fileName: originalFileName,    // opcional: conserva nombre original
  skipEnabledCheck: boolean     // permite envío manual cuando webhook deshabilitado
});
```

### Características

- **Configuración persistente**: URL y estado `enabled` en `localStorage`
- **Validación previa**: `testConnection()` verifica conectividad
- **Estados duales**: Envío automático vs manual con confirmaciones
- **Metadatos enriquecidos**: Incluye `recording_type`, `capture_method`, timestamps
- **Transporte seguro**: Fuerza `https://`, bloquea IPs directas y permite una allowlist de dominios
- **Sanitización de archivos**: Normaliza nombres para evitar caracteres peligrosos

---

## 🧱 Componentes UI Reutilizables

| Componente | Propósito | Nuevas características |
|------------|-----------|----------------------|
| `RecordingControls` | Botones para iniciar/pausar/finalizar | Confirmaciones para acciones destructivas |
| `NotesPanel` | Editor de notas organizado por tipo | Timestamps automáticos, tipos dinámicos |
| `NotesSettings` | Administración de tipos de notas | Reset inteligente, validación de duplicados |
| `WebhookSettings` | Configuración de webhook de n8n | Verificación de conectividad, estados visuales |
| `StatusMessage` | Mensajes contextuales diferenciados | Tipos: global, por componente, con auto-close |
| `Timer` | Cronómetro de grabación | Estados visuales según recording state |

### Estados UI avanzados

```ts
interface StatusMessage {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  onClose?: () => void;        // opcional para dismissible
}

// Estados globales vs contextuales
const [showGlobalUploadStatus, setShowGlobalUploadStatus] = useState(false);
const [uploadedAudioMessage, setUploadedAudioMessage] = useState<StatusMessage | null>(null);
```

---

## 📨 Formato de Datos Enviados

El `FormData` enviado a n8n ha sido enriquecido con metadatos completos:

```json
{
  "audio": <Blob>,
  "timestamp": "2025-01-15T14:30:45.000Z",
  "type": "medical_consultation",
  "recording_type": "medical_consultation",
  "duration": 1247,
  "encounter_id": "encounter_h0asf3",
  "capture_method": "uploaded",
  "notes": [
    {
      "id": "1705327845000-xyz789",
      "type_id": "physical_exam",
      "type_label": "Examen físico",
      "content": "Presión arterial: 120/80 mmHg. Pulso regular.",
      "updated_at": "2025-01-15T14:32:15.000Z"
    },
    {
      "id": "1705327920000-abc456",
      "type_id": "diagnosis",
      "type_label": "Diagnóstico",
      "content": "Hipertensión arterial controlada.",
      "updated_at": "2025-01-15T14:33:40.000Z"
    }
  ]
}
```

### Campos agregados

- **`recording_type`**: Tipo específico de consulta médica
- **`updated_at`**: Timestamp ISO para cada nota individual
- **Validación**: Las notas vacías se filtran automáticamente con `getNotesForSubmission()`

---

## 📊 Sistema de Logs y Estados

Implementación de logs temporales con gestión de privacidad:

### Logs en memoria

```ts
interface LogEntry {
  id: string;
  timestamp: string;           // formato localizado
  duration: number;
  status: 'success' | 'error';
  message: string;            // descriptivo con contexto
}

const [sendingLogs, setSendingLogs] = useState<LogEntry[]>([]);
```

### Características de logging

- **Solo en memoria**: No persiste en `localStorage` por privacidad
- **Límite de 10 entradas**: Mantiene solo los envíos más recientes
- **Limpieza automática**: Al reiniciar la consulta o cerrar sesión
- **Timestamps localizados**: Formato español `es-ES`
- **Contexto completo**: Alias/encuentro, duración, notas incluidas

---

## 🔄 Integración Completa

Ejemplo actualizado con gestión completa de alias y estados:

```tsx
import { useState, useEffect } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useNotes } from './hooks/useNotes';
import { webhookService } from './services/webhookService';

export function ConsultaCompleta() {
  const { state, startRecording, stopRecording, audioBlob, recordingTime } = useAudioRecorder();
  const { notes, addNote, getNotesForSubmission, clearNotes } = useNotes();

  // Gestión de alias y consulta
  const [patientInfo, setPatientInfo] = useState({ name: '', cedula: '' });
  const [showPatientForm, setShowPatientForm] = useState(true);
  const generateEncounterId = () => `encounter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const [encounterId, setEncounterId] = useState(() => generateEncounterId());
  const [showPrivacyWarning, setShowPrivacyWarning] = useState(false);

  // Estados de UI
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const startWithPrivacyCheck = () => {
    setShowPrivacyWarning(true);
  };

  const confirmAndStart = async () => {
    setShowPrivacyWarning(false);
    try {
      await startRecording();
      setShowPatientForm(false);
    } catch (error) {
      // Handle recording errors
    }
  };

  const enviarAudio = async () => {
    if (!audioBlob || !patientInfo.name.trim() || !patientInfo.cedula.trim()) return;

    setIsUploading(true);
    try {
      await webhookService.sendAudio(audioBlob, {
        recording_type: 'medical_consultation',
        duration: recordingTime,
        encounter_id: encounterId,
        capture_method: 'recorded',
        notes: getNotesForSubmission()
      });

      // Log successful send
      addLog('success', recordingTime, `Consulta ${encounterId} enviada`);

    } catch (error) {
      addLog('error', recordingTime, `Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetConsulta = () => {
    setPatientInfo({ name: '', cedula: '' });
    setShowPatientForm(true);
    setEncounterId(generateEncounterId());
    clearNotes();
    setLogs([]);
  };

  return (
    <div>
      {showPatientForm ? (
        <PatientForm
          patientInfo={patientInfo}
          onChange={setPatientInfo}
          onStart={startWithPrivacyCheck}
        />
      ) : (
        <RecordingInterface
          state={state}
          onStart={startWithPrivacyCheck}
          onStop={stopRecording}
          onSend={enviarAudio}
          onReset={resetConsulta}
          isUploading={isUploading}
        />
      )}

      {showPrivacyWarning && (
        <PrivacyWarning
          onConfirm={confirmAndStart}
          onCancel={() => setShowPrivacyWarning(false)}
        />
      )}

      <NotesPanel notes={notes} />
      <LogsPanel logs={logs} />
    </div>
  );
}
```

---

## 🔒 Consideraciones de Seguridad

### Privacidad por diseño

1. **Limpieza proactiva**: `localStorage.removeItem('n8n-sending-logs')` en `beforeunload` y reinicios de consulta
2. **Advertencias contextuales**: Recordatorios explícitos antes de cada grabación sobre datos sensibles
3. **Solo configuración persiste**: Únicamente webhook URL y tipos de notas se guardan localmente
4. **Datos médicos efímeros**: Audio, notas y alias/encounter solo en memoria durante la sesión

### Validaciones técnicas

1. **HTTPS obligatorio**: Requerido por MediaRecorder API y FileReader API
2. **Límites estrictos**: 60 min / 120 MB previenen saturación del flujo n8n
3. **Validación asíncrona**: Verificación de duración antes de aceptar archivos
4. **Estados de loading**: Previenen múltiples envíos simultáneos

### Confirmaciones de usuario

1. **Grabación**: Advertencia explícita sobre privacidad antes de iniciar
2. **Envío manual**: Confirmación con `window.confirm()` para acciones críticas
3. **Nueva consulta**: Limpieza automática con confirmación visual
4. **Acciones destructivas**: Confirmación antes de detener grabaciones en progreso

---

## ✅ Ventajas frente a HIPAA

- **Minimización de identificadores**: alias, IDs internos y `encounter_id` sustituyen datos personales en todo el flujo.
- **Datos efímeros en frontend**: audio, notas, alias y logs permanecen solo en memoria; no hay persistencia de PHI.
- **Transporte asegurado**: el webhook fuerza `https://`, bloquea IPs e incorpora allowlist configurable para dominios aprobados.
- **Controles preventivos**: advertencias de privacidad, confirmaciones y validaciones sequenciales reducen errores operativos.
- **Nombres de archivo neutros**: descargas y envíos utilizan identificadores anónimos para evitar filtraciones involuntarias.

---

## 🚀 Extensiones Recomendadas

- **Hooks portables**: Reutiliza `useAudioRecorder`, `useNotes` en otras aplicaciones React
- **Servicios modulares**: `webhookService` y `notesService` son independientes del UI
- **Metadatos extensibles**: Agrega campos personalizados al payload según especialidad médica
- **Estados granulares**: Implementa validaciones específicas según flujo de trabajo
- **Integración EHR**: Mapea `type_id` y `type_label` a sistemas hospitalarios existentes

¿Necesitas adaptar el sistema? La arquitectura modular permite customizar la UI manteniendo la lógica crítica de grabación, notas y comunicación con n8n.
