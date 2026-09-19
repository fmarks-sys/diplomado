import { useEffect, useState } from 'react';
import { getLectores, createLector, updateLector, estadoLector } from '../../services/lectoresService';
import './lectores.css';

function LectoresPage() {
    const [lectores, setLectores] = useState([]);

    // 1. ESTADOS DE PAGINACIÓN
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [form, setForm] = useState({
        ru: '',
        ci: '',
        nombres: '',
        apellidos: '',
        correo: '',
        telefono: '',
        tipo_lector: 'ESTUDIANTE'
    });

    // Estado para el modal de edición
    const [editModal, setEditModal] = useState({
        open: false,
        data: null
    });

    const loadLectores = async () => {
        try {
            const data = await getLectores();
            setLectores(data);
        } catch (err) {
            alert(err.message || 'Error al cargar lectores');
        }
    };

    useEffect(() => {
        loadLectores();
    }, []);

    // 2. CÁLCULOS DE PAGINACIÓN
    const totalPages = Math.ceil(lectores.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLectores = lectores.slice(indexOfFirstItem, indexOfLastItem);

    // Ajuste seguro de página al cambiar la cantidad de lectores
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [lectores.length, totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleChange = (e) => {
        let { name, value, type } = e.target;
        if (type === 'number' && value < 0) value = '';

        setForm({
            ...form,
            [name]: value
        });
    };

    const handleEditChange = (e) => {
        let { name, value, type } = e.target;
        if (type === 'number' && value < 0) value = '';

        setEditModal({
            ...editModal,
            data: {
                ...editModal.data,
                [name]: value
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.ci || !form.nombres || !form.apellidos) {
            alert('Complete los campos obligatorios (CI, Nombres, Apellidos)');
            return;
        }

        try {
            await createLector(form);
            setForm({
                ru: '',
                ci: '',
                nombres: '',
                apellidos: '',
                correo: '',
                telefono: '',
                tipo_lector: 'ESTUDIANTE'
            });
            loadLectores();
        } catch (err) {
            alert(err.message || 'Error al crear lector');
        }
    };

    const handleToggleEstado = async (id) => {
        try {
            await estadoLector(id);
            loadLectores();
        } catch (err) {
            alert(err.message || 'Error al cambiar el estado');
        }
    };

    const handleSaveEdit = async () => {
        if (!editModal.data.nombres || !editModal.data.apellidos) {
            alert('Nombres y Apellidos son obligatorios');
            return;
        }
        try {
            await updateLector(editModal.data.id, editModal.data);
            setEditModal({ open: false, data: null });
            loadLectores();
        } catch (err) {
            alert(err.message || 'Error al actualizar lector');
        }
    };

    return (
        <div className="lectores-page">
            <h2 className="lectores-title">Lectores</h2>

            {/* FORMULARIO AGREGAR */}
            <div className="lectores-form">
                <form className="form-grid" onSubmit={handleSubmit}>
                    <input name="ru" placeholder="RU" value={form.ru} onChange={handleChange} />
                    <input name="ci" placeholder="CI" value={form.ci} onChange={handleChange} />
                    <input name="nombres" placeholder="Nombres" value={form.nombres} onChange={handleChange} />
                    <input name="apellidos" placeholder="Apellidos" value={form.apellidos} onChange={handleChange} />
                    <input name="correo" type="email" placeholder="Correo" value={form.correo} onChange={handleChange} />
                    <input
                        name="telefono"
                        type="number"
                        onKeyDown={(e) => ['-', 'e', 'E'].includes(e.key) && e.preventDefault()}
                        placeholder="Teléfono"
                        value={form.telefono}
                        onChange={handleChange}
                    />
                    <select name="tipo_lector" value={form.tipo_lector} onChange={handleChange}>
                        <option value="ESTUDIANTE">Estudiante</option>
                        <option value="DOCENTE">Docente</option>
                        <option value="ADMINISTRATIVO">Administrativo</option>
                    </select>
                    <button type="submit">Guardar</button>
                </form>
            </div>

            {/* TABLA DE LECTORES */}
            <div className="lectores-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>RU</th>
                            <th>CI</th>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Correo</th>
                            <th>Teléfono</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentLectores.map((lector) => (
                            <tr key={lector.id}>
                                <td>{lector.id}</td>
                                <td>{lector.ru || '—'}</td>
                                <td>{lector.ci}</td>
                                <td>{lector.nombres}</td>
                                <td>{lector.apellidos}</td>
                                <td>{lector.correo || '—'}</td>
                                <td>{lector.telefono || '—'}</td>
                                <td>{lector.tipo_lector}</td>
                                <td>
                                    <span className={`badge ${lector.estado === 'ACTIVO' ? 'disponible' : 'prestado'}`}>
                                        {lector.estado}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="btn-toggle"
                                        onClick={() => handleToggleEstado(lector.id)}
                                        style={{ marginRight: '5px' }}
                                    >
                                        Estado
                                    </button>
                                    <button onClick={() => setEditModal({ open: true, data: lector })}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {lectores.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <button className='btn-page'
                        onClick={goToPrevPage} 
                        disabled={currentPage === 1}
                        style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                    >
                        Anterior
                    </button>

                    <span>
                        Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong>
                    </span>

                    <button className='btn-page'
                        onClick={goToNextPage} 
                        disabled={currentPage === totalPages || totalPages === 0}
                        style={{ opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1, cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', padding: '6px 12px' }}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* MODAL DE EDICIÓN */}
            {editModal.open && editModal.data && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Editar Lector</h3>
                        <div style={{ display: 'grid', gap: '12px', margin: '15px 0', textAlign: 'left' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>RU (No editable):</label>
                                <input value={editModal.data.ru || ''} disabled style={{ background: '#e2e8f0', cursor: 'not-allowed', width: '100%', padding: '8px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>CI (No editable):</label>
                                <input value={editModal.data.ci || ''} disabled style={{ background: '#e2e8f0', cursor: 'not-allowed', width: '100%', padding: '8px' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Nombres:</label>
                                <input name="nombres" value={editModal.data.nombres || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Apellidos:</label>
                                <input name="apellidos" value={editModal.data.apellidos || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Correo:</label>
                                <input name="correo" type="email" value={editModal.data.correo || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Teléfono:</label>
                                <input
                                    name="telefono"
                                    type="number"
                                    onKeyDown={(e) => ['-', 'e', 'E'].includes(e.key) && e.preventDefault()}
                                    value={editModal.data.telefono || ''}
                                    onChange={handleEditChange}
                                    style={{ width: '100%', padding: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo Lector:</label>
                                <select name="tipo_lector" value={editModal.data.tipo_lector} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }}>
                                    <option value="ESTUDIANTE">Estudiante</option>
                                    <option value="DOCENTE">Docente</option>
                                    <option value="ADMINISTRATIVO">Administrativo</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setEditModal({ open: false, data: null })}>
                                Cancelar
                            </button>
                            <button onClick={handleSaveEdit}>
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LectoresPage;