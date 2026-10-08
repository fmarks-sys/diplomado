import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// páginas (crea esto)
import DashboardHome from '../pages/DashboardHome';
import UsuariosPage from '../pages/usuarios/UsuariosPage';
import AreasPage from '../pages/areas/AreasPage';
import RecursosPage from '../pages/recursos/RecursosPage';
import BuscarRecursosLector from '../pages/recursos/buscarRecursosLector';
import LectoresPage from '../pages/lectores/LectoresPage';
import PrestamosPage from '../pages/prestamos/PrestamosPage';
import MisPrestamos from '../pages/prestamos/misPrestamos';
import MiPerfil from '../pages/usuarios/MiPerfil';

const AppRouter = () => {
    const token = localStorage.getItem('token');

    return (
        <BrowserRouter>
            <Routes>

                {/* PUBLIC */}
                <Route path="/login" element={<Login />} />

                {/* PROTECTED */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    {/*  RUTA HIJA */}
                    <Route index element={<DashboardHome />} />
                    <Route path="usuarios" element={<UsuariosPage />} />
                    <Route path="areas" element={<AreasPage />} />
                    <Route path="recursos" element={<RecursosPage />} />
                    <Route path="catalogo" element={<BuscarRecursosLector />} />
                    <Route path="lectores" element={<LectoresPage />} />
                    <Route path="prestamos" element={<PrestamosPage />} />
                    <Route path="mis-prestamos" element={<MisPrestamos />} />
                    <Route path="perfil" element={<MiPerfil />} />


                </Route>

                {/* DEFAULT */}
                <Route
                    path="/"
                    element={
                        token
                            ? <Navigate to="/dashboard" />
                            : <Navigate to="/login" />
                    }
                />

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" />} />

            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
