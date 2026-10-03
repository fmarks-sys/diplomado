const API = `${import.meta.env.VITE_API_URL}/api/recursos`;

// AGREGADO: enviar el token guardado al iniciar sesión.
const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
});

const handleResponse = async (res) => {
    if (res.status === 204) {
        return null;
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
        ? await res.json()
        : null;

    if (!res.ok) {
        throw new Error(data?.error || 'Error en la petición');
    }

    return data;
};

export const getRecursos = async () =>
    handleResponse(await fetch(API, {
        headers: authHeaders()
    }));

export const getRecursoById = async (id) =>
    handleResponse(await fetch(`${API}/${id}`, {
        headers: authHeaders()
    }));

export const createRecurso = async (data) =>
    handleResponse(await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    }));

export const updateRecurso = async (id, data) =>
    handleResponse(await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data)
    }));

export const cambiarEstadoRecurso = async (id, estado) =>
    handleResponse(await fetch(`${API}/${id}/estado`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ estado })
    }));

// Uso administrativo. En operación normal se recomienda estado BAJA.
export const deleteRecurso = async (id) =>
    handleResponse(await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    }));