import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getMisPrestamos } from '../../services/prestamosService';
import './misPrestamos.css';

// Mostrar fechas de calendario sin desplazarlas por la zona horaria del navegador.
const mostrarFecha = (valor) => {
    if (!valor) return '—';
    const fecha = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return fecha ? `${fecha[3]}/${fecha[2]}/${fecha[1]}` : '—';
};

const estados = { PRESTADO: 'Pendiente', VENCIDO: 'Vencido', DEVUELTO: 'Devuelto' };
const esPendiente = (prestamo) => ['PRESTADO', 'VENCIDO'].includes(prestamo.estado);

const MisPrestamos = () => {
    const { user } = useAuth();
    const [prestamos, setPrestamos] = useState([]);
    const [vista, setVista] = useState('pendientes');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.rol !== 'LECTOR') return;
        let activo = true;

        getMisPrestamos()
            .then((data) => {
                if (!Array.isArray(data)) throw new Error('Respuesta de préstamos inválida');
                if (activo) setPrestamos(data);
            })
            .catch((err) => {
                if (activo) setError(err.message || 'No se pudieron cargar tus préstamos');
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => { activo = false; };
    }, [user?.rol]);

    if (user?.rol !== 'LECTOR') {
        return <p role="alert">Esta página está disponible para el rol lector.</p>;
    }

    const pendientes = prestamos.filter(esPendiente);
    const devueltos = prestamos.filter((prestamo) => prestamo.estado === 'DEVUELTO');
    const vencidos = prestamos.filter((prestamo) => prestamo.estado === 'VENCIDO');
    const resultados = vista === 'pendientes' ? pendientes
        : vista === 'devueltos' ? devueltos : prestamos;

    return (
        <section className="mis-prestamos" aria-labelledby="mis-prestamos-titulo">
            <header>
                <h1 id="mis-prestamos-titulo">Mis préstamos</h1>
                <p>Revisa tus devoluciones pendientes y el historial de tus préstamos.</p>
            </header>
            {loading ? <p role="status">Cargando tus préstamos...</p> : error ? (
                <p className="mis-prestamos-error" role="alert">{error}</p>
            ) : (
                <>
                    <dl className="mis-prestamos-resumen">
                        <div><dt>Pendientes</dt><dd>{pendientes.length}</dd></div>
                        <div><dt>Vencidos</dt><dd>{vencidos.length}</dd></div>
                        <div><dt>Devueltos</dt><dd>{devueltos.length}</dd></div>
                    </dl>
                    <div className="mis-prestamos-filtros" role="group" aria-label="Filtrar préstamos">
                        {[['pendientes', 'Pendientes'], ['historial', 'Historial completo'], ['devueltos', 'Devueltos']].map(([valor, texto]) => (
                            <button key={valor} type="button" aria-pressed={vista === valor}
                                onClick={() => setVista(valor)}>{texto}</button>
                        ))}
                    </div>
                    <p role="status">{resultados.length} préstamo(s)</p>
                    {resultados.length === 0 ? (
                        <p>{vista === 'pendientes' ? 'No tienes préstamos pendientes.'
                            : vista === 'devueltos' ? 'No tienes préstamos devueltos.'
                                : 'Todavía no tienes préstamos registrados.'}</p>
                    ) : (
                        <div className="mis-prestamos-tabla">
                            <table>
                                <caption>{vista === 'pendientes' ? 'Préstamos pendientes de devolución'
                                    : vista === 'devueltos' ? 'Préstamos devueltos' : 'Historial completo de préstamos'}</caption>
                                <thead><tr>
                                    <th scope="col">Recurso</th><th scope="col">Código</th>
                                    <th scope="col">Tipo de préstamo</th><th scope="col">Fecha de préstamo</th>
                                    <th scope="col">Devolución prevista</th><th scope="col">Devolución realizada</th>
                                    <th scope="col">Estado</th>
                                </tr></thead>
                                <tbody>{resultados.map((prestamo) => (
                                    <tr key={prestamo.id}>
                                        <td>{prestamo.recurso_titulo || '—'}</td>
                                        <td>{prestamo.codigo_topografico || '—'}</td>
                                        <td>{prestamo.tipo_prestamo === 'SALA' ? 'Sala'
                                            : prestamo.tipo_prestamo === 'DOMICILIO' ? 'Domicilio' : prestamo.tipo_prestamo || '—'}</td>
                                        <td>{mostrarFecha(prestamo.fecha_prestamo)}</td>
                                        <td>{mostrarFecha(prestamo.fecha_devolucion_prevista)}</td>
                                        <td>{mostrarFecha(prestamo.fecha_entrega_real)}</td>
                                        <td><span className={`mis-prestamos-estado estado-${String(prestamo.estado).toLowerCase()}`}>
                                            {estados[prestamo.estado] || prestamo.estado || '—'}
                                        </span></td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default MisPrestamos;
