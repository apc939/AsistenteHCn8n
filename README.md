# Asistente HC - Grabación de Consultas Médicas

Aplicación web para grabación de consultas médicas con integración automática a n8n.

## 🚀 Características

- **Registro de alias** y un identificador interno antes de grabar (sin PHI directo)
- **Grabación de audio** en tiempo real con controles intuitivos
- **Carga de audio existente** (hasta ~60 minutos) para enviarlo junto al expediente
- **Notas clínicas configurables** por secciones (análisis, examen físico, plan, etc.)
- **Descarga local** del archivo de audio con identificador del encuentro
- **Envío automático** al webhook de n8n al finalizar grabación o tras cargar un audio (incluye notas)
- **Historial de envíos** con timestamps de los últimos 10 envíos
- **Validación estricta del webhook** (HTTPS obligatorio, bloqueo de IPs y allowlist opcional)
- **Interfaz médica** diseñada para uso profesional
- **Sin almacenamiento local** para máxima privacidad
- **Formato optimizado** WebM con codec Opus

## 📋 Requisitos

- Node.js 18 o superior
- Navegador moderno con soporte para MediaRecorder API
- Webhook de n8n configurado

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd AsistenteHCn8n

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 🔧 Configuración

### Configuración básica
1. Abrir la aplicación en el navegador
2. Expandir el panel "Configuración del Webhook n8n"
3. Ingresar la URL del webhook de n8n
4. Probar la conexión
5. Activar el envío automático

### Configuración de notas clínicas
1. Expandir el panel "Tipos de notas clínicas"
2. Revisar o crear las secciones que usarás (ej. "Análisis", "Examen físico", "Plan")
3. Reordenar o renombrar las secciones según la práctica médica
4. Restablecer la lista recomendada cuando sea necesario

### Formato de datos enviados a n8n

El webhook recibirá un `FormData` con:
- `audio`: Archivo WebM con la grabación
- `timestamp`: Fecha y hora en formato ISO
- `type`: "medical_consultation"
- `duration`: Duración en segundos
- `encounter_id`: Folio o identificador interno anonimizado generado por la app
- `capture_method`: "recorded" (grabado en la app) o "uploaded" (archivo cargado)
- `notes` (si existen): Arreglo de objetos con la estructura
  - `id`: Identificador interno de la nota
  - `type_id`: Identificador del tipo de nota
  - `type_label`: Etiqueta visible del tipo de nota
  - `content`: Texto de la nota
  - `updated_at`: Fecha y hora de última actualización en ISO

## 📱 Uso

1. **Configurar webhook y tipos de notas** (solo la primera vez)
2. **Registrar la consulta** ingresando un alias y un identificador interno (sin datos reales)
3. **Conceder permisos** de micrófono cuando se solicite
4. **Grabar o cargar audio**: Iniciar la grabación o usa "Usar audio existente" para subir un archivo (máx. 60 min)
5. **Registrar notas clínicas** en las secciones configuradas mientras se desarrolla la consulta
6. **Descargar** el audio si necesitas una copia local con el identificador del encuentro
7. **Enviar a n8n**: El audio (grabado o cargado) y las notas se envían automáticamente al finalizar, o manualmente desde los botones disponibles
8. **Nueva consulta**: Usa el botón para limpiar la sesión y comenzar con un alias distinto

## 🔒 Privacidad y Seguridad

- **Las grabaciones NO se almacenan localmente**
- **Alias e identificadores internos NO se guardan persistentemente**
- **Las notas clínicas solo viven en memoria durante la sesión**
- **Los archivos de audio cargados se descartan tras enviarse**
- **Los logs solo existen en memoria durante la sesión**
- **Limpieza automática al iniciar una nueva consulta o cerrar la aplicación**
- Envío inmediato tras finalizar grabación o enviar un audio cargado
- Conexión HTTPS requerida para micrófono y carga de audio
- Solo se guarda configuración del webhook y los tipos de notas (sin datos médicos)

## ✅ Ventajas frente a HIPAA

- **Minimización de PHI**: la app trabaja con alias, identificadores internos y `encounter_id` anónimos.
- **Datos efímeros en cliente**: audio, notas, alias y logs solo viven en memoria durante la sesión.
- **Transporte endurecido**: el webhook debe ser `https://`, se bloquean IPs directas y se ofrece allowlist de dominios.
- **Controles preventivos**: advertencias de privacidad, validaciones sequenciales y confirmaciones antes de acciones críticas.
- **Descargas sin identificadores**: los archivos locales incluyen únicamente el identificador del encuentro y la marca temporal.

## 🧪 Scripts Disponibles

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Compilar para producción
npm run preview   # Vista previa de la compilación
npm run lint      # Verificar código con ESLint
```

## 📄 Tecnologías

- **React** + **TypeScript**
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Web Audio API** para grabación
- **MediaRecorder API** para captura de audio
- **File API** y **HTMLMediaElement** para validar audios cargados
- **Fetch API** para enviar audio y notas a n8n

## 🐛 Solución de Problemas

### Error de permisos de micrófono
- Verificar que el navegador tenga permisos de micrófono
- Usar HTTPS (requerido por navegadores modernos)

### Error de conexión webhook
- Verificar que la URL del webhook sea correcta
- Comprobar que n8n esté ejecutándose y accesible
- Revisar configuración CORS en n8n si es necesario

### Problemas de audio
- Verificar que el micrófono esté funcionando
- Comprobar configuración de audio del sistema
- Probar en diferentes navegadores

### Problemas al subir audio
- Asegúrate de que el archivo sea un formato compatible (webm, mp3, wav, ogg, m4a)
- Verifica que la duración sea menor a 60 minutos
- Comprueba que el tamaño sea inferior a 120 MB
- Si no se puede calcular la duración, convierte el audio a un formato estándar (por ejemplo, WAV)

## 📞 Soporte

Para reportar problemas o sugerir mejoras, crear un issue en el repositorio.
