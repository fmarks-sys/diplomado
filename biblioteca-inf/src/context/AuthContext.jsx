import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from 'react';

import { loginRequest } from '../services/authService.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// AGREGADO: leer el vencimiento del JWT.
// Esto no verifica su firma; esa validación corresponde al backend.
const getExpiration = (token) => {
    try {
        const payload = token.split('.')[1];
        const base64 = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            '='
        );

        const { exp } = JSON.parse(atob(padded));

        return typeof exp === 'number' && Number.isFinite(exp)
            ? exp * 1000
            : 0;
    } catch {
        return 0;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    // Recuperar sesión únicamente si el token sigue vigente.
    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (!token || !savedUser) {
                logout();
                return;
            }

            if (getExpiration(token) <= Date.now()) {
                logout();
                return;
            }

            const parsedUser = JSON.parse(savedUser);

            if (!parsedUser?.username || !parsedUser?.rol) {
                logout();
                return;
            }

            setUser({
                username: parsedUser.username,
                rol: parsedUser.rol
            });
        } catch {
            logout();
        } finally {
            setLoading(false);
        }
    }, [logout]);

    // AGREGADO: cerrar sesión al vencer el token.
    useEffect(() => {
        if (!user) return;

        let timer;

        const checkExpiration = () => {
            clearTimeout(timer);

            const token = localStorage.getItem('token');
            const remaining = getExpiration(token || '') - Date.now();

            if (remaining <= 0) {
                logout();
                return;
            }

            timer = setTimeout(
                checkExpiration,
                Math.min(remaining, 2147483647)
            );
        };

        checkExpiration();

        // Revisar también cuando el navegador vuelve a estar activo.
        window.addEventListener('focus', checkExpiration);
        document.addEventListener(
            'visibilitychange',
            checkExpiration
        );

        return () => {
            clearTimeout(timer);
            window.removeEventListener('focus', checkExpiration);
            document.removeEventListener(
                'visibilitychange',
                checkExpiration
            );
        };
    }, [user, logout]);

    const login = async (data) => {
        const res = await loginRequest(data);

        if (
            getExpiration(res.token || '') <= Date.now() ||
            !res.user?.username ||
            !res.user?.rol
        ) {
            throw new Error('Respuesta de sesión inválida');
        }

        const usuario = {
            username: res.user.username,
            rol: res.user.rol
        };

        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(usuario));

        setUser(usuario);
    };

    return (
        <AuthContext.Provider
            value={{ user, login, logout, loading }}
        >
            {children}
        </AuthContext.Provider>
    );
};