# Sistema de Biblioteca

Sistema web y móvil para gestionar libros, tesis, lectores, usuarios, áreas y préstamos. Incluye autenticación JWT y roles Bibliotecario y Lector. La app Android está dirigida al Bibliotecario e incorpora escaneo bibliográfico asistido por IA.

## Componentes

| Carpeta | Tecnologías |
| --- | --- |
| `backend/` | Node.js, Express, PostgreSQL, JWT y bcryptjs |
| `biblioteca-inf/` | React, Vite y Material UI |
| `biblioteca_app/` | Flutter y Dart |

## Acceso público

- [Aplicación web](https://diplomado-bov.pages.dev/login)
- [Salud de la API](https://diplomado-production-40c1.up.railway.app/api/v1/salud)
- [Releases / APK](https://github.com/fmarks-sys/diplomado/releases)

## Requisitos y configuración

Node.js compatible con el proyecto, pnpm 11.8 o compatible y PostgreSQL con el esquema del sistema cargado. Para Android, Flutter con Dart compatible con `^3.12.2`.

Crear `backend/.env` y sustituir los valores de ejemplo por los del entorno local:

```dotenv
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=biblioteca
DB_USER=tu_usuario
DB_PASSWORD=tu_contrasena
JWT_SECRET=tu_secreto_propio
```

Crear `biblioteca-inf/.env`:

```dotenv
VITE_API_URL=http://localhost:3000
```

Para habilitar el escaneo IA, configurar `GEMINI_API_KEY` únicamente en el backend. No publicar archivos `.env`, claves ni tokens.

## Ejecutar localmente

Desde la raíz del proyecto, usar una terminal independiente para cada componente:

**Backend** — API en `http://localhost:3000`:

```bash
cd backend
pnpm install
pnpm dev
```

**Web** — abrir la dirección indicada por Vite:

```bash
cd biblioteca-inf
pnpm install
pnpm dev
```

**Flutter** — usa Railway por defecto:

```bash
cd biblioteca_app
flutter pub get
flutter run
```

## Pruebas

Desde `backend/`, con API y PostgreSQL locales, `NODE_ENV=development` y Newman instalado:

```bash
pnpm test:automated
```

Reporte: `backend/tests/reportes/resultado_pruebas.json`.

## Documentación

- [Pruebas locales, producción y reportes](backend/tests/README.md)
- [O4 en Postman: preparación y limpieza](backend/tests/POSTMAN-O4.md)
- [Aplicación móvil y compilación del APK](biblioteca_app/README.md)
- [Escaneo bibliográfico con IA](backend/docs/escaneo-ia.md)
