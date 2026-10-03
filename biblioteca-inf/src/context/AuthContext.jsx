import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest } from '../services/authService.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Recuperar sesión al recargar
    useEffect(() => {
        // AGREGADO: manejar errores si el usuario guardado
        // no contiene un JSON válido.
        try {
            const token = localStorage.getItem('token');

            // AGREGADO: recuperar también los datos del usuario.
            const savedUser = localStorage.getItem('user');

            // CAMBIADO: antes comprobabas únicamente el token.
            if (token && savedUser) {
                // AGREGADO: convertir el JSON en un objeto.
                const parsedUser = JSON.parse(savedUser);

                // AGREGADO: comprobar que contiene un rol.
                if (parsedUser?.rol) {
                    // CAMBIADO: antes era setUser({ token }).
                    // Ahora recuperas el usuario completo, incluido rol.
                    setUser(parsedUser);
                }
            }
        } catch {
            // AGREGADO: limpiar los datos si ocurre un error de lectura.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        } finally {
            // MOVIDO: termina la carga incluso si ocurre un error.
            setLoading(false);
        }
    }, []);

    const login = async (data) => {
        const res = await loginRequest(data);

        localStorage.setItem('token', res.token);

        // AGREGADO: guardar el usuario para recuperarlo al recargar.
        // localStorage guarda texto, por eso usamos JSON.stringify.
        localStorage.setItem('user', JSON.stringify(res.user));

        setUser(res.user);
    };

    const logout = () => {
        localStorage.removeItem('token');

        // AGREGADO: borrar también los datos del usuario al salir.
        localStorage.removeItem('user');

        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};