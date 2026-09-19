# biblioteca_app

Aplicación móvil para la consulta de recursos bibliográficos (libros y tesis).


## version y build
* **Versión:** 1.0.0
* **Build (Código de compilación):** 1

## fecha entrega
* 31 de agosto de 2026

## requisitos android
* **Compatibilidad mínima:** Android 5.0 (API 21) o superior.
* **Optimizado para:** Android 14 / 15 (API 34/35).

## si necesita internet
* **Sí.** Requiere conexión a la red local inalámbrica (Hotspot o misma red Wi-Fi) para enviar peticiones HTTP desde el celular hacia el servidor de desarrollo Node.js ejecutado en la laptop (dirección IP del entorno: `192.168.137.1:3000`).


## permisos usados
* `android.permission.INTERNET`: Configurado en el archivo `AndroidManifest.xml` para permitir que el dispositivo móvil consuma las APIs del backend.

## instruccion de instalacion
descargar apk e desacticvar playprotect

## credenciales de Demo
* **Correo:** admin@uajms.edu.bo
* **Correo:** juan@uajms.edu.bo
* **Contraseña:** 123456
* **Rol:** LECTOR / ESTUDIANTE

## funciones principales
* **Inicio de Sesión Seguro:** Control de acceso con roles definidos a través del backend.
* **Búsqueda de Recursos:** Exploración fluida del catálogo de tesis y libros de la biblioteca.
* **Persistencia Local:** Uso de caché local (`shared_preferences`) para mantener las preferencias de la app y la sesión del usuario.
* **Gestión de Préstamos:** Visualización del estado de préstamos, alertas de vencimiento y perfiles personalizados de los lectores.


## limitaciones conocidas
* Por ser una versión de desarrollo local, las peticiones fallarán si el servidor Node.js no está encendido o si el celular pierde conexión con la red local de la laptop.
* No cuenta con firma comercial, por lo que requiere omitir las advertencias del sistema de seguridad de Android (Play Protect) al instalar.

## enlace a repositorio
https://github.com/fmarks-sys/flutter_biblioteca.git