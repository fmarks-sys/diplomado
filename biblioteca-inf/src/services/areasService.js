const API = 'http://localhost:3000/api/areas';


// ======================================================
// MANEJO GENERAL DE RESPUESTAS
// ======================================================
const handleResponse = async (res) => {

    if (!res.ok) {

        let error;

        try {
            error = await res.json();
        } catch {
            throw new Error('Error en la petición al servidor');
        }

        throw new Error(
            error.error || 'Error en la petición'
        );
    }

    if (res.status === 204) {
        return null;
    }

    return res.json();
};


// ======================================================
// LISTAR TODAS LAS ÁREAS
// Administración
// GET /api/areas
// ======================================================
export const getAreas = async () => {

    const res = await fetch(API);

    return handleResponse(res);
};


// ======================================================
// LISTAR SOLO ÁREAS ACTIVAS
// Selects de recursos, libros, tesis, etc.
// GET /api/areas/activas
// ======================================================
export const getAreasActivas = async () => {

    const res = await fetch(`${API}/activas`);

    return handleResponse(res);
};


// ======================================================
// CREAR ÁREA
// POST /api/areas
// ======================================================
export const createArea = async (nombre) => {

    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const res = await fetch(API, {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            nombre: nombre.trim()
        })
    });

    return handleResponse(res);
};


// ======================================================
// ACTUALIZAR ÁREA
// PUT /api/areas/:id
// ======================================================
export const modArea = async (id, nombre) => {

    if (!id) {
        throw new Error('ID requerido');
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({
            nombre: nombre.trim()
        })
    });

    return handleResponse(res);
};


// ======================================================
// CAMBIAR ESTADO
// ACTIVO <-> INACTIVO
// PATCH /api/areas/:id/estado
// ======================================================
export const cambiarEstadoArea = async (id) => {

    if (!id) {
        throw new Error('ID requerido');
    }

    const res = await fetch(
        `${API}/${id}/estado`,
        {
            method: 'PATCH'
        }
    );

    return handleResponse(res);
};