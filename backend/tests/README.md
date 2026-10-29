# Pruebas de la API

Las rutas de archivos indicadas parten de la ra?z del repositorio. Ejecutar los comandos desde `backend/`, salvo indicaci?n contraria.

## Pruebas automatizadas

Desde la raíz, entrar a la carpeta del backend y ejecutar:

```bash
cd backend
pnpm test:automated
```

El comando ejecuta la colección Postman mediante Newman, muestra los resultados en la terminal y genera `backend/tests/reportes/resultado_pruebas.json`.

Requiere la API ejecutándose en `http://localhost:3000`, PostgreSQL local y
`NODE_ENV=development` en `backend/.env`. Newman debe estar instalado localmente
(`pnpm add -D newman`) o globalmente en Windows (`npm install -g newman`).

La colección es `backend/tests/biblioteca.postman_collection.json`, importable en
Postman. Prueba Salud, Auth, Usuarios, Lectores, Áreas, Recursos y Préstamos,
con ambos roles y casos de éxito, datos inválidos, falta de autenticación,
permisos insuficientes, registros inexistentes y conflictos.

El ejecutor prepara cuentas y datos ficticios con identificadores aleatorios,
pasa credenciales y tokens mediante variables y elimina esos datos al finalizar.
También comprueba disponibilidad, devoluciones, historial, alertas y aislamiento
de los préstamos del lector. Se restringe a API y base locales.

El reporte general y los reportes por módulo (`usuarios.json`, `lectores.json`,
`areas.json`, `recursos.json`, `prestamos.json`) se guardan en
`backend/tests/reportes/`. Incluyen códigos esperados/obtenidos, comprobaciones,
tiempos y resultado de limpieza, sin contraseñas, tokens ni cuerpos de mensajes.
El comando falla si una comprobación o la limpieza falla. Los casos existentes
P-01 y P-02 se conservan para la tabla de pruebas del documento.

Para regenerar el JSON después de editar los casos de los demás módulos:
`node tests/build-modulos-collection.js`, desde `backend/`.

### Salud y Auth: pruebas locales con Newman

Con el servidor ejecutándose en `http://localhost:3000`, PostgreSQL local y
`NODE_ENV=development` en `backend/.env`, ejecutar desde `backend/`:

```bash
pnpm test:salud-auth
```

Requiere Newman instalado localmente (`pnpm add -D newman`) o globalmente en
Windows (`npm install -g newman`). La colección importable en Postman está en
`backend/tests/salud-auth.postman_collection.json` y usa variables para todas
las credenciales y tokens.

El comando crea seis cuentas ficticias temporales para ambos roles y estados,
prueba el registro de una séptima cuenta y elimina únicamente esos registros al
finalizar. No cambia cuentas existentes. Estas pruebas se restringen a API y base
locales; no se ejecutan contra producción.

Reporte para la entrega: `backend/tests/reportes/salud-auth.json`. Contiene casos,
códigos esperados/obtenidos, comprobaciones, tiempos y estado de limpieza, sin
cuerpos de peticiones/respuestas, contraseñas ni tokens. El proceso termina con
error si hay comprobaciones fallidas o si no se completa la limpieza.

### Pruebas del despliegue en producción

Desde `backend/`, ejecutar `pnpm test:deploy`. Usa exclusivamente la API
`https://diplomado-production-40c1.up.railway.app`. Requiere las variables de
entorno de la sesión `E3_PROD_BIBLIOTECARIO_USERNAME`,
`E3_PROD_BIBLIOTECARIO_PASSWORD`, `E3_PROD_LECTOR_USERNAME` y
`E3_PROD_LECTOR_PASSWORD`, con las cuentas ficticias de revisión.
No guardar estas contraseñas en el repositorio.

Colección importable: `backend/tests/deploy-seguro.postman_collection.json`.
Reporte: `backend/tests/reportes/deploy-produccion.json`, separado del reporte
local. Comprueba salud, login, consultas y permisos, sin altas, ediciones o bajas.
El login registra el último acceso. Se omiten consultas de préstamos autorizadas
porque actualizan automáticamente los vencidos. Los casos sin credenciales
quedan pendientes, nunca aprobados.

### Operaciones de producción con datos ficticios

`pnpm test:deploy:crud`, desde `backend/`, ejecuta Usuarios, Lectores, Áreas,
Recursos y Préstamos con registros temporales. **Este comando escribe en
producción**. Usa las mismas cuatro variables de cuentas de revisión anteriores
y la configuración remota `DB_*` comentada en `backend/.env`; no modifica la
configuración local activa.

Antes de crear datos, verifica que los perfiles de ambos roles en la API coincidan
con los de la base remota. Crea identificadores aleatorios, prueba las operaciones
y elimina únicamente sus personas, préstamos, recursos y áreas. La limpieza usa
SQL porque la API no tiene borrado físico de áreas ni préstamos.

Colección: `backend/tests/deploy-crud.postman_collection.json`.
Reporte: `backend/tests/reportes/deploy-crud-produccion.json`. Incluye códigos,
comprobaciones y confirmación de limpieza, sin secretos ni cuerpos de mensajes.
Las consultas que actualizarían préstamos vencidos ajenos a la ejecución se
omiten y se registran como **Omitido**. Las operaciones de préstamo y devolución
se realizan sobre lectores y recursos ficticios.

### Límite de préstamos y sanciones automáticas (objetivo 4)

El backend permite un único préstamo pendiente por lector, incluyendo vencidos.
Un atraso genera una sanción automática hasta devolver el préstamo. Las
restricciones manuales se conservan; el estado efectivo se informa en Lectores
sin sobrescribir su estado manual. La revisión se ejecuta al iniciar el servidor,
cada minuto y en las operaciones de préstamos.

Desde `backend/`, ejecutar `pnpm test:objetivo4` con PostgreSQL local y
`NODE_ENV=development`. La prueba inicia una API temporal, utiliza datos ficticios
y limpia sus registros. Reporte: `backend/tests/reportes/objetivo4-local.json`.
Documentos: `docs/Objetivo4_Evidencias_y_Conclusion.docx` y su versión Markdown.
Estos resultados son locales; las reglas nuevas deben revalidarse tras desplegarlas.
