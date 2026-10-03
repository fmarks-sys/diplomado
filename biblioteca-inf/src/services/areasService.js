const API = `${import.meta.env.VITE_API_URL}/api/areas`;

// AGREGADO: obtener el token actual y enviarlo en cada petición.
const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
});

// MANEJO GENERAL DE RESPUESTAS
const handleResponse = async (res) => {
    if (!res.ok) {
        let error;

        try {
            error = await res.json();
        } catch {
            throw new Error('Error en la petición al servidor');
        }

        throw new Error(error.error || 'Error en la petición');
    }

    if (res.status === 204) {
        return null;
    }

    return res.json();
};

// LISTAR TODAS LAS ÁREAS
export const getAreas = async () => {
    const res = await fetch(API, {
        headers: authHeaders()
    });

    return handleResponse(res);
};

// LISTAR SOLO ÁREAS ACTIVAS
export const getAreasActivas = async () => {
    const res = await fetch(`${API}/activas`, {
        headers: authHeaders()
    });

    return handleResponse(res);
};

// CREAR ÁREA
export const createArea = async (nombre) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            nombre: nombre.trim()
        })
    });

    return handleResponse(res);
};

// ACTUALIZAR ÁREA
export const modArea = async (id, nombre) => {
    if (!id) {
        throw new Error('ID requerido');
    }

    if (!nombre || !nombre.trim()) {
        throw new Error('Nombre requerido');
    }

    const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
            nombre: nombre.trim()
        })
    });

    return handleResponse(res);
};

// CAMBIAR ESTADO
export const cambiarEstadoArea = async (id) => {
    if (!id) {
        throw new Error('ID requerido');
    }

    const res = await fetch(`${API}/${id}/estado`, {
        method: 'PATCH',
        headers: authHeaders()
    });

    return handleResponse(res);
};