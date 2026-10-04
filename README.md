# Sistema de Biblioteca

Proyecto para gestionar recursos bibliográficos, lectores, usuarios, áreas y préstamos, con autenticación mediante JWT. Incluye una API, una aplicación web y una aplicación Flutter.

## Estructura y tecnologías

| Carpeta | Descripción | Tecnologías principales |
| --- | --- | --- |
| `backend/` | API REST | Node.js, Express 5, PostgreSQL, JWT y bcryptjs |
| `biblioteca-inf/` | Aplicación web | React 19, Vite 8, Material UI y React Router |
| `biblioteca_app/` | Aplicación Flutter | Flutter, Dart, http y shared_preferences |

## Requisitos

- Node.js compatible con las dependencias del proyecto y pnpm 11.8 o compatible.
- PostgreSQL con la base de datos y las tablas del sistema configuradas.
- Flutter con Dart compatible con `^3.12.2`.
- Newman disponible en el entorno para las pruebas de API.

## Configuración

Crear `backend/.env` con los datos de conexión y una clave JWT propia:

```dotenv
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biblioteca
DB_USER=tu_usuario
DB_PASSWORD=tu_contrasena
JWT_SECRET=tu_clave_secreta
```

Crear `biblioteca-inf/.env`:

```dotenv
VITE_API_URL=http://localhost:3000
```

En Flutter, configurar la dirección del backend en `biblioteca_app/lib/config/api_config.dart`. Para un dispositivo físico, reemplazar `192.168.1.XX` por la IP del equipo que ejecuta el backend.

No publicar los archivos `.env` ni credenciales reales.

## Instalación y ejecución

Ejecutar cada componente en una terminal independiente, desde la raíz del proyecto.

**Backend:**

```bash
cd backend
pnpm install
pnpm dev
```

La API inicia por defecto en `http://localhost:3000`. Para iniciarla sin nodemon, usar `pnpm start`.

**Aplicación web:**

```bash
cd biblioteca-inf
pnpm install
pnpm dev
```

Usar `pnpm build` para generar la compilación y `pnpm lint` para revisar el código.

**Aplicación Flutter:**

```bash
cd biblioteca_app
flutter pub get
flutter run
```

## Pruebas automatizadas

Desde la raíz, entrar a la carpeta del backend y ejecutar:

```bash
cd backend
pnpm test:automated
```

El comando ejecuta la colección Postman mediante Newman, muestra los resultados en la terminal y genera `backend/tests/reportes/resultado_pruebas.json`.

Antes de ejecutar, configurar `url_backend` en el script `test:automated` de `backend/package.json` con la URL real de la API. Actualmente contiene `https://railway.app`.
