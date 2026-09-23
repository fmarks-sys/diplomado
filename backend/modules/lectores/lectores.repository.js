import { pool } from '../../config/db.js';

const SELECT_LECTOR = `
    SELECT
        l.id,
        l.persona_id,
        l.ru,
        p.ci,
        p.nombres,
        p.ap,
        p.am,
        p.correo,
        p.telefono,
        l.tipo_lector,
        l.estado,
        l.creado_en
    FROM lectores l
    INNER JOIN personas p ON p.id = l.persona_id
`;

// Listar lectores junto con sus datos personales.
export const getAllLectores = async () => {
    const result = await pool.query(`
        ${SELECT_LECTOR}
        ORDER BY l.id DESC
    `);

    return result.rows;
};

// Crear persona + lector en una sola transacción.
export const createLector = async ({
    ru,
    ci,
    nombres,
    ap,
    am,
    correo,
    telefono,
    tipo_lector
}) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const personaResult = await client.query(
            `
            INSERT INTO personas (ci, nombres, ap, am, correo, telefono)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            `,
            [ci, nombres, ap, am, correo, telefono || null]
        );

        const personaId = personaResult.rows[0].id;

        const lectorResult = await client.query(
            `
            INSERT INTO lectores (persona_id, ru, tipo_lector)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [personaId, ru || null, tipo_lector]
        );

        const result = await client.query(
            `
            ${SELECT_LECTOR}
            WHERE l.id = $1
            `,
            [lectorResult.rows[0].id]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Actualizar persona + lector en una sola transacción.
export const updateLector = async (id, {
    ru,
    ci,
    nombres,
    ap,
    am,
    correo,
    telefono,
    tipo_lector
}) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const lectorActual = await client.query(
            'SELECT persona_id FROM lectores WHERE id = $1',
            [id]
        );

        if (lectorActual.rowCount === 0) {
            const error = new Error('Lector no encontrado');
            error.status = 404;
            throw error;
        }

        const personaId = lectorActual.rows[0].persona_id;

        await client.query(
            `
            UPDATE personas
            SET ci = $1,
                nombres = $2,
                ap = $3,
                am = $4,
                correo = $5,
                telefono = $6
            WHERE id = $7
            `,
            [ci, nombres, ap, am, correo, telefono || null, personaId]
        );

        await client.query(
            `
            UPDATE lectores
            SET ru = $1,
                tipo_lector = $2
            WHERE id = $3
            `,
            [ru || null, tipo_lector, id]
        );

        const result = await client.query(
            `
            ${SELECT_LECTOR}
            WHERE l.id = $1
            `,
            [id]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Eliminación física. La FK persona_id usa ON DELETE CASCADE desde personas hacia lectores,
// pero borrar un lector no borra automáticamente a la persona. Por eso se elimina la persona
// asociada dentro de una transacción.
export const deleteLector = async (id) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            'SELECT persona_id FROM lectores WHERE id = $1',
            [id]
        );

        if (result.rowCount === 0) {
            const error = new Error('Lector no encontrado');
            error.status = 404;
            throw error;
        }

        await client.query('DELETE FROM personas WHERE id = $1', [result.rows[0].persona_id]);

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Alternar ACTIVO <-> SANCIONADO.
export const toggleEstadoLector = async (id) => {
    const result = await pool.query(
        `
        UPDATE lectores
        SET estado = CASE
            WHEN estado = 'ACTIVO' THEN 'SANCIONADO'
            ELSE 'ACTIVO'
        END
        WHERE id = $1
        RETURNING *
        `,
        [id]
    );

    if (result.rowCount === 0) {
        const error = new Error('Lector no encontrado');
        error.status = 404;
        throw error;
    }

    return result.rows[0];
};

// Perfil del lector autenticado.
// Se asume que req.user.id corresponde a login.id, como en el flujo de autenticación actual.
export const getPerfilByUsuario = async (loginId) => {
    const result = await pool.query(
        `
        SELECT
            lo.id AS login_id,
            lo.username,
            lo.estado AS estado_login,
            r.nombre AS rol,
            p.id AS persona_id,
            p.ci,
            p.nombres,
            p.ap,
            p.am,
            p.correo,
            p.telefono,
            l.id AS lector_id,
            l.ru,
            l.tipo_lector,
            l.estado AS estado_lector,
            l.creado_en
        FROM login lo
        INNER JOIN personas p ON p.id = lo.persona_id
        INNER JOIN roles r ON r.id = lo.rol_id
        LEFT JOIN lectores l ON l.persona_id = p.id
        WHERE lo.id = $1
        `,
        [loginId]
    );

    return result.rows[0];
};
