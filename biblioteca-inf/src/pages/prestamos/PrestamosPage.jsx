import { useEffect, useState } from 'react';
import { getPrestamos, createPrestamo, devolverPrestamo } from '../../services/prestamosService';
import { getLectores } from '../../services/lectoresService';
import { getRecursos } from '../../services/recursosService';
import './prestamos.css';

const PrestamosPage = () => {
    const [prestamos, setPrestamos] = useState([]);
    const [lectores, setLectores] = useState([]);
    const [recursos, setRecursos] = useState([]);

    // Control del Modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Estados para los inputs de búsqueda (Autocompletado)
    const [searchLector, setSearchLector] = useState('');
    const [searchRecurso, setSearchRecurso] = useState('');

    // Obtener la fecha de hoy en formato local YYYY-MM-DD sin desfase horario
    const getTodayLocalDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Estado Inicial del Formulario
    const initialFormState = {
        lector_id: '',
        recurso_id: '',
        fecha_prestamo: getTodayLocalDate(), // Fecha de hoy asignada automáticamente
        fecha_devolucion_prevista: getTodayLocalDate(),
        tipo_prestamo: 'DOMICILIO'
    };

    //formatear fecha
    // Formatea ISO a fecha legible local (dd/mm/yyyy)
const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// (Opcional) Si quieres incluir hora y minutos:
const formatDateTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};


    const [form, setForm] = useState(initialFormState);

    // Estados de Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // CARGAR DATOS MEDIANTE SERVICIOS
    const loadData = async () => {
        try {
            const dataPrestamos = await getPrestamos();
            const dataLectores = await getLectores();
            const dataRecursos = await getRecursos();

            setPrestamos(dataPrestamos);
            // Filtrar solo lectores activos
            setLectores(dataLectores.filter(l => l.estado === 'ACTIVO'));
            // Filtrar recursos con stock disponible
            setRecursos(dataRecursos.filter(r => r.cantidad_disponible > 0));
        } catch (err) {
            console.error('Error al cargar datos:', err.message);
            alert('Error al cargar los datos necesarios');
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // CÁLCULOS DE PAGINACIÓN
    const totalPages = Math.ceil(prestamos.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentPrestamos = prestamos.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [prestamos.length, totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    // MANEJADORES DE BÚSQUEDA Y SELECCIÓN
    const handleLectorChange = (e) => {
        const val = e.target.value;
        setSearchLector(val);

        // Buscar coincidencia exacta por texto generado en el datalist
        const lectorEncontrado = lectores.find(
            l => `${l.nombres} ${l.apellidos} (CI: ${l.ci})` === val
        );

        setForm(prev => ({
            ...prev,
            lector_id: lectorEncontrado ? lectorEncontrado.id : ''
        }));
    };

    const handleRecursoChange = (e) => {
        const val = e.target.value;
        setSearchRecurso(val);

        // Buscar coincidencia exacta por texto generado en el datalist
        const recursoEncontrado = recursos.find(
            r => `${r.titulo} - [${r.codigo_topografico}]` === val
        );

        setForm(prev => ({
            ...prev,
            recurso_id: recursoEncontrado ? recursoEncontrado.id : ''
        }));
    };

    const handleChange = (e) => {
        setForm(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.lector_id || !form.recurso_id) {
            alert('Debes seleccionar un Lector y un Recurso válidos de la lista de sugerencias');
            return;
        }

        try {
            await createPrestamo(form);
            
            // Limpiar formulario y cerrar modal
            setForm(initialFormState);
            setSearchLector('');
            setSearchRecurso('');
            setIsModalOpen(false);

            await loadData();
            alert('Préstamo registrado exitosamente');
        } catch (err) {
            alert(err.message || 'Error al registrar el préstamo');
        }
    };

    const handleDevolver = async (id) => {
        if (!confirm('¿Registrar devolución del recurso?')) return;

        try {
            await devolverPrestamo(id);
            await loadData();
        } catch (err) {
            alert(err.message || 'Error al registrar la devolución');
        }
    };

    return (
        <div className="prestamos-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="prestamos-title" style={{ margin: 0 }}>Préstamos</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: 'var(--uajms-blue-primary)', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
                >
                    + Asignar Nuevo Préstamo
                </button>
            </div>

            {/* TABLA DE PRÉSTAMOS */}
            <div className="prestamos-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Lector</th>
                            <th>Recurso</th>
                            <th>Fecha Préstamo</th>
                            <th>Devolución Prevista</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
    {currentPrestamos.map(p => (
        <tr key={p.id}>
            <td>{p.id}</td>
            <td>{p.lector_nombre}</td>
            <td>{p.recurso_titulo}</td>

            {/* Aplicamos la función de formato aquí */}
            <td>{formatDate(p.fecha_prestamo)}</td>
            <td>{formatDate(p.fecha_devolucion_prevista)}</td>

            <td>
                <span className={`badge ${p.estado === 'PRESTADO' ? 'prestado' : 'disponible'}`}>
                    {p.estado}
                </span>
            </td>
            <td>
                {p.estado === 'PRESTADO' && (
                    <button
                        className="btn-return"
                        onClick={() => handleDevolver(p.id)}
                    >
                        Devolver
                    </button>
                )}
            </td>
        </tr>
    ))}
</tbody>
                </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {prestamos.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <button
                        className='btn-page'
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                        style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                    >
                        Anterior
                    </button>

                    <span>
                        Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong>
                    </span>

                    <button
                        className='btn-page'
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                        style={{ opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1, cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* MODAL DE ASIGNACIÓN DE PRÉSTAMO */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: '500px' }}>
                        <h3>Asignar Nuevo Préstamo</h3>

                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', textAlign: 'left', marginTop: '15px' }}>
                            {/* AUTOCOMPLETADO LECTOR */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Buscar Lector *</label>
                                <input
                                    list="lista-lectores"
                                    placeholder="Escribe Nombre o CI..."
                                    value={searchLector}
                                    onChange={handleLectorChange}
                                    style={{ width: '100%', padding: '8px' }}
                                />
                                <select
  name="lector_id"
  value={form.lector_id}
  onChange={handleChange}
>
  <option value="">Seleccionar lector</option>
  {lectores.map(l => (
    <option key={l.id} value={l.id}>
      {l.nombres} {l.apellidos}
    </option>
  ))}
</select>
                            </div>

                            {/* AUTOCOMPLETADO RECURSO */}
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Buscar Recurso (Libro/Tesis) *</label>
                                <input
                                    list="lista-recursos"
                                    placeholder="Escribe Título o Código..."
                                    value={searchRecurso}
                                    onChange={handleRecursoChange}
                                    style={{ width: '100%', padding: '8px' }}
                                />
                                <datalist id="lista-recursos">
                                    {recursos.map(r => (
                                        <option key={r.id} value={`${r.titulo} - [${r.codigo_topografico}]`} />
                                    ))}
                                </datalist>
                            </div>

                            {/* FECHAS Y TIPO */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha Préstamo</label>
                                    <input
                                        type="date"
                                        name="fecha_prestamo"
                                        value={form.fecha_prestamo}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Fecha Devolución</label>
                                    <input
                                        type="date"
                                        name="fecha_devolucion_prevista"
                                        value={form.fecha_devolucion_prevista}
                                        onChange={handleChange}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo Préstamo</label>
                                <select
                                    name="tipo_prestamo"
                                    value={form.tipo_prestamo}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    <option value="DOMICILIO">Domicilio</option>
                                    <option value="SALA">Sala</option>
                                </select>
                            </div>

                            {/* ACCIONES MODAL */}
                            <div className="modal-actions" style={{ marginTop: '15px' }}>
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setSearchLector('');
                                        setSearchRecurso('');
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button type="submit">
                                    Registrar Préstamo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestamosPage;