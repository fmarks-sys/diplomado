const API_URL = `${import.meta.env.VITE_API_URL}/api/lectores`;

const getToken = () =>
    localStorage.getItem('token') ||
    localStorage.getItem('user_token') ||
    localStorage.getItem('access_token');

const authHeaders = () => {
    const token = getToken();

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

const handleResponse = async (res) => {
    let data = null;

    try {
        data = await res.json();
    } catch {
        data = null;
    }

    if (!res.ok) {
        if (res.status === 401) {
            throw new Error('Sesión no válida o expirada');
        }

        if (res.status === 403) {
            throw new Error('No tiene permisos para realizar esta operación');
        }

        throw new Error(data?.error || 'Error en la petición');
    }

    return data;
};

// LISTAR
export const getLectores = async () => {
    const res = await fetch(API, {
        headers: authHeaders()
    });

    return handleResponse(res);
};

// CREAR
export const createLector = async (lector) => {
    const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(lector)
    });

    return handleResponse(res);
};

// MODIFICAR
export const updateLector = async (id, lector) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(lector)
    });

    return handleResponse(res);
};

// ELIMINACIÓN FÍSICA
export const deleteLector = async (id) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });

    return handleResponse(res);
};

// CAMBIAR ACTIVO <-> SANCIONADO
export const estadoLector = async (id) => {
    const res = await fetch(`${API}/estado/${id}`, {
        method: 'PATCH',
        headers: authHeaders()
    });

    return handleResponse(res);
};

// PERFIL DEL LECTOR AUTENTICADO
export const getMiPerfil = async () => {
    const res = await fetch(`${API}/mi-perfil`, {
        headers: authHeaders()
    });

    return handleResponse(res);
};
