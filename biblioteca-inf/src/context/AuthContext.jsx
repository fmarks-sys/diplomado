import { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest } from '../services/authService.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // estado de la sesion y pagina cargada

    // recuperar sesión al recargar
    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            setUser({ token }); // luego puedes decodificar JWT si quieres
        }
        setLoading(false); //cuando termina
    }, []);

    const login = async (data) => {
        const res = await loginRequest(data);

        localStorage.setItem('token', res.token);
        setUser(res.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};