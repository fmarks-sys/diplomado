const API_URL = `${import.meta.env.VITE_API_URL}/api/prestamos`;


// ======================================================
// OBTENER TOKEN
// ======================================================
const getToken = () => {
    return localStorage.getItem('token');
};


// ======================================================
// HEADERS AUTENTICADOS
// ======================================================
const getAuthHeaders = () => {

    const token = getToken();

    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    };
};


// ======================================================
// PROCESAR RESPUESTA
// ======================================================
const handleResponse = async (res) => {

    let data = null;

    try {
        data = await res.json();
    } catch {
        data = null;
    }


    if (!res.ok) {

        if (res.status === 401) {
            throw new Error(
                data?.error ||
                'Sesión expirada o usuario no autenticado'
            );
        }

        if (res.status === 403) {
            throw new Error(
                data?.error ||
                'No tienes permisos para realizar esta operación'
            );
        }

        throw new Error(
            data?.error ||
            'Error al procesar la solicitud'
        );
    }

    return data;
};


// ======================================================
// LISTAR TODOS LOS PRÉSTAMOS
// BIBLIOTECARIO
// ======================================================
export const getPrestamos = async () => {

    const res = await fetch(API, {
        method: 'GET',
        headers: getAuthHeaders()
    });

    return await handleResponse(res);
};


// ======================================================
// CREAR PRÉSTAMO
// BIBLIOTECARIO
// ======================================================
export const createPrestamo = async (data) => {

    const res = await fetch(API, {
        method: 'POST',

        headers: getAuthHeaders(),

        body: JSON.stringify(data)
    });

    return await handleResponse(res);
};


// ======================================================
// DEVOLVER PRÉSTAMO
// BIBLIOTECARIO
// ======================================================
export const devolverPrestamo = async (id) => {

    const res = await fetch(
        `${API}/devolver/${id}`,
        {
            method: 'PATCH',
            headers: getAuthHeaders()
        }
    );

    return await handleResponse(res);
};


// ======================================================
// MIS PRÉSTAMOS
// LECTOR
// ======================================================
export const getMisPrestamos = async () => {

    const res = await fetch(
        `${API}/mis-prestamos`,
        {
            method: 'GET',
            headers: getAuthHeaders()
        }
    );

    return await handleResponse(res);
};


// ======================================================
// MIS ALERTAS
// LECTOR
// ======================================================
export const getMisAlertas = async () => {

    const res = await fetch(
        `${API}/mis-alertas`,
        {
            method: 'GET',
            headers: getAuthHeaders()
        }
    );

    return await handleResponse(res);
};