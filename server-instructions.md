# 📱 Instrucciones para Acceso Móvil

## Opción 1: Servidor de desarrollo (sin HTTPS - grabación limitada)
```bash
npm run dev -- --host
```
**URL:** http://192.168.0.85:5173

## Opción 2: Servidor HTTPS local (Recomendado)
```bash
npm run build
cd dist
ws --https --hostname 192.168.0.85
```
**URL:** https://192.168.0.85:8000

## Opción 3: Túnel público con ngrok
```bash
# Instalar ngrok
brew install ngrok  # macOS
# o descargar desde https://ngrok.com

# Exponer el puerto
ngrok http 8000
```

## ⚠️ Requisitos importantes:
- Tu celular debe estar en la misma red WiFi
- Para grabación de audio se requiere HTTPS
- Acepta el certificado auto-firmado en el navegador móvil
- Concede permisos de micrófono cuando se solicite

## 🔧 Resolución de problemas:
1. **"No se puede acceder"** → Verifica que estén en la misma red WiFi
2. **"Certificado no válido"** → Dale "Avanzado" y "Continuar al sitio"
3. **"No funciona el micrófono"** → Asegúrate de usar HTTPS
4. **"Página no carga"** → Verifica que el servidor esté corriendo

## 🚀 URL actual:
**HTTPS (recomendado):** https://192.168.0.85:8000