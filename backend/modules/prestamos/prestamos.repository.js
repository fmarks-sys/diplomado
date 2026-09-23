import { pool } from '../../config/db.js';


// ======================================================
// LISTAR TODOS LOS PRÉSTAMOS
// ======================================================
export const getAllPrestamos = async () => {

    const result = await pool.query(`
        SELECT
            p.*,

            CONCAT_WS(
                ' ',
                pe.nombres,
                pe.ap,
                pe.am
            ) AS lector_nombre,

            l.ru,
            l.tipo_lector,

            r.titulo AS recurso_titulo,
            r.codigo_topografico,
            r.tipo_recurso

        FROM prestamos p

        JOIN lectores l
            ON p.lector_id = l.id

        JOIN personas pe
            ON l.persona_id = pe.id

        JOIN recursos r
            ON p.recurso_id = r.id

        ORDER BY p.id DESC
    `);

    return result.rows;
};


// ======================================================
// OBTENER RECURSO POR ID
// ======================================================
export const getRecursoById = async (id) => {

    const result = await pool.query(
        `
        SELECT *
        FROM recursos
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
};


// ======================================================
// OBTENER LECTOR POR ID
// ======================================================
export const getLectorById = async (id) => {

    const result = await pool.query(
        `
        SELECT *
        FROM lectores
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
};


// ======================================================
// ACTUALIZAR PRÉSTAMOS VENCIDOS
// ======================================================
export const updateVencidos = async () => {

    await pool.query(`
        UPDATE prestamos
        SET estado = 'VENCIDO'
        WHERE estado = 'PRESTADO'
          AND fecha_devolucion_prevista < CURRENT_DATE
    `);
};


// ======================================================
// CREAR PRÉSTAMO CON TRANSACCIÓN
// ======================================================
export const executeCreatePrestamoTx = async (
    lectorId,
    recursoId,
    fechaDevolucionPrevista,
    tipoPrestamo
) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        // ==================================================
        // 1. Verificar que el lector no tenga actualmente
        //    el mismo recurso prestado.
        // ==================================================
        const prestamoActivo = await client.query(
            `
            SELECT id
            FROM prestamos
            WHERE lector_id = $1
              AND recurso_id = $2
              AND estado IN ('PRESTADO', 'VENCIDO')
            LIMIT 1
            `,
            [lectorId, recursoId]
        );


        if (prestamoActivo.rows.length > 0) {

            throw new Error(
                'El lector ya tiene un préstamo activo de este recurso'
            );
        }


        // ==================================================
        // 2. Descontar stock de forma atómica
        // ==================================================
        const stockResult = await client.query(
            `
            UPDATE recursos

            SET cantidad_disponible =
                cantidad_disponible - 1

            WHERE id = $1
              AND estado = 'DISPONIBLE'
              AND cantidad_disponible > 0

            RETURNING
                id,
                cantidad_disponible
            `,
            [recursoId]
        );


        if (stockResult.rows.length === 0) {

            throw new Error(
                'El recurso no tiene unidades disponibles para préstamo'
            );
        }


        // ==================================================
        // 3. Registrar préstamo
        // ==================================================
        const prestamoResult = await client.query(
            `
            INSERT INTO prestamos (
                lector_id,
                recurso_id,
                fecha_devolucion_prevista,
                tipo_prestamo
            )

            VALUES ($1, $2, $3, $4)

            RETURNING *
            `,
            [
                lectorId,
                recursoId,
                fechaDevolucionPrevista,
                tipoPrestamo
            ]
        );


        await client.query('COMMIT');

        return prestamoResult.rows[0];


    } catch (error) {

        await client.query('ROLLBACK');

        throw error;


    } finally {

        client.release();

    }
};


// ======================================================
// DEVOLVER PRÉSTAMO CON TRANSACCIÓN
// ======================================================
export const executeDevolucionTx = async (prestamoId) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        // ==================================================
        // 1. Marcar préstamo como DEVUELTO
        // ==================================================
        const prestamoResult = await client.query(
            `
            UPDATE prestamos

            SET
                estado = 'DEVUELTO',
                fecha_entrega_real = CURRENT_DATE

            WHERE id = $1
              AND estado IN ('PRESTADO', 'VENCIDO')

            RETURNING *
            `,
            [prestamoId]
        );


        if (prestamoResult.rows.length === 0) {

            throw new Error(
                'El préstamo no existe o ya fue devuelto'
            );
        }


        const prestamo = prestamoResult.rows[0];


        // ==================================================
        // 2. Recuperar stock del recurso
        // ==================================================
        const recursoResult = await client.query(
            `
            UPDATE recursos

            SET cantidad_disponible =
                cantidad_disponible + 1

            WHERE id = $1

            RETURNING id
            `,
            [prestamo.recurso_id]
        );


        if (recursoResult.rows.length === 0) {

            throw new Error(
                'No se encontró el recurso asociado al préstamo'
            );
        }


        await client.query('COMMIT');

        return prestamo;


    } catch (error) {

        await client.query('ROLLBACK');

        throw error;


    } finally {

        client.release();

    }
};


// ======================================================
// PRÉSTAMOS DEL LECTOR AUTENTICADO
// ======================================================
//
// El JWT proporciona personaId.
//
// personaId
//    ↓
// lectores.persona_id
//    ↓
// lectores.id
//    ↓
// prestamos.lector_id
//
// ======================================================
export const getPrestamosByPersona = async (personaId) => {

    const result = await pool.query(
        `
        SELECT
            p.*,

            r.titulo AS recurso_titulo,
            r.codigo_topografico,
            r.tipo_recurso

        FROM prestamos p

        JOIN lectores l
            ON p.lector_id = l.id

        JOIN recursos r
            ON p.recurso_id = r.id

        WHERE l.persona_id = $1

        ORDER BY p.id DESC
        `,
        [personaId]
    );

    return result.rows;
};


// ======================================================
// ALERTAS DEL LECTOR AUTENTICADO
// ======================================================
export const getAlertasByPersona = async (personaId) => {

    const result = await pool.query(
        `
        SELECT
            p.*,

            r.titulo AS recurso_titulo,
            r.codigo_topografico,
            r.tipo_recurso,

            CASE

                WHEN p.fecha_devolucion_prevista
                     < CURRENT_DATE
                THEN 'VENCIDO'

                WHEN p.fecha_devolucion_prevista
                     = CURRENT_DATE
                THEN 'VENCE_HOY'

                ELSE 'PROXIMO'

            END AS tipo_alerta,

            (
                p.fecha_devolucion_prevista
                - CURRENT_DATE
            ) AS dias_restantes

        FROM prestamos p

        JOIN lectores l
            ON p.lector_id = l.id

        JOIN recursos r
            ON p.recurso_id = r.id

        WHERE l.persona_id = $1

          AND p.estado IN (
              'PRESTADO',
              'VENCIDO'
          )

          AND p.fecha_devolucion_prevista
              <= CURRENT_DATE + 2

        ORDER BY
            p.fecha_devolucion_prevista ASC
        `,
        [personaId]
    );

    return result.rows;
};