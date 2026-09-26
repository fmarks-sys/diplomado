import { pool } from '../../config/db.js';

// LISTAR TODAS LAS ÁREAS
export const getAllAreas = async () => {
    const result = await pool.query(
        `SELECT id, nombre, estado
         FROM areas_menciones
         ORDER BY id DESC`
    );

    return result.rows;
};


// LISTAR SOLO ÁREAS ACTIVAS
export const getAllAreasActivas = async () => {
    const result = await pool.query(
        `SELECT id, nombre, estado
         FROM areas_menciones
         WHERE estado = 'ACTIVO'
         ORDER BY nombre ASC`
    );

    return result.rows;
};


// BUSCAR ÁREA POR ID
export const getAreaById = async (id) => {
    const result = await pool.query(
        `SELECT id, nombre, estado
         FROM areas_menciones
         WHERE id = $1`,
        [id]
    );

    return result.rows[0];
};


// CREAR ÁREA
export const createArea = async (nombre) => {
    const result = await pool.query(
        `INSERT INTO areas_menciones (nombre)
         VALUES ($1)
         RETURNING id, nombre, estado`,
        [nombre]
    );

    return result.rows[0];
};


// ACTUALIZAR ÁREA
export const updateArea = async (id, nombre) => {
    const result = await pool.query(
        `UPDATE areas_menciones
         SET nombre = $1
         WHERE id = $2
         RETURNING id, nombre, estado`,
        [nombre, id]
    );

    return result.rows[0];
};


// CAMBIAR ESTADO
export const toggleAreaEstado = async (id) => {
    const result = await pool.query(
        `UPDATE areas_menciones
         SET estado = CASE
             WHEN estado = 'ACTIVO' THEN 'INACTIVO'
             ELSE 'ACTIVO'
         END
         WHERE id = $1
         RETURNING id, nombre, estado`,
        [id]
    );

    return result.rows[0];
};

