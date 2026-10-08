import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRecursos } from '../../services/recursosService';
import './buscarRecursosLector.css';

const normalizar = (valor) => String(valor ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const disponibilidad = (recurso) => {
    if (recurso.estado === 'BAJA') return 'Baja';
    if (recurso.estado === 'MANTENIMIENTO') return 'En mantenimiento';
    if (recurso.estado !== 'DISPONIBLE') return 'No disponible';
    return Number(recurso.cantidad_disponible) > 0 ? 'Disponible' : 'Sin ejemplares disponibles';
};

const BuscarRecursosLector = () => {
    const { user } = useAuth();
    const [recursos, setRecursos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [soloDisponibles, setSoloDisponibles] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.rol !== 'LECTOR') return;
        let activo = true;

        getRecursos()
            .then((data) => {
                if (!Array.isArray(data)) throw new Error('Respuesta de recursos inválida');
                if (activo) setRecursos(data);
            })
            .catch((err) => {
                if (activo) setError(err.message || 'No se pudieron cargar los recursos');
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => { activo = false; };
    }, [user?.rol]);

    if (user?.rol !== 'LECTOR') {
        return <p role="alert">Esta página está disponible para el rol lector.</p>;
    }

    const termino = normalizar(busqueda.trim());
    const resultados = recursos.filter((recurso) => {
        const texto = [recurso.titulo, recurso.autor, recurso.autor_postulante,
            recurso.codigo_topografico, recurso.area_nombre, recurso.tipo_recurso,
            ...(Array.isArray(recurso.palabras_clave) ? recurso.palabras_clave : [])].join(' ');

        return normalizar(texto).includes(termino)
            && (!soloDisponibles || disponibilidad(recurso) === 'Disponible');
    });

    return (
        <section className="catalogo-lector" aria-labelledby="catalogo-titulo">
            <header>
                <h1 id="catalogo-titulo">Buscar recursos</h1>
                <p>Consulta libros y tesis y revisa su disponibilidad.</p>
            </header>
            <div className="catalogo-filtros">
                <div className="catalogo-busqueda">
                    <label htmlFor="catalogo-busqueda">Buscar en el catálogo</label>
                    <input
                        id="catalogo-busqueda"
                        type="search"
                        placeholder="Título, autor, código, área o palabra clave"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <label className="catalogo-checkbox">
                    <input type="checkbox" checked={soloDisponibles}
                        onChange={(e) => setSoloDisponibles(e.target.checked)} />
                    Solo disponibles
                </label>
            </div>

            {loading ? <p role="status">Cargando recursos...</p> : error ? (
                <p className="catalogo-error" role="alert">{error}</p>
            ) : (
                <>
                    <p role="status">{resultados.length} recurso(s) encontrado(s)</p>
                    {resultados.length === 0 ? (
                        <p>No hay recursos que coincidan con tu búsqueda.</p>
                    ) : (
                        <div className="catalogo-tabla">
                            <table>
                                <caption className="catalogo-caption">Recursos del catálogo y disponibilidad actual</caption>
                                <thead><tr>
                                    <th scope="col">Código</th><th scope="col">Título</th>
                                    <th scope="col">Autor</th><th scope="col">Tipo</th>
                                    <th scope="col">Área</th><th scope="col">Disponibilidad</th>
                                    <th scope="col">Ejemplares disponibles</th>
                                </tr></thead>
                                <tbody>{resultados.map((recurso) => {
                                    const estado = disponibilidad(recurso);
                                    return (
                                        <tr key={recurso.id}>
                                            <td>{recurso.codigo_topografico || '—'}</td>
                                            <td>{recurso.titulo}</td>
                                            <td>{recurso.autor || recurso.autor_postulante || '—'}</td>
                                            <td>{recurso.tipo_recurso}</td>
                                            <td>{recurso.area_nombre || '—'}</td>
                                            <td><span className={`catalogo-estado ${estado === 'Disponible' ? 'catalogo-disponible' : 'catalogo-no-disponible'}`}>{estado}</span></td>
                                            <td>{recurso.cantidad_disponible ?? '—'} / {recurso.cantidad_total ?? '—'}</td>
                                        </tr>
                                    );
                                })}</tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};

export default BuscarRecursosLector;
