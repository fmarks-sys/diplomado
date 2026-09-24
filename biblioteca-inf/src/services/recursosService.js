const API_URL = `${import.meta.env.VITE_API_URL}/api/recursos`;

const handleResponse = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : null;

    if (!res.ok) {
        throw new Error(data?.error || 'Error en la petición');
    }
    return data;
};

export const getRecursos = async () => handleResponse(await fetch(API));
export const getRecursoById = async (id) => handleResponse(await fetch(`${API}/${id}`));

export const createRecurso = async (data) => handleResponse(await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}));

export const updateRecurso = async (id, data) => handleResponse(await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
}));

export const cambiarEstadoRecurso = async (id, estado) => handleResponse(await fetch(`${API}/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
}));

// Uso administrativo. En operación normal se recomienda estado BAJA.
export const deleteRecurso = async (id) => handleResponse(await fetch(`${API}/${id}`, {
    method: 'DELETE'
}));
