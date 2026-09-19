import { pool } from '../../config/db.js';

// Función auxiliar para sincronizar Palabras Clave (N:M) dentro de la transacción
const syncPalabrasClave = async (client, recursoId, palabras) => {
    if (!Array.isArray(palabras) || palabras.length === 0) return;

    for (const palabra of palabras) {
        
        // const palabraLimpia = palabra.trim();
        
        // Por (convertir siempre a minúsculas o capitalizar igual):
        const palabraLimpia = palabra.trim().toLowerCase();
        if (!palabraLimpia) continue;

        // 1. Insertar la palabra en 'palabras_clave' si no existe
        await client.query(
            `INSERT INTO palabras_clave (palabra)
             VALUES ($1)
             ON CONFLICT (palabra) DO NOTHING`,
            [palabraLimpia]
        );

        // 2. Obtener el ID de la palabra
        const resPalabra = await client.query(
            `SELECT id FROM palabras_clave WHERE palabra = $1`,
            [palabraLimpia]
        );
        const palabraId = resPalabra.rows[0]?.id;

        if (palabraId) {
            // 3. Crear la relación en 'recurso_palabras'
            await client.query(
                `INSERT INTO recurso_palabras (recurso_id, palabra_id)
                 VALUES ($1, $2)
                 ON CONFLICT (recurso_id, palabra_id) DO NOTHING`,
                [recursoId, palabraId]
            );
        }
    }
};

//  LISTAR (Incluye detalles de Libros, Tesis y Palabras Clave)
export const getAllRecursos = async () => {
    const result = await pool.query(`
        SELECT 
            r.*,
            a.nombre AS area_nombre,
            -- Detalles del Libro
            l.isbn, l.autor, l.editorial, l.edicion,
            -- Detalles de la Tesis
            t.autor_postulante, t.tutor_guia, t.tribunal_jurado, 
            t.gestion_defensa, t.soporte_fisico, t.url_documento_pdf,
            -- Agrupamiento de Palabras Clave como Array nativo de Postgres
            COALESCE(
                ARRAY_REMOVE(ARRAY_AGG(pc.palabra), NULL), 
                '{}'
            ) AS palabras_clave
        FROM recursos r
        LEFT JOIN areas_menciones a ON r.area_id = a.id
        LEFT JOIN libros_detalles l ON r.id = l.recurso_id
        LEFT JOIN tesis_detalles t ON r.id = t.recurso_id
        LEFT JOIN recurso_palabras rp ON r.id = rp.recurso_id
        LEFT JOIN palabras_clave pc ON rp.palabra_id = pc.id
        GROUP BY r.id, a.nombre, l.recurso_id, t.recurso_id
        ORDER BY r.id DESC
    `);
    return result.rows;
};

// CREAR
export const createRecurso = async (data) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Inserción en la tabla base 'recursos'
        const result = await client.query(
            `INSERT INTO recursos 
            (codigo_topografico, titulo, anio_publicacion, area_id, tipo_recurso, cantidad_total, cantidad_disponible)
            VALUES ($1, $2, $3, $4, $5, $6, $6)
            RETURNING *`,
            [
                data.codigo_topografico,
                data.titulo,
                data.anio_publicacion,
                data.area_id,
                data.tipo_recurso,
                data.cantidad_total
            ]
        );

        const nuevoRecurso = result.rows[0];

        // 2. Inserción en la tabla hija según el tipo
        if (data.tipo_recurso === 'LIBRO') {
            await client.query(
                `INSERT INTO libros_detalles (recurso_id, isbn, autor, editorial, edicion)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    nuevoRecurso.id,
                    data.isbn || null,
                    data.autor,
                    data.editorial || null,
                    data.edicion || null
                ]
            );
        } else if (data.tipo_recurso === 'TESIS') {
            await client.query(
                `INSERT INTO tesis_detalles 
                (recurso_id, autor_postulante, tutor_guia, tribunal_jurado, gestion_defensa, soporte_fisico, url_documento_pdf)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    nuevoRecurso.id,
                    data.autor_postulante,
                    data.tutor_guia,
                    data.tribunal_jurado || [],
                    data.gestion_defensa,
                    data.soporte_fisico || 'EMPASTADO',
                    data.url_documento_pdf || null
                ]
            );
        }

        // 3. Procesar y guardar Palabras Clave
        if (data.palabras_clave) {
            await syncPalabrasClave(client, nuevoRecurso.id, data.palabras_clave);
        }

        await client.query('COMMIT');
        return nuevoRecurso;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ACTUALIZAR
export const updateRecurso = async (id, data) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Actualizar tabla base
        const result = await client.query(
            `UPDATE recursos
             SET titulo = $1,
                 anio_publicacion = $2,
                 area_id = $3,
                 tipo_recurso = $4
             WHERE id = $5
             RETURNING *`,
            [data.titulo, data.anio_publicacion, data.area_id, data.tipo_recurso, id]
        );

        // 2. Actualizar o Insertar (Upsert) en tabla hija según el tipo
        if (data.tipo_recurso === 'LIBRO') {
            await client.query(
                `INSERT INTO libros_detalles (recurso_id, isbn, autor, editorial, edicion)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (recurso_id) DO UPDATE SET
                    isbn = EXCLUDED.isbn,
                    autor = EXCLUDED.autor,
                    editorial = EXCLUDED.editorial,
                    edicion = EXCLUDED.edicion`,
                [id, data.isbn || null, data.autor, data.editorial || null, data.edicion || null]
            );
        } else if (data.tipo_recurso === 'TESIS') {
            await client.query(
                `INSERT INTO tesis_detalles 
                (recurso_id, autor_postulante, tutor_guia, tribunal_jurado, gestion_defensa, soporte_fisico, url_documento_pdf)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (recurso_id) DO UPDATE SET
                    autor_postulante = EXCLUDED.autor_postulante,
                    tutor_guia = EXCLUDED.tutor_guia,
                    tribunal_jurado = EXCLUDED.tribunal_jurado,
                    gestion_defensa = EXCLUDED.gestion_defensa,
                    soporte_fisico = EXCLUDED.soporte_fisico,
                    url_documento_pdf = EXCLUDED.url_documento_pdf`,
                [
                    id,
                    data.autor_postulante,
                    data.tutor_guia,
                    data.tribunal_jurado || [],
                    data.gestion_defensa,
                    data.soporte_fisico || 'EMPASTADO',
                    data.url_documento_pdf || null
                ]
            );
        }

        // 3. Sincronizar Palabras Clave (se limpian relaciones viejas y se insertan las nuevas)
        if (data.palabras_clave) {
            await client.query(`DELETE FROM recurso_palabras WHERE recurso_id = $1`, [id]);
            await syncPalabrasClave(client, id, data.palabras_clave);
        }

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// ELIMINACIÓN FÍSICA
export const deleteRecurso = async (id) => {
    await pool.query('DELETE FROM recursos WHERE id = $1', [id]);
};

// ELIMINACIÓN LÓGICA
export const disableRecurso = async (id) => {
    const result = await pool.query(
        `UPDATE recursos
         SET estado = CASE
             WHEN estado = 'DISPONIBLE' THEN 'BAJA'
             ELSE 'DISPONIBLE'
         END
         WHERE id = $1
         RETURNING *`,
        [id]
    );
    return result.rows[0];
};