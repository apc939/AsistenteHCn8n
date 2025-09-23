# CLAUDE.md — Documentación Técnica Final del Asistente HC

## 🧭 Panorama General

Aplicación web construida con **React 18 + TypeScript + Vite** para capturar consultas médicas completas. Centraliza cuatro flujos sincronizados:

1. **Identificación segura del encuentro** (alias + ID interno + `encounterId`).
2. **Captura de audio** (grabación WebM/Opus o carga de archivos ≥ iOS) con validaciones de duración y tamaño.
3. **Transcripción automática** mediante AssemblyAI con desidentificación PII.
4. **Gestión de notas clínicas y paraclínicos** que se envían a n8n tras superar las comprobaciones de privacidad.

Toda la información sensible vive en memoria y solo se serializa para enviar al backend aprobado por HIPAA.

## ✅ Reglas de Implementación y Aprendizajes Clave

- **URLs blindadas**: `ensureSecureWebhookUrl()` obliga `https://`, aplica allowlist (`VITE_ALLOWED_WEBHOOK_DOMAINS`) y bloquea IPs directas para webhooks y paraclínicos.
- **Flujo gated por checklist**: el usuario no accede al workflow clínico hasta verificar AssemblyAI, webhook n8n y webhook de paraclínicos.
- **Datos efímeros**: audio, notas, alias y logs solo existen en memoria; `beforeunload` purga todo. Únicamente persisten configuraciones.
- **Compatibilidad móvil**: lista explícita de MIME/extension de iOS + verificación de duración asíncrona previenen rechazos en Safari.
- **Privacidad operativa**: antes de grabar se fuerza confirmación de privacidad; toda acción sensible exige alias + ID interno.
- **Logs mínimos**: bitácora en memoria (máx. 10 eventos) sin PHI para auditar la sesión y detectar errores en tiempo real.
- **Transcripción segura**: la API key nunca se serializa junto con la configuración; el flujo PII de AssemblyAI reemplaza identificadores por hash.

## 🏗️ Arquitectura Final

```
src/
├── App.tsx                          # Orquestación, checklist y flujos clínicos
├── components/
│   ├── RecordingControls.tsx        # Controles de MediaRecorder y advertencias
│   ├── NotesPanel.tsx               # Editor estructurado con tipos dinámicos
│   ├── NotesSettings.tsx            # CRUD de tipos de notas con persistencia segura
│   ├── TranscriptionPanel.tsx       # Resultados, acciones manuales y estado AssemblyAI
│   ├── TranscriptionSettings.tsx    # Configuración y verificación de AssemblyAI
│   ├── ParaclinicPanel.tsx          # Upload, estado de análisis y visor de logs
│   ├── ParaclinicSettings.tsx       # Gestión del webhook de paraclínicos
│   ├── WebhookSettings.tsx          # Configuración/validación del webhook n8n
│   ├── StatusMessage.tsx            # Sistema unificado de alertas y banners
│   └── Timer.tsx                    # Cronómetro resiliente a pausas/reanudaciones
├── hooks/
│   ├── useAudioRecorder.ts          # Control de MediaRecorder y Blob final
│   ├── useNotes.ts                  # Estado de notas + tipos en localStorage
│   ├── useTranscription.ts          # Ensamblado de AssemblyAI SDK + estados
│   └── useParaclinics.ts            # Envío de imágenes y logs de análisis
└── services/
    ├── webhookService.ts            # Validación HTTPS/allowlist y envío JSON a n8n
    ├── transcriptionService.ts      # AssemblyAI SDK con políticas PII
    ├── paraclinicService.ts         # Webhook multipart + normalización de respuesta
    └── notesService.ts              # CRUD de tipos de nota con reglas de negocio
```

## 🔄 Flujo Clínico End-to-End

1. **Checklist de configuración**: obliga a verificar AssemblyAI, webhook n8n y paraclínicos.
2. **Captura de alias/ID**: formulario modal bloqueante, genera `encounterId` (`encounter_${timestamp}_${random}`).
3. **Grabación o carga**:
   - Validaciones: MIME/extension, tamaño ≤120 MB, duración ≤60 min, confirmaciones de privacidad.
   - `useAudioRecorder` mantiene estado debouncing y `audioBlob` final.
4. **Transcripción AssemblyAI**:
   - `useTranscription` verifica API key (list transcripts) antes de habilitar.
   - Transcripciones automáticas redactan PII con políticas `person_name`, `number_sequence`, etc.
5. **Notas estructuradas**:
   - Tipos configurables persistidos; contenido solo en memoria.
   - `getNotesForSubmission()` elimina notas vacías y normaliza timestamps ISO.
6. **Envío a n8n**:
   - `sendTranscription()` crea payload JSON con `transcript`, `encounter_id`, `capture_method`, `duration`, `notes[]`.
   - Logs en memoria registran éxitos/errores sin identificar pacientes.
7. **Paraclínicos**:
   - `sendImages()` usa `FormData` (`images[]`, `metadata`, `timestamp`).
   - La respuesta se normaliza a `ParaclinicAnalysisResult` (`summary`, `sections`, `raw`).

## 🧩 Hooks y Servicios Destacados

### `useAudioRecorder`

- Selecciona MIME óptimo (`audio/webm` fall‑back a `.mp4`/`.m4a`).
- Expone `state`, `recordingTime`, `audioBlob`, `error`.
- Resetea estado tras envíos exitosos o reinicio de consulta.

### `useTranscription`

- Persiste configuración aislando API key de flags (`enabled`, `isVerified`).
- `testConnection()` usa `client.transcripts.list` como verificación ligera.
- `transcribeBlob`/`transcribeFile` aplican políticas PII y devuelven `{ text, confidence, id }`.

### `useParaclinics`

- Mantiene cola de logs (máx. 10) y limpia análisis manualmente.
- `sendImages()` exige webhook activo, aplica `ensureSecureWebhookUrl` y normaliza resumen para UI.

### `webhookService`

- `ensureSecureWebhookUrl()` centraliza reglas TLS + allowlist.
- `sendTranscription()` emite JSON simple; `sendAudio()` queda como legado (aviso por consola).
- Guarda `enabled/isVerified/lastTestedAt` en localStorage sin credenciales.

## 📦 Contratos de Datos

### Payload principal a n8n (`sendTranscription`)

```json
{
  "transcript": "Paciente refiere dolor precordial intermitente…",
  "timestamp": "2024-05-12T18:22:41.910Z",
  "type": "medical_consultation",
  "encounter_id": "encounter_lq4h5s_x12af9",
  "capture_method": "recorded",
  "duration": 134,
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

### Respuesta esperada de paraclínicos (`ParaclinicAnalysisResult`)

```json
{
  "id": "lab_panel_20240512",
  "summary": "Analítica compatible con anemia ferropénica moderada.",
  "sections": [
    { "title": "Hemograma", "content": "Hb 9.8 g/dL…" },
    { "title": "Recomendaciones", "content": "Solicitar ferritina sérica…" }
  ],
  "raw": { "provider": "claude", "version": "1.2.0", "insights": [] }
}
```

## 🧠 Buenas Prácticas consolidadas

- **Siempre probar en iOS** tras tocar carga/gravación; Safari usa MIME genéricos.
- **Mantener allowlist actualizada** en `.env` para prevenir destinos no aprobados.
- **Firmar solicitudes en backend** (pendiente) pese a validaciones cliente.
- **Rotar API key de AssemblyAI** y limpiar `localStorage` manualmente antes de compartir dispositivos.
- **Agregar tests de integración** para validar límites (duración, tamaño, allowlist) al actualizar dependencias.

## 🔒 Controles de Seguridad vigentes

- Advertencias previas a grabar/cargar.
- Confirmaciones antes de transcribir/enviar.
- Purga de logs al cerrar pestaña y cada reinicio de consulta.
- Nombres de archivo neutros (`consulta_<timestamp>.webm`) sin PHI.
- Forzado de `https://` y bloqueo de IPs/dominios no aprobados.
- Sanitización de nombres de archivo y normalización de metadatos.

## 🚀 Extensibilidad

- Hooks y servicios desacoplados permiten portar lógica a otros frontends.
- `ParaclinicService` acepta `metadata` arbitraria para flujos hospitalarios.
- UI modular con `StatusMessage` centralizado facilita customizar mensajes por política.
- Checklist declarativo (`configurationChecklist`) admite añadir nuevos requisitos regulatorios sin tocar lógica core.

---
Documentación actualizada al estado final: integraciones automáticas con AssemblyAI y n8n, manejo seguro de paraclínicos y mejores prácticas aprendidas durante la implementación.
