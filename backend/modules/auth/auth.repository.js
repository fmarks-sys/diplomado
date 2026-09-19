import { pool } from '../../config/db.js';

//exportar funcion buscar usuario por correo
export const findUserByEmail = async (correo) => {
    const result = await pool.query(
        'SELECT * FROM usuarios_sistema WHERE correo = $1',
        [correo]
    );
    return result.rows[0];
};

// funcion crear susrio
//  NUEVO: crear usuario + lector (TRANSACCIÓN)
export const createUserWithLector = async (data) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Crear usuario
        const userRes = await client.query(
            `INSERT INTO usuarios_sistema (nombre, correo, password_hash, rol)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [data.nombre, data.correo, data.password_hash, data.rol]
        );

        const user = userRes.rows[0];

        // 2. Si es LECTOR → crear en tabla lectores
        if (data.rol === 'LECTOR') {
            await client.query(
                `INSERT INTO lectores (
                    usuario_id,
                    ru,
                    ci,
                    nombres,
                    apellidos,
                    correo,
                    telefono,
                    tipo_lector
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                [
                    user.id,
                    data.ru,
                    data.ci,
                    data.nombres,
                    data.apellidos,
                    data.correo,
                    data.telefono,
                    data.tipo_lector
                ]
            );
        }

        await client.query('COMMIT');
        return user;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};