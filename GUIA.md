# Guía Operativa &amp; de Integración — Asistente HC

Esta guía describe el flujo definitivo de la aplicación, cómo configurarla y cómo conectarla con n8n y AssemblyAI para manejar audio, transcripción, notas clínicas y paraclínicos bajo prácticas alineadas a HIPAA.

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Checklist de Configuración Inicial](#checklist-de-configuración-inicial)
3. [Gestión de encuentros clínicos](#gestión-de-encuentros-clínicos)
4. [Flujo de audio (grabación/carga)](#flujo-de-audio-grabacióncarga)
5. [Transcripción automática con AssemblyAI](#transcripción-automática-con-assemblyai)
6. [Notas clínicas estructuradas](#notas-clínicas-estructuradas)
7. [Paraclínicos y análisis de imágenes](#paraclínicos-y-análisis-de-imágenes)
8. [Envío a n8n y contratos de datos](#envío-a-n8n-y-contratos-de-datos)
9. [Validaciones, logs y manejo de errores](#validaciones-logs-y-manejo-de-errores)
10. [Seguridad y mejores prácticas](#seguridad-y-mejores-prácticas)
11. [Extensiones recomendadas](#extensiones-recomendadas)

---

## Arquitectura General

```
┌──────────────────────┐
│ Checklist de setup   │  AssemblyAI / n8n / Paraclínicos verificados
└─────────┬────────────┘
          │ habilita
┌─────────▼──────────┐  alias + ID interno + encounterId
│ Gestión de encuentro│
└─────────┬──────────┘
          │ abre
┌─────────▼──────────────────────────────────────────────┐
│ Workflow clínico                                       │
│  ├─ Captura de audio (MediaRecorder / Upload)          │
│  ├─ Transcripción automática + acciones manuales       │
│  ├─ Notas estructuradas configurables                  │
│  └─ Paraclínicos (imágenes + análisis)                 │
└─────────┬──────────────────────────────────────────────┘
          │ segrega
┌─────────▼───────────┐        ┌─────────────────────────┐
│ Logs temporales     │◀──────▶│ n8n webhooks (audio/text)│
└─────────────────────┘        └─────────────────────────┘
```

Elementos principales:

- `App.tsx` orquesta tabs («Configuración», «Workflow») y el checklist.
- Componentes especializados (`RecordingControls`, `TranscriptionPanel`, `ParaclinicPanel`, etc.) controlan cada subflujo.
- Hooks encapsulan la lógica para audio (`useAudioRecorder`), notas (`useNotes`), transcripción (`useTranscription`) y paraclínicos (`useParaclinics`).
- Servicios (`webhookService`, `transcriptionService`, `paraclinicService`, `notesService`) manejan persistencia segura y comunicación externa.

---

## Checklist de Configuración Inicial

El usuario debe completar tres verificaciones antes de acceder al flujo clínico:

1. **AssemblyAI** (`TranscriptionSettings`): la API key se entrega desde el backend y aparece como sólo lectura. El usuario únicamente pulsa «Probar conexión», que ejecuta `client.transcripts.list` para validar. Si es exitoso, la transcripción queda habilitada automáticamente.
2. **Webhook principal n8n** (`WebhookSettings`): la URL `https://piloto-n8n.2ppzbm.easypanel.host/webhook/a9259909-885a-4670-8c65-85036a79b582` está precargada y no se puede editar. El botón «Probar conexión» envía `{"test": true}` para verificar disponibilidad.
3. **Webhook de paraclínicos** (`ParaclinicSettings`): el endpoint `https://piloto-n8n.2ppzbm.easypanel.host/webhook/66130711-cac7-4aa0-8b3f-6c3822cb5dde` es fijo; solo se puede ejecutar la prueba de POST para comprobar recepción de imágenes.

Mientras alguna verificación falla el tab activo permanece en «Configuración» y se bloquea la sección clínica.

---

## Gestión de encuentros clínicos

- **Formulario inicial**: solicita `alias` (identificador anónimo) y `cedula` (ID interno). Ambos son obligatorios antes de grabar, cargar audio o subir paraclínicos.
- **Encounter ID**: `encounter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`. Se regenera en reinicios y se usa para nombrar payloads.
- **Privacidad previa**: al iniciar grabación se muestra `showRecordingPrivacyWarning` exigiendo confirmación explícita.
- **Reinicio seguro**: `resetOnlyRecording` / `resetConsulta` limpia audio, notas, logs y genera nuevo encounter.

---

## Flujo de audio (grabación/carga)

### Grabación en vivo

- `useAudioRecorder` controla el ciclo de vida de `MediaRecorder` e intenta codecs en orden (`audio/webm`, `audio/mp4`, `audio/mpeg`…).
- Timer resiliente (`Timer.tsx`) mantiene segundos, incluso tras pausas.
- Tras detener, el Blob se guarda en estado y queda disponible para transcribir/enviar.

### Carga de archivos

- `<input type="file">` acepta `audio/*`, `application/octet-stream` y extensiones: `.mp3`, `.m4a`, `.aac`, `.wav`, `.ogg`, `.webm`, `.mp4`, `.m4p`, `.caf`.
- Validaciones al seleccionar: tamaño ≤120 MB, duración ≤60 min (`getAudioDurationFromFile` con HTMLAudioElement), MIME permitido o extensión alternativa.
- Mensajes contextualizados (`uploadedAudioMessage`) indican éxito o error.

---

## Transcripción automática con AssemblyAI

- `useTranscription` mantiene la configuración y estados `isTranscribing`, `transcriptionResult`, `error`. La API key queda fijada en el servicio y no puede modificarse desde la UI.
- `transcribeBlob` y `transcribeFile` convierten audio a texto con `language_code: 'es'`, `punctuate: true`, `redact_pii: true` (políticas: `person_name`, `number_sequence`, `drivers_license`, etc., sustitución `hash`).
- `TranscriptionPanel` permite:
  - Transcribir manualmente la grabación o un audio cargado.
  - Enviar la última transcripción a n8n.
  - Limpiar resultado y error.
  - Mostrar `confidence`, ID y estado devueltos por AssemblyAI.

---

## Notas clínicas estructuradas

- `useNotes` gestiona las notas en memoria y los tipos en `localStorage`.
- Tipos por defecto: Análisis, Examen físico, Diagnóstico, Plan terapéutico (personalizables en `NotesSettings`).
- Cada nota conserva `type_id`, `type_label`, `content`, `updated_at` en ISO y se desecha si queda vacía.
- `NotesPanel` sincroniza edición en vivo, timestamps y permite duplicar/eliminar notas.

---

## Paraclínicos y análisis de imágenes

- `useParaclinics` valida que exista webhook configurado y habilitado antes de enviar; la URL proviene del backend y es inmutable en la UI.
- `ParaclinicPanel` acepta múltiples archivos (imágenes o PDFs convertidos) y manda `FormData` con `images[]`, `metadata` (alias, ID interno, `encounterId`), `timestamp` y `type: 'paraclinic_document'`.
- Tras enviar, cualquier JSON retornado se normaliza a:
  - `summary` (extraído de `text`, `content.parts`, `summary`, etc.).
  - `sections` opcionales para desglose.
  - `logs` de envío (éxitos/errores) en memoria.

---

## Envío a n8n y contratos de datos

### Transcripciones y notas (`webhookService.sendTranscription`)

```json
{
  "transcript": "Paciente refiere dolor precordial intermitente…",
  "timestamp": "2024-05-12T18:22:41.910Z",
  "type": "medical_consultation",
  "encounter_id": "encounter_lq4h5s_x12af9",
  "capture_method": "uploaded",  // "recorded" o "uploaded"
  "duration": 184,
  "notes": [
    {
      "id": "1715531723500-6z31f7",
      "type_id": "plan",
      "type_label": "Plan terapéutico",
      "content": "Iniciar beta bloqueador…",
      "updated_at": "2024-05-12T18:22:05.112Z"
    }
  ]
}
```

- Si no hay notas, el campo `notes` se omite.
- `allowDisabledWebhook` permite envíos manuales incluso cuando `enabled` está en `false` (el usuario confirma explícitamente). El endpoint se fija automáticamente tras la verificación inicial.
- Logs reflejan duración formateada y resultado (`success` / `error`).

### Paraclínicos (`paraclinicService.sendImages`)

`FormData` → `POST https://<dominio permitido>/paraclinics` con campos:

- `images`: múltiples archivos.
- `timestamp`: ISO.
- `type`: `paraclinic_document`.
- `metadata`: JSON string con `encounterId`, `patientAlias`, `patientInternalId`.

Respuesta esperada (`ParaclinicAnalysisResult`):

```json
{
  "id": "lab_panel_20240512",
  "summary": "Analítica compatible con anemia ferropénica moderada.",
  "sections": [
    { "title": "Hemograma", "content": "Hb 9.8 g/dL…" },
    { "title": "Recomendaciones", "content": "Solicitar ferritina sérica…" }
  ],
  "raw": { "provider": "claude", "version": "1.2.0" }
}
```

---

## Validaciones, logs y manejo de errores

- **Audio**: MIME/extensiones, tamaño, duración, confirmación de privacidad y bloqueo si faltan alias/ID interno.
- **Transcripción**: se muestran errores de AssemblyAI; la UI ofrece limpiar error y reintentar.
- **Webhook n8n**: `StatusMessage` global indica progreso, éxito o fallo; logs internos guardan duración y mensaje.
- **Paraclínicos**: logs independientes con timestamp, estado y mensaje; se pueden limpiar manualmente.
- **Persistencia mínima**: solo configuraciones (sin credenciales) y tipos de nota residen en `localStorage`.

---

## Seguridad y mejores prácticas

- `ensureSecureWebhookUrl` aplica HTTPS + allowlist y bloquea IP literal.
- Confirmaciones previas a acciones críticas (`window.confirm`) y advertencias permanentes en UI.
- Nombres de archivo generados (`consulta_<timestamp>.webm`) sin PHI.
- Limpieza de datos sensibles en `beforeunload` y tras reiniciar consulta.
- Transcripción con desidentificación automática de PII.
- Recomendación: Firma HMAC/JWT en backend para completar protección (ver checklist HIPAA).

---

## Extensiones recomendadas

1. **Firmas de webhook y replay protection**: agregar nonce/timestamp en cliente y verificación en n8n.
2. **Políticas por rol**: usar SSO y permisos para controlar quién puede grabar o enviar.
3. **Historias clínicas**: mapear `type_id` a códigos estandarizados (SNOMED/LOINC) en n8n.
4. **Alertas automáticas**: enviar notificaciones cuando `confidence` de transcripción sea baja.
5. **Integración EHR**: replicar payloads en un motor FHIR usando `encounter_id` como hilo conductor.

Con estos pasos, la app queda lista para operar con transcripciones automáticas, notas estructuradas y análisis de paraclínicos, manteniendo controles de privacidad consistentes.
