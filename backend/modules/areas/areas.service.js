import * as repo from './areas.repository.js';

//listar todas las areas
export const listAreas = async () => {
    return await repo.getAllAreas();
};

//agregar una nueva area
export const addAreas = async (nombre) => {
    if (!nombre) throw new Error('Nombre Requerido');

    return await repo.createAreas(nombre);
};

//modificar el area
export const editArea = async (id, nombre) => {
    if (!nombre) throw new Error('Nombre requerido');

    return await repo.updateArea(id, nombre);
};

//eliminacion fisica
export const removeArea = async (id) => {
    return await repo.deletAreas(id);
};

//eliminacion logica
export const removeAreaLogica = async (id) => {
    return await repo.disableArea(id);
};