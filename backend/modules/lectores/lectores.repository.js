import { pool } from '../../config/db.js';

// Listar
export const getAllLectores = async () => {
    const result = await pool.query(`
        SELECT *
        FROM lectores
        ORDER BY id DESC
    `);

    return result.rows;
};

// Crear
export const createLector = async (
    ru,
    ci,
    nombres,
    apellidos,
    correo,
    telefono,
    tipo_lector
) => {

    const result = await pool.query(
        `
        INSERT INTO lectores
        (
            ru,
            ci,
            nombres,
            apellidos,
            correo,
            telefono,
            tipo_lector
        )
        VALUES($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
            ru,
            ci,
            nombres,
            apellidos,
            correo,
            telefono,
            tipo_lector
        ]
    );

    return result.rows[0];
};

// Actualizar
export const updateLector = async (
    id,
    ru,
    ci,
    nombres,
    apellidos,
    correo,
    telefono,
    tipo_lector
) => {

    const result = await pool.query(
        `
        UPDATE lectores
        SET
            ru=$1,
            ci=$2,
            nombres=$3,
            apellidos=$4,
            correo=$5,
            telefono=$6,
            tipo_lector=$7
        WHERE id=$8
        RETURNING *
        `,
        [
            ru,
            ci,
            nombres,
            apellidos,
            correo,
            telefono,
            tipo_lector,
            id
        ]
    );

    return result.rows[0];
};

// Eliminación física
export const deleteLector = async (id) => {

    await pool.query(
        'DELETE FROM lectores WHERE id=$1',
        [id]
    );

};

// Eliminación lógica
export const disableLector = async (id) => {

    const result = await pool.query(
        `
        UPDATE lectores
        SET estado =
            CASE
                WHEN estado='ACTIVO'
                THEN 'SANCIONADO'
                ELSE 'ACTIVO'
            END
        WHERE id=$1
        RETURNING *
        `,
        [id]
    );

    return result.rows[0];
};

//perfil
export const getPerfilByUsuario = async (usuario_id) => {
    const result = await pool.query(`
        SELECT 
            u.id,
            u.nombre,
            u.correo,
            u.rol,
            l.ru,
            l.ci,
            l.nombres,
            l.apellidos,
            l.telefono,
            l.tipo_lector,
            l.estado
        FROM usuarios_sistema u
        LEFT JOIN lectores l ON l.usuario_id = u.id
        WHERE u.id = $1
    `, [usuario_id]);

    return result.rows[0];
};