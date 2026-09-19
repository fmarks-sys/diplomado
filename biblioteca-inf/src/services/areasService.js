const API = 'http://localhost:3000/api/areas';

const handleResponse = async (res) => {
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error en la petición');
    }

    if (res.status === 204) return null;

    return res.json();
};

// LISTAR
export const getAreas = async () => {
    const res = await fetch(API);
    return handleResponse(res);
};

// CREAR
export const createArea = async (nombre) => {
    if (!nombre) throw new Error('Nombre requerido');

    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
    });

    return handleResponse(res);
};

// ACTUALIZAR
export const modArea = async (id, nombre) => {
    if (!id) throw new Error('ID requerido');

    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
    });

    return handleResponse(res);
};

// ELIMINAR FÍSICO
export const deleteArea = async (id) => {
    if (!id) throw new Error('ID requerido');

    const res = await fetch(`${API}/${id}`, {
        method: 'DELETE'
    });

    return handleResponse(res);
};

// ELIMINACIÓN LÓGICA
export const estadoDelArea = async (id) => {
    if (!id) throw new Error('ID requerido');

    const res = await fetch(`${API}/estado/${id}`, {
        method: 'PATCH'
    });

    return handleResponse(res);
};