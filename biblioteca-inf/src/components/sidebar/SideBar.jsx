import { NavLink } from 'react-router-dom';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import HomeIcon from '@mui/icons-material/Home';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import './sideBar.css';

function SideBar() {
    return (
        <aside className="sidebar">
            <h2 className="sidebar-title">Menú</h2>

            <nav>
                <ul className="menu">
                    <li>
                        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
                            <HomeIcon className="icon" />
                            <span>Inicio</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/dashboard/usuarios" className={({ isActive }) => isActive ? 'active' : ''}>
                            <CategoryIcon className="icon" />
                            <span>Usuarios</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/dashboard/areas" className={({ isActive }) => isActive ? 'active' : ''}>
                            <CategoryIcon className="icon" />
                            <span>Areas</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/dashboard/recursos" className={({ isActive }) => isActive ? 'active' : ''}>
                            <MenuBookIcon className="icon" />
                            <span>Recursos</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/dashboard/lectores" className={({ isActive }) => isActive ? 'active' : ''}>
                            <PeopleIcon className="icon" />
                            <span>Lectores</span>
                        </NavLink>
                    </li>

                    <li>
                        <NavLink to="/dashboard/prestamos" className={({ isActive }) => isActive ? 'active' : ''}>
                            <AssignmentIcon className="icon" />
                            <span>Prestamos</span>
                        </NavLink>
                    </li>

                    
                </ul>
            </nav>
        </aside>
    );
}

export default SideBar;