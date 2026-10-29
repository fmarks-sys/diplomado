# Ejecutar los O4 en Postman y obtener capturas

Colección importable: `backend/tests/objetivo4-deploy.postman_collection.json`.
Incluye los 14 casos O4 contra Railway. Ejecutar la colección completa en
orden. Los scripts usan funciones asíncronas y adaptan `pm.sendRequest`
con callbacks para compatibilidad con Newman.

Los datos de atraso no pueden crearse directamente mediante la API: ésta
rechaza fechas anteriores a hoy. Por eso se preparan fixtures propios en
PostgreSQL y se eliminan después. No se reutilizan lectores reales.

## 1. Preparar los datos

Requiere la configuración remota `DB_*` comentada en `backend/.env`, Newman
para el modo automático y una cuenta Bibliotecario habilitada. No cambiar
el entorno local activo ni publicar el `.env`.

Desde `backend/`, en PowerShell:

```powershell
$cuentaO4 = Get-Credential -Message 'Cuenta ficticia Bibliotecario de Railway'
$env:E3_PROD_BIBLIOTECARIO_USERNAME = $cuentaO4.UserName
$env:E3_PROD_BIBLIOTECARIO_PASSWORD = $cuentaO4.GetNetworkCredential().Password
pnpm postman:objetivo4:preparar
Remove-Item Env:E3_PROD_BIBLIOTECARIO_USERNAME
Remove-Item Env:E3_PROD_BIBLIOTECARIO_PASSWORD
Remove-Variable cuentaO4
```

El comando comprueba que la API y PostgreSQL corresponden a la misma cuenta,
crea lectores y recursos ficticios exclusivos, y genera:

`backend/tests/.privado-o4/O4.postman_environment.json`

Este entorno contiene tokens, no claves de PostgreSQL, y está excluido de Git.
Su vigencia de uso es de 45 minutos. Preparar nuevamente si vence; primero
limpiar los fixtures anteriores. Si se cruza la fecha de PostgreSQL, preparar
datos nuevos para el caso que vence hoy.

## 2. Importar y ejecutar

1. En Postman, **Import**, seleccionar la colección
   `objetivo4-deploy.postman_collection.json`.
2. Importar también `.privado-o4/O4.postman_environment.json`.
3. Seleccionar el entorno **O4 Railway - fixtures privados**.
4. Abrir **Run collection**, marcar todos los casos, usar **una iteración**
   y conservar el orden. Ejecutar con la aplicación de escritorio o el agente
   que permita alcanzar la API pública.
5. Capturar el resumen y las aserciones importantes. Los casos contienen
   operaciones dependientes; para repetir el Runner completo, limpiar y
   preparar un conjunto nuevo. No reutilizar los datos consumidos.

O4-03 usa una petición inicial de salud y, en su script, envía dos POST de
préstamo simultáneos. Su comprobación relevante es **Concurrencia: una 201 y
otra 409**, además de **Un único préstamo pendiente**. El 200 de la solicitud
inicial no es el resultado de concurrencia.

## 3. Verificar y limpiar: obligatorio al terminar

Desde `backend/`, incluso si falla el Runner:

```powershell
pnpm postman:objetivo4:limpiar
```

Verifica directamente las sanciones y los estados manuales de los fixtures,
después elimina sus sanciones, préstamos, cuentas, lectores, personas y
recursos. Guarda:

`backend/tests/reportes/objetivo4-postman-verificacion.json`

Si no se ejecutó toda la colección, algunas comprobaciones SQL pueden fallar;
la limpieza se realiza igualmente. Si solo se desea cancelar una preparación,
sin acreditar resultados:

```powershell
pnpm postman:objetivo4:limpiar -- --solo-limpiar
```

Si ocurre un error de conexión durante la limpieza, conservar
`.privado-o4/estado.json`, corregir la conexión y repetir el comando. El
manifiesto impide limpiar una base diferente y permite recuperar los IDs.
Tras finalizar, eliminar también el entorno privado importado en Postman.

## Capturas para el documento

- Resumen del Runner con los 14 casos y las aserciones aprobadas.
- O4-02: 409 y stock conservado.
- O4-03: resultado de las dos solicitudes concurrentes.
- O4-04 y O4-07: estado sancionado y habilitación tras devolver.
- Terminal del comando de limpieza, mostrando las comprobaciones SQL y
  **0 registros ficticios restantes**.

No mostrar el Environment, las cabeceras Authorization, tokens ni credenciales.
La aprobación de las pruebas HTTP y la verificación SQL son evidencias
complementarias. Un Runner verde por sí solo no comprueba los registros de
la tabla sanciones. El contador de solicitudes puede incluir llamadas
auxiliares; el número de escenarios O4 es 14.

## Ejecución automática alternativa

Con las variables de cuenta definidas como en el paso 1:

```powershell
pnpm test:objetivo4:postman
```

Prepara los datos, ejecuta esta misma colección con Newman y verifica/limpia.
Reporte HTTP sanitizado:
`backend/tests/reportes/objetivo4-postman-produccion.json`.
No exporta contraseñas ni tokens a los reportes. Esta ejecución usa nuevos
fixtures y constituye una evidencia distinta de
`objetivo4-produccion.json`, generado con el runner Node.js anterior.
