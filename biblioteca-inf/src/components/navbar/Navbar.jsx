import './navbar.css';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

function Navbar() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const [theme, setTheme] = useState('light');

    // cargar tema guardado
    useEffect(() => {
        const saved = localStorage.getItem('theme') || 'light';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login'); // spa cargado de pagina
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';

        setTheme(newTheme);
        localStorage.setItem('theme', newTheme); //  persistencia
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <header className="navbar">
            <div className="brand">
                <span className="brand-name">Biblioteca Inf</span>
            </div>

            <div className="actions">
                <button
                    className="btn-theme"
                    onClick={toggleTheme}
                    title="Cambiar tema"
                >
                    {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                </button>

                <div className="user-profile">
                    <span className="user-name">
                        {user?.nombre || 'Admin'}
                    </span>

                    <button className="btn-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Navbar;