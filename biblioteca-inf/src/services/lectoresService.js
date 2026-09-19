const API = 'http://localhost:3000/api/lectores';

const handleResponse = async (res) => {
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error en la petición');
    }

    return res.json();
};

// LISTAR
export const getLectores = async () => {
    const res = await fetch(API);
    return handleResponse(res);
};

// CREAR
export const createLector = async (lector) => {
    const res = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lector)
    });

    return handleResponse(res);
};

// MODIFICAR
export const updateLector = async (id, lector) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lector)
    });

    return handleResponse(res);
};

// ELIMINACIÓN FÍSICA
export const deleteLector = async (id) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'DELETE'
    });

    return handleResponse(res);
};

// ELIMINACIÓN LÓGICA
export const estadoLector = async (id) => {
    const res = await fetch(`${API}/estado/${id}`, {
        method: 'PATCH'
    });

    return handleResponse(res);
};