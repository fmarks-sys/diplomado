import { NavLink } from 'react-router-dom';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { useAuth } from '../../context/AuthContext';

import './sideBar.css';

const opciones = [
    {
        to: '/dashboard',
        texto: 'Inicio',
        Icono: HomeIcon,
        roles: ['BIBLIOTECARIO', 'LECTOR'],
        end: true
    },
    {
        to: '/dashboard/usuarios',
        texto: 'Usuarios',
        Icono: PeopleIcon,
        roles: ['BIBLIOTECARIO']
    },
    {
        to: '/dashboard/areas',
        texto: 'Áreas',
        Icono: CategoryIcon,
        roles: ['BIBLIOTECARIO']
    },
    {
        to: '/dashboard/recursos',
        texto: 'Recursos',
        Icono: MenuBookIcon,
        roles: ['BIBLIOTECARIO']
    },
    {
        to: '/dashboard/lectores',
        texto: 'Lectores',
        Icono: PeopleIcon,
        roles: ['BIBLIOTECARIO']
    },
    {
        to: '/dashboard/prestamos',
        texto: 'Préstamos',
        Icono: AssignmentIcon,
        roles: ['BIBLIOTECARIO']
    },
    {
        to: '/dashboard/catalogo',
        texto: 'Buscar recursos',
        Icono: MenuBookIcon,
        roles: ['LECTOR']
    },
    {
        to: '/dashboard/mis-prestamos',
        texto: 'Mis préstamos',
        Icono: AssignmentIcon,
        roles: ['LECTOR']
    },
    {
        to: '/dashboard/perfil',
        texto: 'Mi perfil',
        Icono: AccountCircleIcon,
        roles: ['BIBLIOTECARIO', 'LECTOR']
    }
];

function SideBar() {
    const { user, loading } = useAuth();
    const rol = user?.rol;

    if (loading) return null;

    return (
        <aside className="sidebar">
            <h2 className="sidebar-title">Menú</h2>

            <nav>
                <ul className="menu">
                    {opciones
                        .filter(opcion => opcion.roles.includes(rol))
                        .map(({ to, texto, Icono, end }) => (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    end={end}
                                    className={({ isActive }) =>
                                        isActive ? 'active' : ''
                                    }
                                >
                                    <Icono className="icon" />
                                    <span>{texto}</span>
                                </NavLink>
                            </li>
                        ))}
                </ul>
            </nav>
        </aside>
    );
}

export default SideBar;
