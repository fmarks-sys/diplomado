import * as repo from './areas.repository.js';


// ======================================================
// LISTAR TODAS LAS ÁREAS
// ======================================================
export const listAreas = async () => {
    return await repo.getAllAreas();
};


// ======================================================
// LISTAR SOLO ÁREAS ACTIVAS
// ======================================================
export const listAreasActivas = async () => {
    return await repo.getAllAreasActivas();
};


// ======================================================
// CREAR ÁREA
// ======================================================
export const addArea = async (nombre) => {

    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const nombreNormalizado = nombre
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();

    try {
        return await repo.createArea(nombreNormalizado);

    } catch (error) {

        // PostgreSQL: unique_violation
        if (error.code === '23505') {
            throw new Error('Ya existe un área con ese nombre');
        }

        throw error;
    }
};


// ======================================================
// ACTUALIZAR ÁREA
// ======================================================
export const editArea = async (id, nombre) => {

    if (!id || isNaN(Number(id))) {
        throw new Error('ID de área inválido');
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const nombreNormalizado = nombre
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();

    try {

        const area = await repo.updateArea(
            id,
            nombreNormalizado
        );

        if (!area) {
            throw new Error('Área no encontrada');
        }

        return area;

    } catch (error) {

        // PostgreSQL: unique_violation
        if (error.code === '23505') {
            throw new Error('Ya existe un área con ese nombre');
        }

        throw error;
    }
};


// ======================================================
// CAMBIAR ESTADO
// ACTIVO <-> INACTIVO
// ======================================================
export const changeAreaEstado = async (id) => {

    if (!id || isNaN(Number(id))) {
        throw new Error('ID de área inválido');
    }

    const area = await repo.toggleAreaEstado(id);

    if (!area) {
        throw new Error('Área no encontrada');
    }

    return area;
};