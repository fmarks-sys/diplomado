import { pool } from '../../config/db.js';

// Sincroniza palabras clave N:M dentro de una transacción.
const syncPalabrasClave = async (client, recursoId, palabras = []) => {
    if (!Array.isArray(palabras)) return;

    for (const palabra of palabras) {
        const palabraLimpia = String(palabra).trim().toUpperCase();
        if (!palabraLimpia) continue;

        const result = await client.query(
            `INSERT INTO palabras_clave (palabra)
             VALUES ($1)
             ON CONFLICT (palabra) DO UPDATE SET palabra = EXCLUDED.palabra
             RETURNING id`,
            [palabraLimpia]
        );

        const palabraId = result.rows[0].id;

        await client.query(
            `INSERT INTO recurso_palabras (recurso_id, palabra_id)
             VALUES ($1, $2)
             ON CONFLICT (recurso_id, palabra_id) DO NOTHING`,
            [recursoId, palabraId]
        );
    }
};

const SELECT_RECURSO_COMPLETO = `
    SELECT
        r.*,
        a.nombre AS area_nombre,
        l.isbn,
        l.autor,
        l.editorial,
        l.edicion,
        t.autor_postulante,
        t.tutor_guia,
        t.tribunal_jurado,
        t.gestion_defensa,
        t.soporte_fisico,
        t.url_documento_pdf,
        COALESCE(
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT pc.palabra), NULL),
            '{}'::varchar[]
        ) AS palabras_clave
    FROM recursos r
    LEFT JOIN areas_menciones a ON r.area_id = a.id
    LEFT JOIN libros_detalles l ON r.id = l.recurso_id
    LEFT JOIN tesis_detalles t ON r.id = t.recurso_id
    LEFT JOIN recurso_palabras rp ON r.id = rp.recurso_id
    LEFT JOIN palabras_clave pc ON rp.palabra_id = pc.id
`;

// LISTAR
export const getAllRecursos = async () => {
    const result = await pool.query(`
        ${SELECT_RECURSO_COMPLETO}
        GROUP BY r.id, a.nombre, l.recurso_id, t.recurso_id
        ORDER BY r.id DESC
    `);
    return result.rows;
};

// OBTENER POR ID
export const getRecursoById = async (id) => {
    const result = await pool.query(`
        ${SELECT_RECURSO_COMPLETO}
        WHERE r.id = $1
        GROUP BY r.id, a.nombre, l.recurso_id, t.recurso_id
    `, [id]);

    return result.rows[0] || null;
};

// CREAR
export const createRecurso = async (data) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO recursos
                (codigo_topografico, titulo, anio_publicacion, area_id,
                 tipo_recurso, cantidad_total, cantidad_disponible)
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

        if (data.tipo_recurso === 'LIBRO') {
            await client.query(
                `INSERT INTO libros_detalles
                    (recurso_id, isbn, autor, editorial, edicion)
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
                    (recurso_id, autor_postulante, tutor_guia, tribunal_jurado,
                     gestion_defensa, soporte_fisico, url_documento_pdf)
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

        if (data.palabras_clave !== undefined) {
            await syncPalabrasClave(client, nuevoRecurso.id, data.palabras_clave);
        }

        await client.query('COMMIT');
        return await getRecursoById(nuevoRecurso.id);
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

        const actualResult = await client.query(
            `SELECT id, tipo_recurso, cantidad_total, cantidad_disponible
             FROM recursos
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (actualResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const actual = actualResult.rows[0];
        let cantidadTotal = data.tipo_recurso === 'TESIS' ? 1 : data.cantidad_total;
        let cantidadDisponible;

        // Conserva la cantidad actualmente prestada al modificar el total.
        const cantidadPrestada = actual.cantidad_total - actual.cantidad_disponible;
        if (data.tipo_recurso === 'TESIS') {
            cantidadDisponible = cantidadPrestada > 0 ? 0 : 1;
        } else {
            if (cantidadTotal < cantidadPrestada) {
                throw new Error(`No se puede reducir cantidad_total a ${cantidadTotal}; existen ${cantidadPrestada} ejemplar(es) no disponibles`);
            }
            cantidadDisponible = cantidadTotal - cantidadPrestada;
        }

        const result = await client.query(
            `UPDATE recursos
             SET codigo_topografico = $1,
                 titulo = $2,
                 anio_publicacion = $3,
                 area_id = $4,
                 tipo_recurso = $5,
                 cantidad_total = $6,
                 cantidad_disponible = $7
             WHERE id = $8
             RETURNING *`,
            [
                data.codigo_topografico,
                data.titulo,
                data.anio_publicacion,
                data.area_id,
                data.tipo_recurso,
                cantidadTotal,
                cantidadDisponible,
                id
            ]
        );

        // Mantener un solo subtipo por recurso.
        if (data.tipo_recurso === 'LIBRO') {
            await client.query('DELETE FROM tesis_detalles WHERE recurso_id = $1', [id]);

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
        } else {
            await client.query('DELETE FROM libros_detalles WHERE recurso_id = $1', [id]);

            await client.query(
                `INSERT INTO tesis_detalles
                    (recurso_id, autor_postulante, tutor_guia, tribunal_jurado,
                     gestion_defensa, soporte_fisico, url_documento_pdf)
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

        if (data.palabras_clave !== undefined) {
            await client.query('DELETE FROM recurso_palabras WHERE recurso_id = $1', [id]);
            await syncPalabrasClave(client, id, data.palabras_clave);
        }

        await client.query('COMMIT');
        return await getRecursoById(result.rows[0].id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// CAMBIAR ESTADO
export const updateEstadoRecurso = async (id, estado) => {
    const result = await pool.query(
        `UPDATE recursos
         SET estado = $1
         WHERE id = $2
         RETURNING *`,
        [estado, id]
    );

    return result.rows[0] || null;
};

// ELIMINACIÓN FÍSICA
export const deleteRecurso = async (id) => {
    const result = await pool.query(
        `DELETE FROM recursos
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return result.rows[0] || null;
};
