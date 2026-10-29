import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecursos } from '../services/recursosService';
import { getPrestamos, getMisPrestamos } from '../services/prestamosService';
import { getLectores } from '../services/lectoresService';
import './dashboard.css';

const mostrarFecha = (valor) => {
    if (!valor) return '—';
    const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    return Number.isNaN(fecha.getTime()) ? '—' : fecha.toLocaleDateString('es-BO');
};

function DashboardHome() {
    const { user } = useAuth();
    const rol = user?.rol;
    const esBibliotecario = rol === 'BIBLIOTECARIO';
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;
        if (!['BIBLIOTECARIO', 'LECTOR'].includes(rol)) return;

        const cargar = async () => {
            setDatos(null);
            setError('');
            try {
                const [recursos, prestamos, lectores] = await Promise.all([
                    getRecursos(),
                    rol === 'BIBLIOTECARIO' ? getPrestamos() : getMisPrestamos(),
                    rol === 'BIBLIOTECARIO' ? getLectores() : Promise.resolve([])
                ]);
                if (![recursos, prestamos, lectores].every(Array.isArray)) {
                    throw new Error('No se recibió un listado válido para el dashboard');
                }
                if (activo) setDatos({ rol, recursos, prestamos, lectores });
            } catch (err) {
                if (activo) setError(err.message || 'No se pudo cargar el dashboard');
            }
        };
        void cargar();
        return () => { activo = false; };
    }, [rol]);

    const listo = Boolean(datos && datos.rol === rol);
    const prestamos = listo ? datos.prestamos : [];
    const recientes = [...prestamos]
        .sort((a, b) => String(b.fecha_prestamo || '').localeCompare(String(a.fecha_prestamo || ''))
            || Number(b.id) - Number(a.id))
        .slice(0, 5);

    return (
        <div className="dashboard-home">

            <h1 className="title">Dashboard</h1>

            {error ? <p role="alert">{error}</p> : !listo ? (
                <p role="status">Cargando dashboard...</p>
            ) : (
                <>

                    {/* CARDS */}
                    <div className="cards">

                        <div className="card">
                            <h3>Total Recursos</h3>
                            <p className="value">{datos.recursos.length}</p>
                            <span className="info">Títulos de libros y tesis</span>
                        </div>

                        <div className="card">
                            <h3>{esBibliotecario ? 'Préstamos Activos' : 'Mis préstamos activos'}</h3>
                            <p className="value">{prestamos.filter(p => p.estado === 'PRESTADO').length}</p>
                            <span className="info">Prestados sin vencer</span>
                        </div>

                        <div className="card">
                            <h3>{esBibliotecario ? 'Lectores' : 'Mis devoluciones'}</h3>
                            <p className="value">{esBibliotecario
                                ? datos.lectores.length
                                : prestamos.filter(p => p.estado === 'DEVUELTO').length}</p>
                            <span className="info">{esBibliotecario ? 'Lectores registrados' : 'Préstamos devueltos'}</span>
                        </div>

                        <div className="card warning">
                            <h3>Vencidos</h3>
                            <p className="value">{prestamos.filter(p => p.estado === 'VENCIDO').length}</p>
                            <span className="info">Préstamos atrasados</span>
                        </div>

                    </div>

                    {/* TABLA RECIENTE */}
                    <div className="table-section">
                        <h2>{esBibliotecario ? 'Préstamos recientes' : 'Mis préstamos recientes'}</h2>

                        <table>
                            <thead>
                                <tr>
                                    {esBibliotecario && <th>Lector</th>}
                                    <th>Recurso</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recientes.length === 0 ? (
                                    <tr><td colSpan={esBibliotecario ? 4 : 3}>No hay préstamos registrados.</td></tr>
                                ) : recientes.map(prestamo => (
                                    <tr key={prestamo.id}>
                                        {esBibliotecario && <td>{prestamo.lector_nombre || '—'}</td>}
                                        <td>{prestamo.recurso_titulo || '—'}</td>
                                        <td>{mostrarFecha(prestamo.fecha_prestamo)}</td>
                                        <td><span className={`status ${prestamo.estado === 'VENCIDO' ? 'vencido'
                                            : prestamo.estado === 'PRESTADO' ? 'activo' : ''}`}>
                                            {prestamo.estado || '—'}
                                        </span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

        </div>
    );
}

export default DashboardHome;
