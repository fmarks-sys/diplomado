const API = 'http://localhost:3000/api/recursos';

const handleResponse = async (res) => {
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error en la petición');
    }
    return res.json();
};

// LISTAR
export const getRecursos = async () => {
    const res = await fetch(API);
    return handleResponse(res);
};

// CREAR
export const createRecurso = async (data) => {
    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

// ACTUALIZAR
export const updateRecurso = async (id, data) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return handleResponse(res);
};

//  ELIMINACION FISICA
export const deleteRecurso = async (id) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'DELETE'
    });
    return handleResponse(res);
};

//  ESTADO (TOGGLE)
export const toggleEstadoRecurso = async (id) => {
    const res = await fetch(`${API}/estado/${id}`, {
        method: 'PATCH'
    });
    return handleResponse(res);
};