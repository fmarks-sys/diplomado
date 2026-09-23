import * as repo from './recursos.repository.js';

const TIPOS_RECURSO = ['LIBRO', 'TESIS'];
const ESTADOS_RECURSO = ['DISPONIBLE', 'MANTENIMIENTO', 'BAJA'];
const SOPORTES_TESIS = ['EMPASTADO', 'CD', 'DIGITAL', 'AMBOS'];

const normalizarTexto = (valor) =>
    typeof valor === 'string' ? valor.trim() : valor;

const normalizarTipo = (valor) =>
    typeof valor === 'string' ? valor.trim().toUpperCase() : valor;

const validarEnteroPositivo = (valor, campo) => {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1) {
        throw new Error(`${campo} debe ser un número entero mayor o igual a 1`);
    }
    return numero;
};

const prepararRecurso = (data, { actualizando = false } = {}) => {
    const recurso = { ...data };

    recurso.codigo_topografico = normalizarTexto(recurso.codigo_topografico);
    recurso.titulo = normalizarTexto(recurso.titulo);
    recurso.tipo_recurso = normalizarTipo(recurso.tipo_recurso);

    if (!recurso.codigo_topografico || !recurso.titulo || !recurso.anio_publicacion || !recurso.tipo_recurso) {
        throw new Error('Campos requeridos incompletos (código topográfico, título, año y tipo)');
    }

    if (!TIPOS_RECURSO.includes(recurso.tipo_recurso)) {
        throw new Error('tipo_recurso debe ser LIBRO o TESIS');
    }

    const anio = Number(recurso.anio_publicacion);
    if (!Number.isInteger(anio) || anio < 1) {
        throw new Error('anio_publicacion debe ser un año válido');
    }
    recurso.anio_publicacion = anio;

    if (recurso.area_id === '' || recurso.area_id === undefined) {
        recurso.area_id = null;
    } else if (recurso.area_id !== null) {
        const areaId = Number(recurso.area_id);
        if (!Number.isInteger(areaId) || areaId < 1) {
            throw new Error('area_id no es válido');
        }
        recurso.area_id = areaId;
    }

    if (recurso.tipo_recurso === 'LIBRO') {
        recurso.autor = normalizarTexto(recurso.autor);
        if (!recurso.autor) {
            throw new Error('El autor es obligatorio para libros');
        }

        recurso.cantidad_total = validarEnteroPositivo(recurso.cantidad_total ?? 1, 'cantidad_total');
    }

    if (recurso.tipo_recurso === 'TESIS') {
        recurso.autor_postulante = normalizarTexto(recurso.autor_postulante);
        recurso.tutor_guia = normalizarTexto(recurso.tutor_guia);
        recurso.gestion_defensa = normalizarTexto(recurso.gestion_defensa);
        recurso.soporte_fisico = normalizarTipo(recurso.soporte_fisico || 'EMPASTADO');

        if (!recurso.autor_postulante || !recurso.tutor_guia || !recurso.gestion_defensa) {
            throw new Error('Autor postulante, tutor guía y gestión de defensa son obligatorios para tesis');
        }

        if (!SOPORTES_TESIS.includes(recurso.soporte_fisico)) {
            throw new Error('soporte_fisico debe ser EMPASTADO, CD, DIGITAL o AMBOS');
        }

        if (recurso.tribunal_jurado === undefined || recurso.tribunal_jurado === null) {
            recurso.tribunal_jurado = [];
        }

        if (!Array.isArray(recurso.tribunal_jurado)) {
            throw new Error('tribunal_jurado debe ser un arreglo');
        }

        recurso.tribunal_jurado = recurso.tribunal_jurado
            .map(normalizarTexto)
            .filter(Boolean);

        // Regla del módulo: una tesis corresponde a una unidad física/lógica.
        recurso.cantidad_total = 1;
    }

    if (recurso.palabras_clave !== undefined) {
        if (!Array.isArray(recurso.palabras_clave)) {
            throw new Error('palabras_clave debe ser un arreglo');
        }
        recurso.palabras_clave = recurso.palabras_clave
            .map((p) => String(p).trim().toUpperCase())
            .filter(Boolean);
    }

    if (actualizando && recurso.cantidad_disponible !== undefined) {
        delete recurso.cantidad_disponible;
    }

    return recurso;
};

// LISTAR
export const listRecursos = async () => repo.getAllRecursos();

// OBTENER POR ID
export const findRecursoById = async (id) => {
    if (!id) throw new Error('ID requerido');
    const recurso = await repo.getRecursoById(id);
    if (!recurso) throw new Error('Recurso no encontrado');
    return recurso;
};

// CREAR
export const addRecurso = async (data) => {
    const recurso = prepararRecurso(data);
    return repo.createRecurso(recurso);
};

// ACTUALIZAR
export const editRecurso = async (id, data) => {
    if (!id) throw new Error('ID requerido');
    const recurso = prepararRecurso(data, { actualizando: true });
    const actualizado = await repo.updateRecurso(id, recurso);
    if (!actualizado) throw new Error('Recurso no encontrado');
    return actualizado;
};

// CAMBIAR ESTADO
export const changeEstado = async (id, estado) => {
    if (!id) throw new Error('ID requerido');

    const estadoNormalizado = normalizarTipo(estado);
    if (!ESTADOS_RECURSO.includes(estadoNormalizado)) {
        throw new Error('Estado inválido. Use DISPONIBLE, MANTENIMIENTO o BAJA');
    }

    const recurso = await repo.updateEstadoRecurso(id, estadoNormalizado);
    if (!recurso) throw new Error('Recurso no encontrado');
    return recurso;
};

// ELIMINACIÓN FÍSICA (uso administrativo)
export const removeRecurso = async (id) => {
    if (!id) throw new Error('ID requerido');
    const eliminado = await repo.deleteRecurso(id);
    if (!eliminado) throw new Error('Recurso no encontrado');
    return eliminado;
};
