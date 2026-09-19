import { pool } from '../../config/db.js';

// LISTAR todos los préstamos
export const getAllPrestamos = async () => {
    const result = await pool.query(`
        SELECT 
            p.*,
            l.nombres || ' ' || l.apellidos AS lector_nombre,
            r.titulo AS recurso_titulo
        FROM prestamos p
        JOIN lectores l ON p.lector_id = l.id
        JOIN recursos r ON p.recurso_id = r.id
        ORDER BY p.id DESC
    `);
    return result.rows;
};

// OBTENER RECURSO x ID
export const getRecursoById = async (id) => {
    const res = await pool.query('SELECT * FROM recursos WHERE id = $1', [id]);
    return res.rows[0];
};

// OBTENER LECTOR x ID
export const getLectorById = async (id) => {
    const res = await pool.query('SELECT * FROM lectores WHERE id = $1', [id]);
    return res.rows[0];
};

//Actualizar prestamos vencidos o limite de tiempo
export const updateVencidos = async () => {
    await pool.query(`
        UPDATE prestamos
        SET estado = 'VENCIDO'
        WHERE 
            estado = 'PRESTADO'
            AND fecha_devolucion_prevista < CURRENT_DATE
    `);
};

// CREAR PRÉSTAMO CON TRANSACCIÓN
export const executeCreatePrestamoTx = async (lector_id, recurso_id, fecha, tipo) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción dentro del try

        // Validar si el lector ya tiene este mismo recurso prestado sin devolver
        const prestamoActivo = await client.query(
            `SELECT id FROM prestamos 
             WHERE lector_id = $1 AND recurso_id = $2 AND estado IN ('PRESTADO', 'VENCIDO')`,
            [lector_id, recurso_id]
        );

        if (prestamoActivo.rows.length > 0) {
            throw new Error('El lector ya tiene un préstamo activo de este mismo recurso');
        }

        // Insertar préstamo
        const resPrestamo = await client.query(
            `INSERT INTO prestamos 
            (lector_id, recurso_id, fecha_devolucion_prevista, tipo_prestamo)
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [lector_id, recurso_id, fecha, tipo]
        );

        // Descontar stock
        await client.query(
            `UPDATE recursos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = $1`,
            [recurso_id]
        );

        await client.query('COMMIT');
        return resPrestamo.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release(); //  Siempre se libera la conexión
    }
};

// DEVOLVER PRÉSTAMO CON TRANSACCIÓN
export const executeDevolucionTx = async (id) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const resPrestamo = await client.query(
            `UPDATE prestamos
             SET estado = 'DEVUELTO', fecha_entrega_real = CURRENT_DATE
             WHERE id = $1 AND estado IN ('PRESTADO', 'VENCIDO')
             RETURNING *`,
            [id]
        );

        if (resPrestamo.rows.length === 0) {
            throw new Error('El préstamo no existe o ya fue devuelto');
        }

        const prestamo = resPrestamo.rows[0];

        await client.query(
            `UPDATE recursos SET cantidad_disponible = cantidad_disponible + 1 WHERE id = $1`,
            [prestamo.recurso_id]
        );

        await client.query('COMMIT');
        return prestamo;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

//lector
export const getPrestamosByUsuario = async (usuario_id) => {
    const result = await pool.query(`
        SELECT 
            p.*,
            r.titulo AS recurso_titulo
        FROM prestamos p
        JOIN lectores l ON p.lector_id = l.id
        JOIN recursos r ON p.recurso_id = r.id
        WHERE l.usuario_id = $1
        ORDER BY p.id DESC
    `, [usuario_id]);

    return result.rows;
};

//
export const getAlertasByUsuario = async (usuario_id) => {
    const result = await pool.query(`
        SELECT 
            p.*,
            r.titulo AS recurso_titulo
        FROM prestamos p
        JOIN lectores l ON p.lector_id = l.id
        JOIN recursos r ON p.recurso_id = r.id
        WHERE l.usuario_id = $1
        AND p.estado IN ('PRESTADO', 'VENCIDO')
        AND (
            p.fecha_devolucion_prevista < CURRENT_DATE
            OR p.fecha_devolucion_prevista <= CURRENT_DATE + INTERVAL '2 days'
        )
        ORDER BY p.fecha_devolucion_prevista ASC
    `, [usuario_id]);

    return result.rows;
};