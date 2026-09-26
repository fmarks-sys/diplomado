import { pool } from '../../config/db.js';


// BUSCAR LOGIN POR USERNAME

export const findUserByUsername = async (username) => {

    const result = await pool.query(
        `
        SELECT
            l.id AS login_id,
            l.username,
            l.password_hash,
            l.estado AS estado_login,
            l.ultimo_acceso,

            p.id AS persona_id,
            p.ci,
            p.nombres,
            p.ap,
            p.am,
            p.correo,
            p.telefono,

            r.id AS rol_id,
            r.nombre AS rol

        FROM login l

        INNER JOIN personas p
            ON p.id = l.persona_id

        INNER JOIN roles r
            ON r.id = l.rol_id

        WHERE LOWER(l.username) = LOWER($1)

        LIMIT 1
        `,
        [username]
    );

    return result.rows[0];
};


// BUSCAR PERSONA POR CORREO

export const findPersonByEmail = async (correo) => {

    const result = await pool.query(
        `
        SELECT *
        FROM personas
        WHERE LOWER(correo) = LOWER($1)
        LIMIT 1
        `,
        [correo]
    );

    return result.rows[0];
};


// BUSCAR PERSONA POR CI

export const findPersonByCi = async (ci) => {

    const result = await pool.query(
        `
        SELECT *
        FROM personas
        WHERE ci = $1
        LIMIT 1
        `,
        [ci]
    );

    return result.rows[0];
};


// BUSCAR ROL

export const findRoleByName = async (client, rol) => {

    const result = await client.query(
        `
        SELECT id, nombre, estado
        FROM roles
        WHERE UPPER(nombre) = UPPER($1)
        LIMIT 1
        `,
        [rol]
    );

    return result.rows[0];
};


// CREAR PERSONA + LOGIN
export const createUser = async (data) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');


        // 1. Buscar rol

        const role = await findRoleByName(
            client,
            data.rol
        );

        if (!role) {
            throw new Error('El rol no existe');
        }

        if (role.estado !== 'ACTIVO') {
            throw new Error('El rol está inactivo');
        }


        // 2. Crear persona

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


        // 3. Crear login

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
                role.id,
                data.username,
                data.password_hash
            ]
        );

        const login = loginResult.rows[0];


        await client.query('COMMIT');


        return {
            persona,
            login,
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

export const createLoginForPerson = async (
    personaId,
    data
) => {

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const role = await findRoleByName(
            client,
            data.rol
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
                role.id,
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


// ACTUALIZAR ÚLTIMO ACCESO

export const updateLastAccess = async (loginId) => {

    await pool.query(
        `
        UPDATE login
        SET ultimo_acceso = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [loginId]
    );
};