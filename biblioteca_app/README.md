# Aplicación Biblioteca

APK de acceso exclusivo para BIBLIOTECARIO. Conecta por HTTPS a:
https://diplomado-production-40c1.up.railway.app/api

Requiere internet y Android 7.0 (API 24) o superior.

El login envía username y password a POST /api/auth/login.
El JWT se guarda con flutter_secure_storage; los datos de presentación se
guardan con shared_preferences. Se eliminan los tokens antiguos guardados
en preferencias. La sesión se restaura mientras el JWT siga vigente y
se elimina al cerrar sesión o vencer. La API verifica la firma y los permisos.

El panel usa la paleta institucional UAJMS e Inter incluida en la APK.
Muestra métricas reales, búsqueda y filtros de recursos, préstamos y lectores,
detalles de registros y la cuenta Bibliotecario. Incluye acceso a gestión de
recursos con búsqueda, filtros, páginas de 10 registros, detalles, creación,
edición, cambio de estado y eliminación confirmada. Los formularios incluyen
campos específicos de libros y tesis y áreas obtenidas de la API.
La consulta de préstamos y lectores no incluye formularios de gestión.
Las pantallas de historial, alertas y perfil de lector quedan fuera de las rutas.

Vista previa con datos ficticios: `design/dashboard-preview.png`.
Login: `design/login-preview.png`. Catálogo: `design/recursos-preview.png`.
La recuperación de acceso orienta a contactar al administrador; la API actual
no ofrece un endpoint para restablecer contraseñas desde la APK.

Desde biblioteca_app:

```powershell
flutter pub get
flutter run
flutter build apk --release
```

APK: build/app/outputs/flutter-apk/app-release.apk

Para otro backend (URL pública, sin credenciales):

```powershell
flutter build apk --release --dart-define=API_URL=https://TU-BACKEND.up.railway.app
```

La URL admite el sufijo /api. Usa una cuenta BIBLIOTECARIO existente;
una cuenta LECTOR será rechazada. No incluir claves JWT ni contraseñas
del servidor en la app.

