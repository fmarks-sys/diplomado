const API = 'http://localhost:3000/api/prestamos';

// LISTAR
export const getPrestamos = async () => {
    const res = await fetch(API);
    return await res.json();
};

// CREAR
export const createPrestamo = async (data) => {
    const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
    }

    return await res.json();
};

// DEVOLVER
export const devolverPrestamo = async (id) => {
    await fetch(`${API}/devolver/${id}`, {
        method: 'PATCH'
    });
};