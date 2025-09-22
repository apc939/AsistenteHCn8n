# CLAUDE.md - Documentación Técnica del Asistente HC (Notas Clínicas)

## 📝 Descripción General

Aplicación web React con TypeScript para registrar consultas médicas con interfaz intuitiva. Permite **grabar** audio en tiempo real o **subir archivos existentes**, capturar **notas clínicas estructuradas** por secciones configurables, y enviar automáticamente a n8n con metadatos anonimizados de la consulta.

## ✅ Reglas de implementación

- El `<input type="file">` debe aceptar todos los MIME/extension usados por iOS (`audio/*`, `application/octet-stream`, `.m4a`, `.mp3`, `.wav`, `.ogg`, `.webm`, `.mp4`, `.caf`) para evitar archivos deshabilitados en Safari móvil.
- Las validaciones de audio deben tolerar MIME genéricos o vacíos y apoyarse en la extensión como respaldo antes de bloquear un archivo.
- Cualquier cambio que afecte carga de archivos se prueba en iPhone/iPad (o simulador equivalente) antes de liberarlo.
- No dejar carpetas temporales como `backups/` ni artefactos de compilación (`.vite/deps`) en el repositorio; eliminarlos antes de commitear.

## 🏗️ Arquitectura del Sistema

```
src/
├── components/
│   ├── RecordingControls.tsx     # Controles de grabación
│   ├── NotesPanel.tsx            # Editor de notas por secciones
│   ├── NotesSettings.tsx         # Gestión de tipos de notas
│   ├── StatusMessage.tsx         # Mensajes reutilizables
│   ├── Timer.tsx                 # Cronómetro de la grabación
│   └── WebhookSettings.tsx       # Configuración del webhook n8n
├── hooks/
│   ├── useAudioRecorder.ts       # Lógica central de MediaRecorder
│   └── useNotes.ts               # Manejo de notas clínicas en memoria
├── services/
│   ├── webhookService.ts         # Comunicación con n8n
│   └── notesService.ts           # Persistencia de tipos de nota
└── App.tsx                       # Orquestación y UI principal
```

## 🎯 Funcionalidades Principales

1. **Gestión de alias** con captura obligatoria de un alias y un identificador interno antes de iniciar.
2. **Grabación de audio** en formato WebM/Opus con controles intuitivos de pausa/reanudación.
3. **Carga de audio existente** (múltiples formatos: WebM, MP3, WAV, M4A, OGG) hasta 60 minutos.
4. **Notas clínicas estructuradas** organizadas por tipos configurables y editables en tiempo real.
5. **Envío automático/manual** a n8n con validaciones completas y confirmaciones de usuario.
6. **Privacidad mejorada** con advertencias antes de grabar y limpieza automática de datos.
7. **Historial temporal** de envíos (solo en memoria) con logs detallados de estado.
8. **Descarga anónima** con nombres generados a partir del identificador de encuentro.

## 🔧 Implementación Técnica

### Hook `useAudioRecorder`

- Gestiona permisos de micrófono y compatibilidad de MIME.
- Expone `state`, `recordingTime` y `audioBlob` final.
- Adaptado para móviles (mono, 44.1 kHz, supresión de ruido).

```ts
const {
  state,
  startRecording,
  pauseRecording,
  stopRecording,
  resetRecording,
  recordingTime,
  audioBlob
} = useAudioRecorder();
```

### Hook `useNotes`

- Mantiene notas en memoria y tipos configurables en `localStorage`.
- Serializa únicamente notas con contenido (`getNotesForSubmission`).
- Permite agregar, editar, reasignar tipo y eliminar notas en tiempo real.

```ts
const {
  notes,
  noteTypes,
  addNote,
  updateNoteContent,
  updateNoteType,
  removeNote,
  addNoteType,
  removeNoteType,
  resetNoteTypes,
  getNotesForSubmission
} = useNotes();
```

### Servicio `notesService`

- Persistencia simple en `localStorage` para los tipos de nota.
- Normaliza etiquetas y evita duplicados.
- Provee valores por defecto para restaurar rápidamente la configuración.

### Servicio `webhookService`

- Guarda URL y estado (`enabled`) en `localStorage`.
- `sendAudio(blob, metadata, { fileName })` valida que la URL sea HTTPS (con allowlist opcional).
- Añade `encounter_id` y `capture_method = recorded | uploaded` para rastrear el encuentro y el origen del audio.

### Validación de audios cargados

`App.tsx` implementa validaciones completas con `getAudioDurationFromFile()`:

```ts
// Validaciones secuenciales
if (!file.type.startsWith('audio/')) return error('Formato no válido');
if (file.size > MAX_AUDIO_FILE_SIZE) return error('Tamaño excedido');

const duration = await getAudioDurationFromFile(file);
if (duration > MAX_AUDIO_DURATION_SECONDS) return error('Duración excedida');
```

Estados de procesamiento con indicadores visuales y mensajes contextuales para cada tipo de error.

## 🔄 Flujo de Datos

1. **Identificación** ➜ Captura obligatoria de alias + identificador interno con validación de campos.
2. **Advertencia de privacidad** ➜ Confirmación explícita antes de iniciar grabación.
3. **Captura de audio** ➜ Grabación con controles o carga con validaciones asíncronas.
4. **Notas paralelas** ➜ Edición en tiempo real con tipos configurables y timestamps.
5. **Envío inteligente** ➜ Automático si webhook habilitado, manual con confirmaciones.
6. **Logs temporales** ➜ Registro en memoria con limpieza automática por seguridad.

```json
{
  "type": "medical_consultation",
  "recording_type": "medical_consultation",
  "capture_method": "recorded",
  "duration": 1847,
  "encounter_id": "encounter_k9f3as",
  "notes": [
    {
      "id": "1640995200000-abc123",
      "type_id": "analysis",
      "type_label": "Análisis",
      "content": "Paciente refiere dolor precordial intermitente...",
      "updated_at": "2024-01-01T10:30:00.000Z"
    }
  ]
}
```

## 🧩 UI Destacada

- **Formulario de alias**: Modal inicial obligatorio con validación en tiempo real (alias + ID interno).
- **RecordingControls**: Controles intuitivos con confirmaciones para acciones destructivas.
- **NotesPanel**: Editor multi-sección con timestamps automáticos y tipos dinámicos.
- **NotesSettings**: Configuración avanzada con reset a valores recomendados.
- **Upload Card**: Arrastrar y soltar con preview, validaciones y botones contextuales.
- **Status System**: Mensajes diferenciados por contexto (global, por componente, por acción).
- **Privacy Warnings**: Alerts contextuales antes de acciones sensibles.

## 🔒 Seguridad y Privacidad

- **Limpieza automática**: Los datos médicos se eliminan de `localStorage` al iniciar, reiniciar la consulta o cerrar sesión.
- **Solo en memoria**: Audio, notas y alias/encuentros nunca se persisten localmente.
- **Advertencias contextuales**: Recordatorios explícitos sobre privacidad antes de cada grabación.
- **Validaciones estrictas**: Límites proactivos (60 min, 120 MB) con mensajes educativos.
- **Logs efímeros**: Historial solo en memoria con limpieza manual disponible.
- **HTTPS obligatorio**: Requerido para permisos de micrófono y funcionalidades de archivos.
- **Webhook endurecido**: Se fuerza `https://`, se bloquean IPs directas y se soporta allowlist de dominios.

## ✅ Ventajas frente a HIPAA

- **Minimización de PHI**: alias, IDs internos y `encounter_id` sustituyen los datos directos del paciente.
- **Datos efímeros**: audio, notas, alias y logs se descartan al cerrar o reiniciar la consulta.
- **Transporte seguro**: validaciones obligatorias de HTTPS y dominios reducen riesgos de exfiltración.
- **Controles operativos**: advertencias, confirmaciones y validaciones secuenciales evitan errores humanos.
- **Salida neutra**: descargas y payloads usan identificadores anónimos para prevenir filtraciones accidentales.

## 📦 Extensibilidad

- **Hooks reutilizables**: `useAudioRecorder` y `useNotes` son independientes y portables.
- **Arquitectura modular**: Servicios separados (`webhookService`, `notesService`) facilitan integraciones.
- **Metadatos flexibles**: Campo `capture_method` permite workflows diferenciados en n8n.
- **Tipos configurables**: Sistema de notas completamente customizable para diferentes especialidades.
- **Estados granulares**: UI reactiva con estados específicos para cada componente.

## 🛠️ Stack Técnico

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS con componentes responsivos
- **Icons**: Lucide React (consistent design system)
- **Build**: ESLint + TypeScript compiler con configuración estricta
- **Audio**: MediaRecorder API nativo + HTMLAudioElement para validaciones

---

Documentación actualizada reflejando la evolución hacia una aplicación médica completa con gestión de alias y encuentros, privacidad mejorada y experiencia de usuario optimizada. Eliminadas referencias obsoletas a servicios de transcripción.
