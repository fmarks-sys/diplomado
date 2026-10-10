import * as repo from './recursos.repository.js';

const errorHttp = (status, message) => Object.assign(new Error(message), { status });
const TIPOS_RECURSO = ['LIBRO', 'TESIS'];
const ESTADOS_RECURSO = ['DISPONIBLE', 'MANTENIMIENTO', 'BAJA'];
const SOPORTES_TESIS = ['EMPASTADO', 'CD', 'DIGITAL', 'AMBOS'];

const normalizarTexto = (valor) =>
    typeof valor === 'string' ? valor.trim() : valor;

const normalizarTipo = (valor) =>
    typeof valor === 'string' ? valor.trim().toUpperCase() : valor;

const validarEnteroPositivo = (valor, campo) => {
    const numero = Number(valor);
    if (!['string', 'number'].includes(typeof valor) || !/^\d+$/.test(String(valor))
        || !Number.isInteger(numero) || numero < 1 || numero > 2147483647) {
        throw errorHttp(400, `${campo} debe ser un número entero mayor o igual a 1`);
    }
    return numero;
};

const prepararRecurso = (data, { actualizando = false } = {}) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw errorHttp(400, 'Datos de recurso requeridos');
    }
    const recurso = { ...data };

    recurso.codigo_topografico = normalizarTexto(recurso.codigo_topografico);
    recurso.titulo = normalizarTexto(recurso.titulo);
    recurso.tipo_recurso = normalizarTipo(recurso.tipo_recurso);

    if (typeof recurso.codigo_topografico !== 'string' || !recurso.codigo_topografico
        || typeof recurso.titulo !== 'string' || !recurso.titulo
        || !recurso.anio_publicacion || !recurso.tipo_recurso) {
        throw errorHttp(400, 'Campos requeridos incompletos o inválidos (código topográfico, título, año y tipo)');
    }

    if (!TIPOS_RECURSO.includes(recurso.tipo_recurso)) {
        throw errorHttp(400, 'tipo_recurso debe ser LIBRO o TESIS');
    }

    const anio = validarEnteroPositivo(recurso.anio_publicacion, 'anio_publicacion');
    recurso.anio_publicacion = anio;

    if (recurso.area_id === '' || recurso.area_id === undefined) {
        recurso.area_id = null;
    } else if (recurso.area_id !== null) {
        const areaId = validarEnteroPositivo(recurso.area_id, 'area_id');
        recurso.area_id = areaId;
    }

    if (recurso.tipo_recurso === 'LIBRO') {
        recurso.autor = normalizarTexto(recurso.autor);
        if (typeof recurso.autor !== 'string' || !recurso.autor) {
            throw errorHttp(400, 'El autor es obligatorio para libros');
        }

        recurso.cantidad_total = validarEnteroPositivo(recurso.cantidad_total ?? 1, 'cantidad_total');
    }

    if (recurso.tipo_recurso === 'TESIS') {
        recurso.autor_postulante = normalizarTexto(recurso.autor_postulante);
        recurso.tutor_guia = normalizarTexto(recurso.tutor_guia);
        recurso.gestion_defensa = normalizarTexto(recurso.gestion_defensa);
        recurso.soporte_fisico = normalizarTipo(recurso.soporte_fisico || 'EMPASTADO');

        if (['autor_postulante', 'tutor_guia', 'gestion_defensa'].some((campo) =>
            typeof recurso[campo] !== 'string' || !recurso[campo])) {
            throw errorHttp(400, 'Autor postulante, tutor guía y gestión de defensa son obligatorios para tesis');
        }

        if (!SOPORTES_TESIS.includes(recurso.soporte_fisico)) {
            throw errorHttp(400, 'soporte_fisico debe ser EMPASTADO, CD, DIGITAL o AMBOS');
        }

        if (recurso.tribunal_jurado === undefined || recurso.tribunal_jurado === null) {
            recurso.tribunal_jurado = [];
        }

        if (!Array.isArray(recurso.tribunal_jurado) || recurso.tribunal_jurado.some((valor) => typeof valor !== 'string')) {
            throw errorHttp(400, 'tribunal_jurado debe ser un arreglo de textos');
        }

        recurso.tribunal_jurado = recurso.tribunal_jurado
            .map(normalizarTexto)
            .filter(Boolean);

        // Regla del módulo: una tesis corresponde a una unidad física/lógica.
        recurso.cantidad_total = 1;
    }

    if (recurso.palabras_clave !== undefined) {
        if (!Array.isArray(recurso.palabras_clave) || recurso.palabras_clave.some((valor) => typeof valor !== 'string')) {
            throw errorHttp(400, 'palabras_clave debe ser un arreglo de textos');
        }
        recurso.palabras_clave = recurso.palabras_clave
            .map((p) => String(p).trim().toUpperCase())
            .filter(Boolean);
    }

    for (const campo of ['isbn', 'editorial', 'edicion', 'url_documento_pdf']) {
        if (recurso[campo] != null && typeof recurso[campo] !== 'string') {
            throw errorHttp(400, `${campo} debe ser texto`);
        }
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
    validarEnteroPositivo(id, 'ID de recurso');
    const recurso = await repo.getRecursoById(id);
    if (!recurso) throw errorHttp(404, 'Recurso no encontrado');
    return recurso;
};

// CREAR
export const addRecurso = async (data) => {
    const recurso = prepararRecurso(data);
    return repo.createRecurso(recurso);
};

// ACTUALIZAR
export const editRecurso = async (id, data) => {
    validarEnteroPositivo(id, 'ID de recurso');
    const recurso = prepararRecurso(data, { actualizando: true });
    const actualizado = await repo.updateRecurso(id, recurso);
    if (!actualizado) throw errorHttp(404, 'Recurso no encontrado');
    return actualizado;
};

// CAMBIAR ESTADO
export const changeEstado = async (id, estado) => {
    validarEnteroPositivo(id, 'ID de recurso');

    const estadoNormalizado = normalizarTipo(estado);
    if (!ESTADOS_RECURSO.includes(estadoNormalizado)) {
        throw errorHttp(400, 'Estado inválido. Use DISPONIBLE, MANTENIMIENTO o BAJA');
    }

    const recurso = await repo.updateEstadoRecurso(id, estadoNormalizado);
    if (!recurso) throw errorHttp(404, 'Recurso no encontrado');
    return recurso;
};

// ELIMINACIÓN FÍSICA (uso administrativo)
export const removeRecurso = async (id) => {
    validarEnteroPositivo(id, 'ID de recurso');
    const eliminado = await repo.deleteRecurso(id);
    if (!eliminado) throw errorHttp(404, 'Recurso no encontrado');
    return eliminado;
};
