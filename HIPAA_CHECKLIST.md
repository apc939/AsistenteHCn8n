# Checklist Prioritario HIPAA — Asistente HC

Este checklist prioriza los controles técnicos y operativos necesarios para acercar la app a un alineamiento razonable con HIPAA. Cada ítem indica: prioridad, área responsable, criterio de aceptación y cómo validar.

Prioridades
- P0 (crítico): bloqueante para manejar PHI en producción.
- P1 (alto): reducir riesgo significativo; implementar tras P0.
- P2 (medio): buenas prácticas y madurez operativa.

Áreas
- Cliente: aplicación web (este repo).
- n8n/API: flujo del webhook y servicios receptores.
- Operación: infraestructura, políticas, procesos.

---

## P0 — Críticos (bloqueantes)

1) Transporte seguro extremo a extremo
- Área: n8n/API, Operación, Cliente
- Criterio de aceptación: todo tráfico con PHI viaja por TLS 1.2+; HSTS activo; no contenido mixto; prohíbe `http://` en cualquier endpoint con PHI; certificados válidos y monitoreados.
- Validación: escaneo SSL (Qualys/ssllabs), cabecera HSTS presente, intentos `http://` redirigen a `https://` o son bloqueados.

2) Lista blanca y validación del Webhook
- Área: Cliente, n8n/API
- Criterio de aceptación: la app solo acepta URLs `https://` pertenecientes a dominios preaprobados; se valida formato y se rechaza `http://` o IPs públicas directas sin TLS.
- Validación: intentar configurar URL inválida o `http://` y confirmar que se bloquea.

3) Autenticación y control de acceso (RBAC)
- Área: Cliente, n8n/API
- Criterio de aceptación: acceso a la app protegido por inicio de sesión (SSO/OIDC o equivalente), con roles mínimos necesarios; cierre de sesión e inactividad (15–30 min) con limpieza de datos en memoria.
- Validación: rutas no públicas devuelven 401/403 sin sesión; timeout por inactividad activa.

4) Autenticación/firma de solicitudes a n8n
- Área: n8n/API, Cliente
- Criterio de aceptación: cada POST lleva firma HMAC (cuerpo+timestamp+nonce) o JWT de corta vida; n8n valida y rechaza firmas inválidas o repetidas (replay protection ≤5 min).
- Validación: enviar solicitud sin firma o con timestamp expirado y obtener 401.

5) Minimización de PHI en payloads y nombres de archivo
- Área: Cliente, n8n/API
- Criterio de aceptación: no incluir nombre/cédula del paciente en nombres de archivo ni metadatos si no es estrictamente necesario; usar `encounter_id`/`patient_id` interno. Descargas locales deshabilitables por política.
- Validación: verificar que el nombre del archivo sea UUID/folio, sin PHI; payload usa IDs en lugar de nombre/cédula.

6) Gestión segura de secretos
- Área: n8n/API, Operación
- Criterio de aceptación: no hay tokens/API keys en `localStorage` o código cliente; secretos solo del lado servidor, con rotación y scoping mínimo.
- Validación: revisión de código y variables de entorno; rotación documentada (cada 90 días o ante incidente).

7) Registro y auditoría inmutable
- Área: n8n/API, Operación
- Criterio de aceptación: auditoría centralizada a prueba de manipulación (WORM/tamper‑evident) de: quién accede, qué envía, cuándo y a dónde; retención conforme HIPAA (p. ej., ≥6 años para ciertos registros).
- Validación: consultar auditoría por usuario/rango de fechas y obtener eventos completos con hash/cadena de custodia.

8) Política de retención y borrado seguro
- Área: n8n/API, Operación
- Criterio de aceptación: tiempos definidos para audio/notas; purga automática y verificable; eliminación segura (incluye backups). Documentación y evidencia operativa.
- Validación: tarea programada de purga ejecuta y registra elementos eliminados; prueba de restauración confirma ausencia posterior a vencimiento.

9) Protección de estaciones de trabajo y dispositivos
- Área: Operación
- Criterio de aceptación: cifrado de disco, bloqueo de pantalla automático, antivirus/EDR, parches al día en equipos que acceden a PHI.
- Validación: inventario y verificación de cumplimiento por MDM o checklist trimestral.

10) Acuerdos BAA con proveedores
- Área: Operación
- Criterio de aceptación: BAAs firmados con hosting, correo, almacenamiento, monitoreo y cualquier tercero que toque PHI.
- Validación: repositorio de contratos actualizado; revisión legal completada.

---

## P1 — Altos (robustez y mitigación)

11) CSP estricta y mitigación XSS/CSRF
- Área: Cliente, n8n/API
- Criterio de aceptación: cabecera CSP sin `unsafe-inline`; SRI en recursos; cookies `SameSite=Lax/Strict`; tokens CSRF en endpoints mutadores.
- Validación: escaneo de seguridad (ZAP/Burp) no detecta inline scripts ni CSRF explotables.

12) Límite de tamaño/duración reforzado en servidor
- Área: n8n/API
- Criterio de aceptación: rechaza audios >60 min o >120 MB con 413 o 422; mensajes de error sin filtrar PHI.
- Validación: pruebas con archivos fuera de rango son bloqueadas consistentemente.

13) Rate limiting y antifraude
- Área: n8n/API
- Criterio de aceptación: límites por usuario/IP (p. ej., 60 req/min), con respuestas 429 y backoff exponencial.
- Validación: prueba de estrés alcanza límite y es contenida sin degradar servicio.

14) Validación/esquema de entradas
- Área: n8n/API, Cliente
- Criterio de aceptación: validación por esquema (AJV/Zod) de metadatos; sanitización/escape de salidas en UI; rechazo de claves inesperadas.
- Validación: payload con campos extra o tipos erróneos es rechazado con 400.

15) Controles de sesión y re‑autenticación
- Área: Cliente, n8n/API
- Criterio de aceptación: expiración absoluta y por inactividad; re‑auth para acciones sensibles (enviar/borrar); limpieza de memoria al logout.
- Validación: after idle timeout, envío requiere login.

16) Flags de política de privacidad
- Área: Cliente
- Criterio de aceptación: opciones para deshabilitar descarga local, envío manual, o exigir consentimiento por sesión.
- Validación: al activar políticas, la UI oculta/bloquea acciones y registra la decisión.

17) Seguridad de cabeceras y hardening HTTP
- Área: n8n/API, Operación
- Criterio de aceptación: X-Content-Type-Options, X-Frame-Options/Frame-Options, Referrer-Policy, Permissions-Policy, Strict-Transport-Security correctamente definidos.
- Validación: scanners no reportan faltantes ni valores inseguros.

18) Gestión de identidades y mínimo privilegio
- Área: Operación
- Criterio de aceptación: acceso a n8n y servidores por SSO/MFA; roles mínimos; revisiones trimestrales de acceso.
- Validación: auditoría de cuentas y permisos alineada.

---

## P2 — Medios (madurez y gobierno)

19) Monitoreo y alertas de seguridad
- Área: Operación
- Criterio de aceptación: SIEM/alertas por fallos de autenticación, anomalías de tráfico, cambios de configuración; playbooks de respuesta.
- Validación: simulacros de incidentes registrados y evaluados.

20) Backups cifrados y pruebas de restauración
- Área: Operación
- Criterio de aceptación: backups con cifrado fuerte (AES‑256), llaves en KMS; pruebas de restore al menos semestrales.
- Validación: reporte de prueba de restauración exitoso.

21) Revisión de terceros y pruebas de penetración
- Área: Operación
- Criterio de aceptación: pentest anual y escaneos trimestrales; plan de remediación con fechas.
- Validación: informe y cierre de hallazgos priorizados.

22) Capacitación y políticas HIPAA
- Área: Operación
- Criterio de aceptación: capacitación anual, políticas de uso de dispositivos, manejo de incidentes, y procedimientos documentados.
- Validación: registros de asistencia y aceptación de políticas.

23) Gestión de configuraciones y cambios
- Área: Operación
- Criterio de aceptación: IaC/automatización; revisiones/PRs para cambios; registros de quién, qué y cuándo.
- Validación: trazabilidad de cambios de infraestructura.

24) Detección y limpieza de PHI en logs
- Área: n8n/API, Operación
- Criterio de aceptación: filtros de scrubbing; pruebas unitarias que aseguran no loggear PHI; redacción en herramientas de observabilidad.
- Validación: revisión de muestras de logs en producción.

25) Gestión de proveedores y evaluación de riesgo
- Área: Operación
- Criterio de aceptación: inventario de terceros, evaluación de riesgo, BAAs vigentes, fechas de renovación.
- Validación: tablero de terceros actualizado.

---

## Evidencia actual y brechas observadas (resumen)

- Cliente no persiste PHI; audio, notas, alias y logs solo viven en memoria y ahora se usa `encounter_id` anónimo para payloads y descargas (P0‑5 cumplido).
- Formularios obligan alias + identificador interno y reinician estado seguro entre consultas (bien).
- El cliente valida que el webhook sea `https://`, bloquea IPs directas y permite allowlist vía `VITE_ALLOWED_WEBHOOK_DOMAINS`; falta definir dominios permitidos y aplicar reglas equivalentes del lado n8n/API (P0‑2 parcialmente).
- Persistencia limitada a configuración (bien), pero no existe autenticación ni control de acceso para la app (brecha P0‑3).
- Solicitudes a n8n siguen sin firma/autorización (brecha P0‑4).
- Sin auditoría inmutable ni procesos de retención/purga en backend (brechas P0‑7 y P0‑8).

---

## Plan de implementación sugerido (orden recomendado)

1) P0‑3 y P0‑4: habilitar autenticación (SSO/OIDC) con RBAC mínimo y firma/autorización de solicitudes al webhook.
2) P0‑2: definir la allowlist definitiva (`VITE_ALLOWED_WEBHOOK_DOMAINS`) y replicar validaciones HTTPS/allowlist en n8n/API.
3) P0‑7 y P0‑8: implementar auditoría inmutable y retención/purga automatizada en backend.
4) P1: CSP/CSRF, rate limiting, validación de esquema, hardening de cabeceras.
5) P2: monitoreo/SIEM, backups, pentest, políticas y capacitación.

---

## Notas

- HIPAA exige no solo controles técnicos sino también administrativos: BAAs, evaluaciones de riesgo, políticas, capacitación y planes de respuesta a incidentes.
- La minimización de datos aplica a todo el ciclo: capturar solo lo necesario, transportarlo de forma segura y retenerlo el tiempo justo.
