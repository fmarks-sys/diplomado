import { pool } from '../../config/db.js';


// LISTAR USUARIOS

export const findAll = async () => {

    const result = await pool.query(`
        SELECT
            l.id AS login_id,
            l.username,
            l.estado,
            l.ultimo_acceso,
            l.creado_en,

            p.id AS persona_id,
            p.ci,
            p.nombres,
            p.ap,
            p.am,
            p.correo,
            p.telefono,

            r.id AS rol_id,
            r.nombre AS rol,

            CASE
                WHEN le.id IS NOT NULL THEN true
                ELSE false
            END AS es_lector

        FROM login l

        INNER JOIN personas p
            ON p.id = l.persona_id

        INNER JOIN roles r
            ON r.id = l.rol_id

        LEFT JOIN lectores le
            ON le.persona_id = p.id

        ORDER BY p.ap, p.am, p.nombres
    `);

    return result.rows;
};


// BUSCAR USUARIO POR LOGIN ID

export const findById = async (id) => {

    const result = await pool.query(
        `
        SELECT
            l.id AS login_id,
            l.username,
            l.estado,
            l.ultimo_acceso,
            l.creado_en,

            p.id AS persona_id,
            p.ci,
            p.nombres,
            p.ap,
            p.am,
            p.correo,
            p.telefono,

            r.id AS rol_id,
            r.nombre AS rol,

            le.id AS lector_id,
            le.ru,
            le.tipo_lector,
            le.estado AS estado_lector

        FROM login l

        INNER JOIN personas p
            ON p.id = l.persona_id

        INNER JOIN roles r
            ON r.id = l.rol_id

        LEFT JOIN lectores le
            ON le.persona_id = p.id

        WHERE l.id = $1
        `,
        [id]
    );

    return result.rows[0];
};


// BUSCAR PERSONA
// Sirve para convertir un lector existente en usuario.

export const findPersonById = async (personaId) => {

    const result = await pool.query(
        `
        SELECT
            p.*,

            le.id AS lector_id,
            le.ru,
            le.tipo_lector,
            le.estado AS estado_lector

        FROM personas p

        LEFT JOIN lectores le
            ON le.persona_id = p.id

        WHERE p.id = $1
        `,
        [personaId]
    );

    return result.rows[0];
};


export const findPersonByCi = async (ci) => {

    const result = await pool.query(
        `
        SELECT *
        FROM personas
        WHERE ci = $1
        `,
        [ci]
    );

    return result.rows[0];
};


export const findPersonByEmail = async (correo) => {

    const result = await pool.query(
        `
        SELECT *
        FROM personas
        WHERE LOWER(correo) = LOWER($1)
        `,
        [correo]
    );

    return result.rows[0];
};


// VERIFICAR LOGIN DE PERSONA

export const findLoginByPersonId = async (personaId) => {

    const result = await pool.query(
        `
        SELECT *
        FROM login
        WHERE persona_id = $1
        `,
        [personaId]
    );

    return result.rows[0];
};


// VERIFICAR USERNAME

export const findByUsername = async (username) => {

    const result = await pool.query(
        `
        SELECT *
        FROM login
        WHERE LOWER(username) = LOWER($1)
        `,
        [username]
    );

    return result.rows[0];
};


// BUSCAR ROL

export const findRoleById = async (client, rolId) => {

    const result = await client.query(
        `
        SELECT *
        FROM roles
        WHERE id = $1
        `,
        [rolId]
    );

    return result.rows[0];
};


// CREAR PERSONA NUEVA + LOGIN

export const createNewUser = async (data) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        const role = await findRoleById(
            client,
            data.rol_id
        );

        if (!role) {
            throw new Error('El rol no existe');
        }

        if (role.estado !== 'ACTIVO') {
            throw new Error('El rol está inactivo');
        }


        // Crear persona

        const personaResult = await client.query(
            `
            INSERT INTO personas (
                ci,
                nombres,
                ap,
                am,
                correo,
                telefono
            )
            VALUES ($1,$2,$3,$4,$5,$6)

            RETURNING *
            `,
            [
                data.ci,
                data.nombres,
                data.ap,
                data.am,
                data.correo,
                data.telefono || null
            ]
        );

        const persona = personaResult.rows[0];


        // Crear login

        const loginResult = await client.query(
            `
            INSERT INTO login (
                persona_id,
                rol_id,
                username,
                password_hash,
                estado
            )
            VALUES ($1,$2,$3,$4,'ACTIVO')

            RETURNING
                id,
                persona_id,
                rol_id,
                username,
                estado,
                creado_en
            `,
            [
                persona.id,
                data.rol_id,
                data.username,
                data.password_hash
            ]
        );


        await client.query('COMMIT');


        return {
            persona,
            login: loginResult.rows[0],
            rol: role.nombre
        };


    } catch (error) {

        await client.query('ROLLBACK');
        throw error;

    } finally {

        client.release();
    }
};


// CREAR LOGIN PARA PERSONA EXISTENTE

export const createLoginForExistingPerson = async (
    personaId,
    data
) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        const role = await findRoleById(
            client,
            data.rol_id
        );

        if (!role) {
            throw new Error('El rol no existe');
        }

        if (role.estado !== 'ACTIVO') {
            throw new Error('El rol está inactivo');
        }


        const result = await client.query(
            `
            INSERT INTO login (
                persona_id,
                rol_id,
                username,
                password_hash,
                estado
            )
            VALUES ($1,$2,$3,$4,'ACTIVO')

            RETURNING
                id,
                persona_id,
                rol_id,
                username,
                estado,
                creado_en
            `,
            [
                personaId,
                data.rol_id,
                data.username,
                data.password_hash
            ]
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


// MODIFICAR USUARIO

export const updateUser = async (loginId, data) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        const currentResult = await client.query(
            `
            SELECT persona_id
            FROM login
            WHERE id = $1
            `,
            [loginId]
        );


        if (!currentResult.rows[0]) {
            throw new Error('Usuario no encontrado');
        }


        const personaId =
            currentResult.rows[0].persona_id;


        // Actualizar persona

        await client.query(
            `
            UPDATE personas
            SET
                ci = $1,
                nombres = $2,
                ap = $3,
                am = $4,
                correo = $5,
                telefono = $6

            WHERE id = $7
            `,
            [
                data.ci,
                data.nombres,
                data.ap,
                data.am,
                data.correo,
                data.telefono || null,
                personaId
            ]
        );


        // Actualizar login

        await client.query(
            `
            UPDATE login
            SET
                username = $1,
                rol_id = $2
            WHERE id = $3
            `,
            [
                data.username,
                data.rol_id,
                loginId
            ]
        );


        await client.query('COMMIT');


    } catch (error) {

        await client.query('ROLLBACK');
        throw error;

    } finally {

        client.release();
    }
};


// CAMBIAR PASSWORD

export const updatePassword = async (
    loginId,
    passwordHash
) => {

    const result = await pool.query(
        `
        UPDATE login
        SET password_hash = $1
        WHERE id = $2
        RETURNING id
        `,
        [
            passwordHash,
            loginId
        ]
    );

    return result.rows[0];
};


// CAMBIAR ESTADO
export const updateStatus = async (
    loginId,
    estado
) => {

    const result = await pool.query(
        `
        UPDATE login
        SET estado = $1
        WHERE id = $2

        RETURNING
            id,
            username,
            estado
        `,
        [
            estado,
            loginId
        ]
    );

    return result.rows[0];
};