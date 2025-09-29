# Checklist HIPAA Prioritario — Asistente HC (Estado Final)

Este checklist consolida los controles técnicos/operativos necesarios para acercar la app a HIPAA. Se incluye prioridad, responsabilidad, criterio de aceptación, validación sugerida y **estado actual** tras la última iteración.

Prioridades:
- **P0 (crítico)**: bloqueante antes de manejar PHI en producción.
- **P1 (alto)**: reduce riesgo significativo; abordar tras P0.
- **P2 (medio)**: madurez operativa y gobierno.

Áreas:
- **Cliente**: este frontend React.
- **n8n/API**: flujos receptores y servicios downstream.
- **Operación**: infraestructura, políticas, procesos.

---

## P0 — Controles críticos

1. Transporte seguro extremo a extremo
- Área: Cliente, n8n/API, Operación
- Criterio: todo tráfico PHI bajo TLS 1.2+, HSTS, sin contenido mixto. Bloquear `http://`.
- Validación: escaneo SSL (Qualys/ssllabs), cabecera HSTS, intentos `http://` rechazados.
- Estado actual: **Parcial** — el cliente obliga `https://`, pero falta endurecer HSTS y monitoreo continuo del lado servidor.

2. Allowlist y validación de webhook n8n
- Área: Cliente, n8n/API
- Criterio: solo URLs `https://` en dominios preaprobados; sin IPs planas.
- Validación: probar URL `http://`, IP, o dominio fuera de allowlist y confirmar rechazo.
- Estado actual: **Cliente completo**, pendiente replicar allowlist en n8n/API.

3. Autenticación y control de acceso
- Área: Cliente, n8n/API
- Criterio: SSO/OIDC + roles mínimos; cierre por inactividad 15–30 min.
- Validación: intentar acceder sin sesión (401/403), forzar timeout.
- Estado actual: **Brecha** — UI sin autenticación; se debe proteger detrás de identity provider.

4. Firma/autenticación de solicitudes a n8n
- Área: Cliente, n8n/API
- Criterio: firma HMAC o JWT con protección contra replay ≤5 min.
- Validación: enviar sin firma o timestamp vencido ⇒ 401.
- Estado actual: **Brecha** — añadir firma en cliente y validación en n8n.

5. Minimización de PHI en payloads y nombres de archivo
- Área: Cliente, n8n/API
- Criterio: usar `encounter_id`/ID internos; archivos y JSON sin nombres reales.
- Validación: inspeccionar payloads y descargas.
- Estado actual: **Cumplido** — transcripción y paraclínicos usan alias/encounter; nombres sanitizados.

6. Gestión segura de secretos
- Área: n8n/API, Operación
- Criterio: API keys/credenciales fuera del frontend; rotación y scoping mínimo.
- Validación: revisión de repos/configuración; plan de rotación ≤90 días.
- Estado actual: **Brecha** — la API key de AssemblyAI está embebida en el bundle (aunque la UI sea de sólo lectura); moverla a backend/secret manager.

7. Registro y auditoría inmutable
- Área: n8n/API, Operación
- Criterio: log centralizado a prueba de manipulación, retención ≥6 años.
- Validación: consultar auditoría por usuario/fecha con hash/cadena custodia.
- Estado actual: **Brecha** — frontend solo guarda logs efímeros; implementar en backend.

8. Retención y borrado seguro
- Área: n8n/API, Operación
- Criterio: políticas documentadas de purga audio/notas/backups.
- Validación: trabajo programado + evidencia de eliminación.
- Estado actual: **Brecha** — definir en infraestructura/n8n.

9. Protección de estaciones de trabajo
- Área: Operación
- Criterio: cifrado de disco, bloqueo auto, antivirus/EDR, patching.
- Validación: inventario/MDM.
- Estado actual: **Fuera de alcance de este repo** — documentar requisito para clínica.

10. Acuerdos BAA con proveedores
- Área: Operación
- Criterio: BAAs firmados (hosting, AssemblyAI, almacenamiento, monitoreo, etc.).
- Validación: repositorio contractual actualizado.
- Estado actual: **Pendiente** — coordinar con legal/operaciones.

---

## P1 — Controles de robustez

11. CSP estricta y mitigación XSS/CSRF
- Área: Cliente, n8n/API
- Criterio: CSP sin `unsafe-inline`, cookies `SameSite`, tokens CSRF en endpoints.
- Estado actual: **Pendiente** — agregar cabeceras en hosting; revisar componentes para inline scripts.

12. Límite de tamaño/duración reforzado en servidor
- Área: n8n/API
- Criterio: rechazar >60 min o >120 MB con 413/422.
- Estado actual: **Pendiente** — cliente valida, falta endpoint.

13. Rate limiting y antifraude
- Área: n8n/API
- Criterio: rate limit por usuario/IP, respuesta 429, backoff exponencial.
- Estado actual: **Pendiente** — implementar en gateway/n8n.

14. Validación/esquema de entradas
- Área: Cliente, n8n/API
- Criterio: validar payloads con schemas (Zod/AJV), rechazar campos extra.
- Estado actual: **Pendiente** — definir contratos en n8n o servicio intermedio.

15. Controles de sesión e inactividad
- Área: Cliente, n8n/API
- Criterio: expiración absoluta y por idle, re-autenticación para envíos.
- Estado actual: **Brecha** — depende de solución de autenticación.

16. Políticas de privacidad configurables
- Área: Cliente
- Criterio: toggles para deshabilitar descargas, exigir consentimiento por sesión.
- Estado actual: **Parcial** — existen confirmaciones manuales; falta panel de políticas.

17. Hardening HTTP
- Área: n8n/API, Operación
- Criterio: cabeceras `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- Estado actual: **Pendiente** — aplicar en reverse proxy.

18. Gestión de identidades y mínimo privilegio
- Área: Operación
- Criterio: acceso por SSO/MFA, revisiones trimestrales.
- Estado actual: **Pendiente** — parte del roadmap de autenticación.

---

## P2 — Madurez operativa

19. Monitoreo y alertas de seguridad
- Área: Operación
- Criterio: SIEM, alertas de anomalías, playbooks.
- Estado actual: **Pendiente**.

20. Backups cifrados y pruebas de restauración
- Área: Operación
- Criterio: backups cifrados (AES‑256), pruebas de restore semestrales.
- Estado actual: **Pendiente** — dependerá de almacenamiento backend.

21. Pruebas de penetración y escaneos
- Área: Operación
- Criterio: pentest anual, escaneos trimestrales, plan de remediación.
- Estado actual: **Pendiente**.

22. Capacitación y políticas HIPAA
- Área: Operación
- Criterio: training anual, políticas documentadas, firmas de aceptación.
- Estado actual: **Pendiente**.

23. Gestión de configuraciones y cambios
- Área: Operación
- Criterio: IaC, flujos PR, trazabilidad.
- Estado actual: **Pendiente**.

24. Scrubbing de PHI en logs
- Área: n8n/API, Operación
- Criterio: sanitizar logs, pruebas que aseguren no guardar PHI.
- Estado actual: **Pendiente** — frontend evita logs, falta backend.

25. Gestión de proveedores y evaluación de riesgo
- Área: Operación
- Criterio: inventario de terceros, evaluación de riesgo, renovación BAA.
- Estado actual: **Pendiente**.

---

## Evidencia alcanzada y brechas clave

- ✅ Cliente valida `https://`, aplica allowlist y bloquea IPs; todos los envíos usan `encounter_id` y datos anonimizados.
- ✅ Flujos clínicos obligan alias + ID interno, muestran advertencias de privacidad y purgan datos al cerrar sesión/pestaña.
- ✅ Paraclínicos usan metadata anonimizadas y respuesta normalizada; logs efímeros sin PHI.
- ✅ Las credenciales se exponen en modo sólo lectura; las pruebas de conexión no permiten editar endpoints desde el cliente.
- ⚠️ Falta autenticación/SSO, firma de peticiones y gestión de API keys fuera del cliente.
- ⚠️ Auditoría inmutable, retención y controles operativos se deben implementar en backend/infraestructura.

---

## Orden sugerido de siguientes pasos

1. **Autenticación + firma de solicitudes** (P0-3 &amp; P0-4) — bloquear acceso y asegurar n8n.
2. **Política de secretos** — mover API key AssemblyAI a backend / secret manager (cierra P0-6).
3. **Auditoría y retención** — diseñar pipeline WORM y políticas de borrado (P0-7, P0-8).
4. **Hardening de red** — CSP/CSRF, rate limiting, cabeceras de seguridad, allowlist en servidor (P1-11 al P1-17).
5. **Gobierno &amp; monitoreo** — completar P2 (monitoreo, backups, pentest, capacitación).

La aplicación está lista para pruebas internas con transcripciones desidentificadas y envíos seguros a n8n, pero requiere los puntos críticos anteriores antes de exponer PHI real en producción.
