# Escaneo bibliográfico asistido por IA (backend local)

Configurar en backend/.env (no compartir ni versionar la clave):

```dotenv
GEMINI_API_KEY=tu_clave
# Opcional:
GEMINI_MODEL=gemini-2.5-flash-lite
```

Iniciar desde backend con pnpm dev. No requiere migraciones ni guarda recursos,
fotografías o resultados en PostgreSQL. La foto se envía a Gemini; el nivel
gratuito puede usar el contenido para mejorar productos. Usar únicamente
portadas o páginas bibliográficas sin datos personales sensibles.

POST http://localhost:3000/api/recursos/escanear

Headers: Authorization: Bearer <JWT de Bibliotecario>, Content-Type: application/json.
El JWT debe provenir del login existente (incluye loginId).

Body:
```json
{
  "mime_type": "image/jpeg",
  "imagen_base64": "<bytes de la foto codificados en Base64, sin prefijo data:>"
}
```

JPEG, PNG y WebP; máximo 3 MiB de imagen, 5 MiB de JSON.
Máximo 5 solicitudes por minuto y usuario por proceso. Este límite se reinicia
al reiniciar Node; para varias réplicas se requiere almacenamiento compartido.
El resto de la API conserva su límite de JSON predeterminado.

Respuesta 200:
```json
{
  "data": {
    "titulo": "Título reconocido",
    "autor": "Autor reconocido",
    "anio_publicacion": 2024,
    "isbn": null
  },
  "campos_no_detectados": ["isbn"],
  "requiere_revision": true,
  "message": "Revisa y corrige los datos reconocidos antes de guardar."
}
```

Campos no visibles o ISBN con formato/dígito de control inválido se devuelven
como null. Si nada es legible, todos los campos quedan null. La IA puede
equivocarse: siempre revisar antes de guardar mediante POST /api/recursos.
En Flutter se mapeará autor a autor_postulante cuando el recurso sea tesis,
sin sobrescribir campos ya completados sin confirmación.

Errores: 400 JSON/Base64 inválido; 401 sin JWT o vencido; 403 rol no autorizado;
413 exceso de tamaño; 415 tipo de imagen o contenido no permitido;
422 imagen no procesable/bloqueada; 429 límite local o cuota Gemini;
502 respuesta inválida/fallo externo; 503 configuración de Gemini;
504 tiempo de espera (25 segundos).

Pruebas locales sin red, claves reales ni base de datos:
```powershell
pnpm test:escaneo
```

Las pruebas simulan Gemini. No validan la clave real ni la calidad de extracción.
Para una prueba real, iniciar el backend y usar Postman con una foto de portada
propia y un JWT Bibliotecario obtenido por el login local.

Referencia de integración: https://ai.google.dev/api/generate-content

