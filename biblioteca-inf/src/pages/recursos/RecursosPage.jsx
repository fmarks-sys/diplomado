import { useEffect, useState } from 'react';
import {
    getRecursos,
    createRecurso,
    deleteRecurso,
    toggleEstadoRecurso,
    updateRecurso
} from '../../services/recursosService';
import { getAreas } from '../../services/areasService';

import './recursos.css';

const RecursosPage = () => {
    const [recursos, setRecursos] = useState([]);
    const [areas, setAreas] = useState([]);
    const [palabrasExistentes, setPalabrasExistentes] = useState([]);

    // 1. ESTADOS DE PAGINACIÓN (Declarados al inicio)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Estado inicial del formulario
    const initialFormState = {
        codigo_topografico: '',
        titulo: '',
        anio_publicacion: new Date().getFullYear().toString(),
        area_id: '',
        tipo_recurso: 'LIBRO',
        cantidad_total: 1,
        isbn: '',
        autor: '',
        editorial: '',
        edicion: '',
        autor_postulante: '',
        tutor_guia: '',
        tribunal_jurado: ['', '', ''],
        gestion_defensa: '',
        soporte_fisico: 'EMPASTADO',
        url_documento_pdf: '',
        palabras_clave: ''
    };

    // Modales Auxiliares
    const [createModal, setCreateModal] = useState({ open: false });
    const [form, setForm] = useState(initialFormState);
    const [modal, setModal] = useState({ open: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null });
    const [editModal, setEditModal] = useState({ open: false, data: null });

    const showModal = (message, type = 'success') => setModal({ open: true, message, type });
    const closeModal = () => setModal({ open: false, message: '', type: 'success' });

    // CARGA DE DATOS
    const loadData = async () => {
        try {
            const dataRecursos = await getRecursos();
            setRecursos(dataRecursos);

            const dataAreas = await getAreas();
            setAreas(dataAreas.filter(a => a.estado === 'ACTIVO'));

            const palabrasUnicas = new Set();
            dataRecursos.forEach(r => {
                if (Array.isArray(r.palabras_clave)) {
                    r.palabras_clave.forEach(p => palabrasUnicas.add(p));
                }
            });
            setPalabrasExistentes(Array.from(palabrasUnicas));

        } catch (err) {
            console.error(err.message);
            showModal('Error cargando datos', 'error');
        }
    };

    // Carga inicial al montar el componente
    useEffect(() => {
        loadData();
    }, []);

    // 2. CÁLCULOS DE PAGINACIÓN
    const totalPages = Math.ceil(recursos.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRecursos = recursos.slice(indexOfFirstItem, indexOfLastItem);

    // Ajuste seguro de página al eliminar elementos de la última página
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [recursos.length, totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    // MANEJADORES DE FORMULARIOS Y EDICIÓN
    const handleChange = (e) => {
        let { name, value, type } = e.target;
        if (type === 'number' && value < 0) value = '';
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleTribunalChange = (index, value) => {
        const nuevosTribunales = [...form.tribunal_jurado];
        nuevosTribunales[index] = value;
        setForm(prev => ({ ...prev, tribunal_jurado: nuevosTribunales }));
    };

    const handleEditChange = (e) => {
        let { name, value, type } = e.target;
        if (type === 'number' && value < 0) value = '';
        setEditModal(prev => ({
            ...prev,
            data: { ...prev.data, [name]: value }
        }));
    };

    const handleEditTribunalChange = (index, value) => {
        const juradoActual = Array.isArray(editModal.data.tribunal_jurado)
            ? [...editModal.data.tribunal_jurado]
            : ['', '', ''];
        juradoActual[index] = value;

        setEditModal(prev => ({
            ...prev,
            data: { ...prev.data, tribunal_jurado: juradoActual }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.codigo_topografico || !form.titulo || !form.area_id) {
            showModal('Completa los campos obligatorios principales', 'error');
            return;
        }

        if (form.tipo_recurso === 'LIBRO' && !form.autor) {
            showModal('El Autor es obligatorio para Libros', 'error');
            return;
        }

        if (form.tipo_recurso === 'TESIS' && (!form.autor_postulante || !form.tutor_guia || !form.gestion_defensa)) {
            showModal('Autor, Tutor y Gestión son obligatorios para Tesis', 'error');
            return;
        }

        const tribunalesLimpios = form.tribunal_jurado.filter(t => t.trim() !== '');
        const arrayPalabrasClave = form.palabras_clave
            ? form.palabras_clave.split(',').map(p => p.trim()).filter(p => p !== '')
            : [];

        try {
            await createRecurso({
                ...form,
                tribunal_jurado: tribunalesLimpios,
                palabras_clave: arrayPalabrasClave,
                anio_publicacion: Number(form.anio_publicacion),
                area_id: Number(form.area_id),
                cantidad_total: form.tipo_recurso === 'TESIS' ? 1 : Number(form.cantidad_total)
            });

            setForm(initialFormState);
            setCreateModal({ open: false });
            await loadData();
            showModal('Recurso registrado con éxito', 'success');
        } catch (err) {
            showModal(err.message, 'error');
        }
    };

    const handleSaveEdit = async () => {
        try {
            const tribunalesLimpios = Array.isArray(editModal.data.tribunal_jurado)
                ? editModal.data.tribunal_jurado.filter(t => t.trim() !== '')
                : [];

            await updateRecurso(editModal.data.id, {
                ...editModal.data,
                tribunal_jurado: tribunalesLimpios,
                anio_publicacion: Number(editModal.data.anio_publicacion),
                area_id: Number(editModal.data.area_id)
            });

            await loadData();
            setEditModal({ open: false, data: null });
            showModal('Recurso actualizado con éxito', 'success');
        } catch (err) {
            showModal(err.message, 'error');
        }
    };

    const openEdit = (recurso) => {
        const jurado = Array.isArray(recurso.tribunal_jurado) && recurso.tribunal_jurado.length > 0
            ? [...recurso.tribunal_jurado, '', '', ''].slice(0, 3)
            : ['', '', ''];

        setEditModal({
            open: true,
            data: { ...recurso, tribunal_jurado: jurado }
        });
    };

    return (
        <div className="recursos-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="recursos-title" style={{ margin: 0 }}>Gestión de Recursos</h2>
                <button
                    onClick={() => setCreateModal({ open: true })}
                    style={{ background: 'var(--uajms-blue-primary)', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
                >
                    + Agregar Nuevo Recurso
                </button>
            </div>

            {/* TABLA DE RECURSOS */}
            <div className="recursos-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Código</th>
                            <th>Título</th>
                            <th>Autor / Postulante</th>
                            <th>Área</th>
                            <th>Tipo</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecursos.map(r => (
                            <tr key={r.id}>
                                <td>{r.id}</td>
                                <td>{r.codigo_topografico}</td>
                                <td>{r.titulo}</td>
                                <td>{r.tipo_recurso === 'LIBRO' ? (r.autor || '—') : (r.autor_postulante || '—')}</td>
                                <td>{r.area_nombre || '—'}</td>
                                <td>{r.tipo_recurso}</td>
                                <td>{r.cantidad_disponible}/{r.cantidad_total}</td>
                                <td>
                                    <span className={`badge ${r.estado === 'DISPONIBLE' ? 'disponible' : 'prestado'}`}>
                                        {r.estado}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn-delete" onClick={() => setConfirmModal({ open: true, id: r.id, action: 'delete' })}>
                                        Eliminar
                                    </button>
                                    <button className="btn-toggle" onClick={() => setConfirmModal({ open: true, id: r.id, action: 'estado' })}>
                                        Estado
                                    </button>
                                    <button onClick={() => openEdit(r)}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {recursos.length > 0 && (
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

            {/* MODAL 1: REGISTRAR NUEVO RECURSO */}
            {createModal.open && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: '630px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>Registrar Nuevo Recurso</h3>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', textAlign: 'left', marginTop: '15px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tipo Recurso *</label>
                                    <select name="tipo_recurso" value={form.tipo_recurso} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                        <option value="LIBRO">Libro</option>
                                        <option value="TESIS">Tesis</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Código Topográfico *</label>
                                    <input name="codigo_topografico" placeholder="ej: INF-TES-042" value={form.codigo_topografico} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Título *</label>
                                    <input name="titulo" value={form.titulo} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Año Publicación *</label>
                                    <input name="anio_publicacion" type="number" value={form.anio_publicacion} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Área Académica / Mención *</label>
                                <select name="area_id" value={form.area_id} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                    <option value="">Seleccionar Área</option>
                                    {areas.map(a => (
                                        <option key={a.id} value={a.id}>{a.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {form.tipo_recurso === 'LIBRO' && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                                    <h4 style={{ margin: 0, color: 'var(--uajms-blue-primary)' }}>Detalles del Libro</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Autor *</label>
                                            <input name="autor" value={form.autor} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>ISBN</label>
                                            <input name="isbn" value={form.isbn} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Editorial</label>
                                            <input name="editorial" value={form.editorial} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Edición</label>
                                            <input name="edicion" value={form.edicion} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Stock Total *</label>
                                            <input name="cantidad_total" type="number" min="1" value={form.cantidad_total} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {form.tipo_recurso === 'TESIS' && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', display: 'grid', gap: '10px' }}>
                                    <h4 style={{ margin: 0, color: 'var(--uajms-blue-primary)' }}>Detalles de la Tesis</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Autor Postulante *</label>
                                            <input name="autor_postulante" value={form.autor_postulante} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tutor Guía *</label>
                                            <input name="tutor_guia" value={form.tutor_guia} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tribunales Jurados</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                            <input placeholder="Tribunal 1" value={form.tribunal_jurado[0]} onChange={(e) => handleTribunalChange(0, e.target.value)} style={{ padding: '6px' }} />
                                            <input placeholder="Tribunal 2" value={form.tribunal_jurado[1]} onChange={(e) => handleTribunalChange(1, e.target.value)} style={{ padding: '6px' }} />
                                            <input placeholder="Tribunal 3" value={form.tribunal_jurado[2]} onChange={(e) => handleTribunalChange(2, e.target.value)} style={{ padding: '6px' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Gestión Defensa *</label>
                                            <input name="gestion_defensa" placeholder="ej: 1/2026" value={form.gestion_defensa} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Soporte Físico</label>
                                            <select name="soporte_fisico" value={form.soporte_fisico} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
                                                <option value="EMPASTADO">Empastado</option>
                                                <option value="CD">CD</option>
                                                <option value="DIGITAL">Digital</option>
                                                <option value="AMBOS">Ambos</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Palabras Clave (Separadas por coma)</label>
                                        <input 
                                            name="palabras_clave" 
                                            list="lista-palabras-clave" 
                                            placeholder="ej: Machine Learning, Redes, Python" 
                                            value={form.palabras_clave} 
                                            onChange={handleChange} 
                                            style={{ width: '100%', padding: '8px' }} 
                                        />
                                        <datalist id="lista-palabras-clave">
                                            {palabrasExistentes.map((palabra, index) => (
                                                <option key={index} value={palabra} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>URL Documento PDF (Resguardo)</label>
                                        <input name="url_documento_pdf" placeholder="https://..." value={form.url_documento_pdf} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions" style={{ marginTop: '15px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setCreateModal({ open: false })}>
                                    Cancelar
                                </button>
                                <button type="submit">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDITAR RECURSO */}
            {editModal.open && editModal.data && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Editar {editModal.data.tipo_recurso}</h3>
                        <div className="form-grid" style={{ gap: '10px', textAlign: 'left', marginTop: '10px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Título:</label>
                                <input name="titulo" value={editModal.data.titulo || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Año:</label>
                                    <input name="anio_publicacion" type="number" value={editModal.data.anio_publicacion || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Área:</label>
                                    <select name="area_id" value={editModal.data.area_id || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }}>
                                        <option value="">Seleccionar Área</option>
                                        {areas.map(a => (
                                            <option key={a.id} value={a.id}>{a.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editModal.data.tipo_recurso === 'LIBRO' && (
                                <>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Autor:</label>
                                        <input name="autor" value={editModal.data.autor || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>ISBN:</label>
                                            <input name="isbn" value={editModal.data.isbn || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Editorial:</label>
                                            <input name="editorial" value={editModal.data.editorial || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {editModal.data.tipo_recurso === 'TESIS' && (
                                <>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Postulante:</label>
                                        <input name="autor_postulante" value={editModal.data.autor_postulante || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tutor Guía:</label>
                                        <input name="tutor_guia" value={editModal.data.tutor_guia || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Tribunales Jurados:</label>
                                        <div className='tribunal'>
                                            <input placeholder="Jurado 1" value={editModal.data.tribunal_jurado?.[0] || ''} onChange={(e) => handleEditTribunalChange(0, e.target.value)} style={{ padding: '6px' }} />
                                            <input placeholder="Jurado 2" value={editModal.data.tribunal_jurado?.[1] || ''} onChange={(e) => handleEditTribunalChange(1, e.target.value)} style={{ padding: '6px' }} />
                                            <input placeholder="Jurado 3" value={editModal.data.tribunal_jurado?.[2] || ''} onChange={(e) => handleEditTribunalChange(2, e.target.value)} style={{ padding: '6px' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Gestión Defensa:</label>
                                        <input name="gestion_defensa" value={editModal.data.gestion_defensa || ''} onChange={handleEditChange} style={{ width: '100%', padding: '8px' }} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-actions" style={{ marginTop: '15px' }}>
                            <button className="btn-cancel" onClick={() => setEditModal({ open: false, data: null })}>
                                Cancelar
                            </button>
                            <button onClick={handleSaveEdit}>
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES DE NOTIFICACIÓN Y CONFIRMACIÓN */}
            {modal.open && (
                <div className="modal-overlay">
                    <div className={`modal-box ${modal.type}`}>
                        <p>{modal.message}</p>
                        <button onClick={closeModal}>Aceptar</button>
                    </div>
                </div>
            )}

            {confirmModal.open && (
                <div className="modal-overlay">
                    <div className="modal-box warning">
                        <p>
                            {confirmModal.action === 'delete'
                                ? '¿Seguro que deseas eliminar este recurso?'
                                : '¿Cambiar estado del recurso?'}
                        </p>
                        <div className="modal-actions">
                            <button onClick={async () => {
                                try {
                                    if (confirmModal.action === 'delete') {
                                        await deleteRecurso(confirmModal.id);
                                    } else {
                                        await toggleEstadoRecurso(confirmModal.id);
                                    }
                                    loadData();
                                    showModal('Operación realizada correctamente');
                                } catch (err) {
                                    showModal(err.message, 'error');
                                }
                                setConfirmModal({ open: false, id: null, action: null });
                            }}>
                                Sí
                            </button>
                            <button className="btn-cancel" onClick={() => setConfirmModal({ open: false, id: null, action: null })}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecursosPage;