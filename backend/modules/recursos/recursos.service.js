import * as repo from './recursos.repository.js';


// LISTAR
export const listRecursos = async () => {
    return await repo.getAllRecursos();
};


// CREAR
// export const addRecurso = async (data) => {

//     const {
//         codigo_topografico,
//         titulo,
//         anio_publicacion,
//         tipo_recurso
//     } = data;

//     if (!codigo_topografico || !titulo || !anio_publicacion || !tipo_recurso) {
//         throw new Error('Campos requeridos incompletos');
//     }

//     return await repo.createRecurso(data);
// };

//Agregar
export const addRecurso = async (data) => {
    const { codigo_topografico, titulo, anio_publicacion, tipo_recurso } = data;

    // 1. Validaciones base
    if (!codigo_topografico || !titulo || !anio_publicacion || !tipo_recurso) {
        throw new Error('Campos requeridos incompletos (código, título, año y tipo)');
    }

    // 2. Validaciones específicas para LIBRO
    if (tipo_recurso === 'LIBRO') {
        if (!data.autor) {
            throw new Error('El Autor es obligatorio para libros');
        }
    }

    // 3. Validaciones específicas para TESIS
    if (tipo_recurso === 'TESIS') {
        if (!data.autor_postulante || !data.tutor_guia || !data.gestion_defensa) {
            throw new Error('Autor postulante, Tutor y Gestión son obligatorios para Tesis');
        }
        // Por regla de biblioteca, las tesis suelen registrarse con cantidad total de 1
        data.cantidad_total = 1;
    }

    return await repo.createRecurso(data);
};


// ACTUALIZAR
export const editRecurso = async (id, data) => {
    if (!id) throw new Error('ID requerido');

    // Validar autor según tipo en actualización
    if (data.tipo_recurso === 'LIBRO' && !data.autor) {
        throw new Error('El Autor es obligatorio para libros');
    }

    if (data.tipo_recurso === 'TESIS' && (!data.autor_postulante || !data.tutor_guia || !data.gestion_defensa)) {
        throw new Error('Campos de tesis incompletos para actualizar');
    }

    return await repo.updateRecurso(id, data);
};


// ELIMINACION FISICA
export const removeRecurso = async (id) => {

    if (!id) throw new Error('ID requerido');

    return await repo.deleteRecurso(id);
};


// ELIMINACIÓN LÓGICA
export const removeRecursoLogica = async (id) => {

    if (!id) throw new Error('ID requerido');

    return await repo.disableRecurso(id);
};