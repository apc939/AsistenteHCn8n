# Asistente HC - Documentacion de Proyecto

Aplicacion React + TypeScript disenada para capturar encuentros clinicos con transcripcion automatica y entrega segura a flujos n8n. El frontend opera enteramente en el navegador, minimiza datos persistidos y coordina audio, notas clinicas y analisis de paraclinicos.

## Caracteristicas principales

- **Checklist de configuracion** que bloquea el flujo clinico hasta verificar las integraciones criticas.
- **Captura de audio** por grabacion o carga, con validaciones de tamano (<=120 MB), duracion (<=60 min), MIME y consentimiento.
- **Transcripcion automatica** con AssemblyAI, incluyendo anonimizacion PII y reintentos manuales.
- **Notas clinicas estructuradas** con tipos dinamicos y almacenamiento solo en memoria.
- **Paraclinicos**: subida de imagenes/documentos y normalizacion del resultado devuelto por n8n.
- **Envio seguro a n8n** usando webhooks en HTTPS con allowlist y logs efimeros por sesion.

## Requisitos previos

- Node.js 20.x (recomendado LTS mas reciente).
- npm 10.x.
- Credenciales configuradas en el backend/n8n (AssemblyAI y webhooks).

## Instalacion y scripts

```bash
npm install      # instala dependencias
npm run dev      # modo desarrollo (http://localhost:5173)
npm run build    # compilacion de produccion (dist/)
npm run preview  # sirve la build para verificacion local
```

> **Nota:** el proyecto usa Vite; los scripts asumen que `VITE_` variables viven en `.env` o el entorno de ejecucion.

## Configuracion

La app espera las siguientes variables de entorno (opcional segun despliegue):

| Variable                        | Descripcion                                                                                 |
|---------------------------------|---------------------------------------------------------------------------------------------|
| `VITE_ALLOWED_WEBHOOK_DOMAINS` | Lista separada por comas con dominios permitidos para webhooks (`piloto-n8n.2ppzbm.easypanel.host`, etc.). |

Los siguientes endpoints y credenciales estan fijados desde el backend y aparecen como solo lectura en la UI:

- **AssemblyAI API key**: `b99194c271594e8680dcdcd6102585f7`.
- **Webhook de transcripciones/notas**: `https://piloto-n8n.2ppzbm.easypanel.host/webhook/a9259909-885a-4670-8c65-85036a79b582`.
- **Webhook de paraclinicos**: `https://piloto-n8n.2ppzbm.easypanel.host/webhook/66130711-cac7-4aa0-8b3f-6c3822cb5dde`.

La interfaz solo permite ejecutar pruebas de conexion y ver el estado de verificacion; no se pueden editar estos valores desde el cliente.

## Estructura del proyecto

- `src/App.tsx`: orquestacion de tabs, checklist y flujos clinicos.
- `src/components/`: componentes de configuracion, paneles de flujo y mensajes de estado.
- `src/hooks/`: logica reutilizable para audio, notas, transcripcion y paraclinicos.
- `src/services/`: interaccion con AssemblyAI y webhooks, mas validaciones de seguridad.

## Flujo de trabajo recomendado

1. Ejecutar `npm run dev` y abrir la app.
2. Completar el checklist probando las conexiones de AssemblyAI, webhook principal y paraclinicos.
3. Capturar los datos del encuentro (alias + ID interno) y proceder con grabacion/carga de audio.
4. Transcribir, revisar notas y, cuando este listo, enviar a n8n o cargar paraclinicos.

## Seguridad y mejores practicas

- Todas las solicitudes externas pasan por `ensureSecureWebhookUrl` para validar HTTPS y dominios permitidos.
- Los datos sensibles (audio, transcripciones, notas) solo viven en memoria; al cerrar la pestana se purgan.
- Se recomienda proteger el despliegue detras de SSO/IdP y firmar las solicitudes desde el backend.

## Recursos adicionales

- `GUIA.md`: guia operativa para usuarios clinicos.
- `CLAUDE.md`: documentacion tecnica detallada.
- `HIPAA_CHECKLIST.md`: controles de cumplimiento y proximos pasos.

Para contribuciones, crear PRs con descripciones claras y ejecutar `npm run build` antes de enviar.
