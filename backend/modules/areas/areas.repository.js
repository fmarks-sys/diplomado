import { pool } from '../../config/db.js';

//listar todas Areas
export const getAllAreas = async () => {
    const result = await pool.query(
        'SELECT * FROM areas_menciones ORDER BY id DESC'
    );
    return result.rows;
};

// LISTAR (solo activos)
export const getAllAreasEstado = async () => {
    const result = await pool.query(
        `SELECT * FROM areas_menciones 
         WHERE estado = 'ACTIVO'
         ORDER BY id DESC`
    );
    return result.rows;
};

//crear area
export const createAreas = async (nombre) => {
    const result = await pool.query(
        'INSERT INTO areas_menciones (nombre) VALUES ($1) RETURNING *',
        [nombre]
    );
    return result.rows[0];
};

//modificaer area
// ACTUALIZAR
export const updateArea = async (id, nombre) => {
    const result = await pool.query(
        `UPDATE areas_menciones 
         SET nombre = $1 
         WHERE id = $2 
         RETURNING *`,
        [nombre, id]
    );
    return result.rows[0];
};

//eliminar forma fisica
export const deletAreas = async (id) => {
    const result = await pool.query(
        'DELETE FROM areas_menciones WHERE id = $1',
        [id]
    );
};

//eliminacion logica
export const disableArea = async (id) => {
    const result = await pool.query(
        `UPDATE areas_menciones
         SET estado = CASE
             WHEN estado = 'ACTIVO' THEN 'INACTIVO'
             ELSE 'ACTIVO'
         END
         WHERE id = $1
         RETURNING *`,
        [id]
    );
    return result.rows[0];
};