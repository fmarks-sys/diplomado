const API = `${import.meta.env.VITE_API_URL}/api/usuarios`;

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
});

const handleResponse = async (res) => {
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || 'Error en la petición');
    }

    return data;
};


// LISTAR
export const getUsuarios = async () => {
    const res = await fetch(API, {
        headers: authHeaders()
    });

    return handleResponse(res);
};


// OBTENER UNO
export const getUsuarioById = async (id) => {
    const res = await fetch(`${API}/${id}`, {
        headers: authHeaders()
    });

    return handleResponse(res);
};


// CREAR PERSONA + LOGIN
export const createUsuario = async (data) => {
    const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });

    return handleResponse(res);
};


// DAR LOGIN A PERSONA/LECTOR EXISTENTE
export const createUsuarioFromPersona = async (personaId, data) => {
    const res = await fetch(`${API}/persona/${personaId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });

    return handleResponse(res);
};


// ACTUALIZAR
export const updateUsuario = async (id, data) => {
    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });

    return handleResponse(res);
};


// CAMBIAR CONTRASEÑA
export const changePasswordUsuario = async (id, password) => {
    const res = await fetch(`${API}/${id}/password`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ password })
    });

    return handleResponse(res);
};


// CAMBIAR ESTADO
export const changeEstadoUsuario = async (id, estado) => {
    const res = await fetch(`${API}/${id}/estado`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ estado })
    });

    return handleResponse(res);
};