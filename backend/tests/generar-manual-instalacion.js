import { readFile, writeFile } from 'node:fs/promises';
const contenido = [
['Anexo B. Manual de instalación y despliegue','titulo'],
['Sistema de Biblioteca de Ingeniería Informática','subtitulo'],
['B.1 Requisitos','encabezado'],
['Para web y backend: Git, Node.js compatible con Vite 8 y las dependencias del proyecto, pnpm 11.8 o compatible y PostgreSQL. Para reproducir el entorno de pruebas de Node.js se puede utilizar la versión 24 empleada en el desarrollo.'],
['Para Android: Flutter con Dart compatible con sdk ^3.12.2 de pubspec.yaml, Android Studio con Android SDK y un emulador o teléfono. En Windows, agregar la carpeta bin de Flutter al PATH y abrir una terminal nueva.'],
['Comprobar las herramientas con:'],
['git --version\nnode --version\npnpm --version\npsql --version\nflutter --version\nflutter doctor\nflutter doctor --android-licenses','codigo'],
['Resolver los problemas de la sección Android toolchain de flutter doctor antes de compilar el APK. La instalación requiere internet para descargar dependencias.'],
['B.2 Obtener el proyecto y preparar PostgreSQL','encabezado'],
['Clonar el repositorio y entrar en la carpeta obtenida:'],
['git clone https://github.com/fmarks-sys/diplomado.git\ncd diplomado','codigo'],
['Los componentes están en backend/, biblioteca-inf/ y biblioteca_app/. Si se utiliza una copia existente, los comandos deben ejecutarse desde su carpeta raíz.'],
['Crear una base local independiente para desarrollo e importar el esquema y los datos iniciales del sistema. Deben existir las tablas de personas, roles, login, lectores, áreas/menciones, recursos y sus detalles, préstamos y sanciones, además de las tablas auxiliares del catálogo.'],
['En esta revisión no se encontró un archivo .sql en el repositorio. Para una instalación desde cero, el responsable debe proporcionar el esquema SQL o un respaldo compatible. Los siguientes comandos son ejemplos; esquema_biblioteca.sql debe sustituirse por el archivo suministrado:'],
['createdb -U postgres biblioteca_dev\npsql -U postgres -d biblioteca_dev -f esquema_biblioteca.sql','codigo'],
['Preparar los roles BIBLIOTECARIO y LECTOR y cuentas habilitadas de revisión mediante el procedimiento autorizado del proyecto. Las contraseñas de las cuentas se almacenan como hashes bcrypt; no registrar contraseñas en texto plano en password_hash.'],
['B.3 Variables de configuración','encabezado'],
['Crear backend/.env con los valores del entorno local. El siguiente contenido utiliza marcadores y no contiene credenciales reales:'],
['NODE_ENV=development\nPORT=3000\nDB_HOST=localhost\nDB_PORT=5432\nDB_NAME=biblioteca_dev\nDB_USER=USUARIO_POSTGRESQL\nDB_PASSWORD=CLAVE_POSTGRESQL\nJWT_SECRET=SECRETO_PRIVADO_DEL_ENTORNO','codigo'],
['NODE_ENV selecciona el entorno; PORT define el puerto de la API; DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD configuran PostgreSQL; JWT_SECRET firma los tokens de sesión. Sustituir los marcadores por los valores privados correspondientes.'],
['El escaneo con IA requiere GEMINI_API_KEY en el backend. GEMINI_MODEL permite seleccionar el modelo configurado para ese servicio. Si no se configura la clave, el registro manual de recursos sigue disponible. No incorporar esta clave al frontend ni al APK.'],
['Crear biblioteca-inf/.env con la dirección base de la API, sin agregar /api:'],
['VITE_API_URL=http://localhost:3000','codigo'],
['Flutter utiliza API_URL mediante --dart-define. Es una URL pública, no una credencial. Su valor predeterminado apunta al backend de Railway. La app no carga automáticamente biblioteca_app/.env para esta configuración.'],
['Los archivos .env y las claves de firma deben permanecer fuera de Git. VITE_API_URL y API_URL quedan incorporadas en la compilación de cada cliente; cambiar esas direcciones exige recompilar.'],
['B.4 Instalación y ejecución local','encabezado'],
['Backend: desde la raíz del proyecto, abrir una terminal y ejecutar:'],
['cd backend\npnpm install\npnpm dev','codigo'],
['La API inicia en http://localhost:3000 y debe indicar conexión a PostgreSQL development. Para ejecutar sin nodemon, usar pnpm start. Mantener esta terminal abierta.'],
['Frontend: abrir otra terminal desde la raíz del proyecto y ejecutar:'],
['cd biblioteca-inf\npnpm install\npnpm dev','codigo'],
['Abrir la dirección que indique Vite, normalmente http://localhost:5173/login. Para comprobar la compilación, ejecutar pnpm build; el resultado se genera en dist/.'],
['Flutter: abrir otra terminal desde la raíz del proyecto y ejecutar:'],
['cd biblioteca_app\nflutter pub get\nflutter devices\nflutter run --dart-define=API_URL=https://diplomado-production-40c1.up.railway.app','codigo'],
['Con esa URL, la app consume la API desplegada. Iniciar sesión con una cuenta de Bibliotecario habilitada. Si se usa un teléfono o emulador con un backend local, configurar una dirección accesible desde ese dispositivo; localhost dentro de Android no representa la computadora de desarrollo.'],
['B.5 Despliegue de los componentes','encabezado'],
['PostgreSQL en Supabase','subtitulo'],
['Crear o utilizar el proyecto Supabase, aplicar el esquema y los datos iniciales en su PostgreSQL y obtener los parámetros de conexión del proyecto. Configurar esos valores como variables privadas DB_* en Railway. No utilizar la base de producción para las pruebas locales.'],
['El backend activa SSL en producción, pero la configuración actual usa rejectUnauthorized=false y no verifica el certificado del servidor. Debe revisarse esta configuración para una operación institucional.'],
['API en Railway','subtitulo'],
['Conectar el repositorio de GitHub al servicio. Configurar backend como directorio raíz del servicio, instalar las dependencias con pnpm y definir pnpm start como comando de inicio. Cargar NODE_ENV=production, las variables DB_* y JWT_SECRET; agregar GEMINI_API_KEY si se utilizará el escaneo.'],
['El servidor utiliza PORT proporcionado por la plataforma. Generar o utilizar su dominio público y comprobar /api/v1/salud. Railway admite configurar un directorio raíz para componentes separados de un repositorio: https://docs.railway.com/deployments/monorepo.'],
['Frontend en Cloudflare Pages','subtitulo'],
['Conectar el repositorio de GitHub, seleccionar la rama utilizada para producción y configurar biblioteca-inf como directorio raíz. Definir pnpm build como comando de compilación y dist como directorio de salida. Configurar VITE_API_URL=https://diplomado-production-40c1.up.railway.app antes de compilar.'],
['Publicar y comprobar el acceso directo a /login. La configuración build/dist y el despliegue desde Git están descritos en https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/.'],
['Compilar e instalar el APK','subtitulo'],
['Desde biblioteca_app, ejecutar:'],
['flutter pub get\nflutter build apk --release --dart-define=API_URL=https://diplomado-production-40c1.up.railway.app','codigo'],
['El archivo se genera en biblioteca_app/build/app/outputs/flutter-apk/app-release.apk. Transferirlo al teléfono de prueba, permitir la instalación desde la aplicación utilizada para abrirlo cuando Android lo solicite y completar la instalación. Abrir la app y comprobar el login de Bibliotecario.'],
['La configuración actual de release utiliza la clave de depuración. Para distribución institucional, configurar una firma propia y mantener su clave y android/key.properties fuera del repositorio. El enlace público al APK será incorporado por el autor.'],
['B.6 Verificación de instalación','encabezado'],
['1. API: solicitar GET http://localhost:3000/api/v1/salud, o la ruta pública https://diplomado-production-40c1.up.railway.app/api/v1/salud. Se espera HTTP 200 y JSON {"estado":"ok"}. Esta ruta verifica respuesta del servicio; no sustituye la comprobación de la base de datos.'],
['2. Base de datos y autenticación: comprobar el mensaje de conexión del backend e iniciar sesión con cuentas de revisión habilitadas. Verificar que Bibliotecario y Lector muestran sus opciones correspondientes y que se cargan recursos y préstamos.'],
['3. Web: compilar con pnpm build desde biblioteca-inf y comprobar login, catálogo, perfil y las operaciones autorizadas.'],
['4. Android: comprobar instalación del APK, inicio de sesión de Bibliotecario, carga de recursos y cierre de sesión. Para diagnósticos de código, ejecutar flutter analyze y flutter test desde biblioteca_app; registrar sus resultados sin asumir aprobación antes de ejecutarlos.'],
['5. Pruebas nuevas de préstamos: desde backend, ejecutar pnpm test:objetivo4 con PostgreSQL local y NODE_ENV=development. Esta prueba inicia una API temporal y limpia sus fixtures. Reporte: backend/tests/reportes/objetivo4-local.json.'],
['6. Suite local de Newman: instalar Newman si falta con npm install -g newman. Mantener la API local ejecutándose y, desde backend, ejecutar pnpm test:automated. Requiere también PostgreSQL local y NODE_ENV=development. Reporte: backend/tests/reportes/resultado_pruebas.json.'],
['7. Pruebas unitarias de backend: ejecutar node --experimental-vm-modules --test tests/*.test.js desde backend. Conservar el resultado de cada ejecución; un comando documentado no constituye por sí solo evidencia de aprobación.'],
['Las pruebas locales deben permanecer separadas de producción. Los comandos test:deploy:crud operan sobre la base remota con datos ficticios; no forman parte de la verificación básica de instalación.'],
['B.7 Problemas frecuentes y continuidad','encabezado'],
['Comando flutter no reconocido: verificar el PATH, por ejemplo D:\\src\\flutter\\bin, y reiniciar la terminal o el editor.'],
['No conecta PostgreSQL: verificar servicio, base, puerto y variables DB_*. No compartir el contenido de .env para reportar el problema.'],
['No carga el frontend o la APK: comprobar la URL del backend y recompilar si cambió. Si las credenciales son correctas pero la cuenta está restringida, solicitar revisión al responsable.'],
['Revisar los créditos y la vigencia del Trial de Railway y el estado del proyecto Supabase antes de una demostración. Documentar respaldo y recuperación para la operación institucional. Las direcciones públicas deben verificarse tras cada despliegue.'],
['Este anexo describe un procedimiento reproducible según la configuración del código revisado; no registra una nueva instalación ni una nueva ejecución de pruebas.']
];
// Reutilizar el empaquetado y formato del manual de usuario.
let source = await readFile(new URL('./generar-manual-usuario.js',import.meta.url),'utf8');
const inicio=source.indexOf('const contenido = [');
const fin=source.indexOf('const dir = ',inicio);
source=source.slice(0,inicio)+'const contenido = '+JSON.stringify(contenido)+';\n'+source.slice(fin);
source=source.replaceAll('Anexo_A_Manual_usuario','Anexo_B_Manual_instalacion');
source=source.replace("contenido.map(([t,tipo])=>(tipo==='titulo'?", "contenido.map(([t,tipo])=>tipo==='codigo'?'```text\\n'+t+'\\n```':(tipo==='titulo'?");
// Mostrar los saltos de los comandos también en el documento Word.
source=source.replace('${esc(text)}</w:t>', '${esc(text).replaceAll("\\n", "</w:t><w:br/><w:t xml:space=\\"preserve\\">")}</w:t>');
const temporal=new URL('./.manual-instalacion-temporal.mjs',import.meta.url);
await writeFile(temporal,source);
try { await import(temporal.href+'?t='+Date.now()); }
finally { const {unlink}=await import('node:fs/promises');await unlink(temporal); }
