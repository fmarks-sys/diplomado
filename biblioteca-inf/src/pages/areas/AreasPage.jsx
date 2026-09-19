import { useEffect, useState } from 'react';
import {
    getAreas,
    createArea,
    deleteArea,
    estadoDelArea,
    modArea
} from '../../services/areasService';

import './areas.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const AreasPage = () => {
    const [areas, setAreas] = useState([]);
    const [nombre, setNombre] = useState('');

    // 1. ESTADOS DE PAGINACIÓN
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Modales y Edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [actionType, setActionType] = useState(null);

    const [editId, setEditId] = useState(null);
    const [editNombre, setEditNombre] = useState('');

    // LOAD
    const loadAreas = async () => {
        try {
            const data = await getAreas();
            setAreas(data);
        } catch (err) {
            console.error(err.message);
        }
    };

    useEffect(() => {
        loadAreas();
    }, []);

    // 2. CÁLCULOS DE PAGINACIÓN
    const totalPages = Math.ceil(areas.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentAreas = areas.slice(indexOfFirstItem, indexOfLastItem);

    // Ajuste de página si borras el último elemento de la página final
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [areas.length, totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    // CREATE
    const handleCreate = async (e) => {
        e.preventDefault();

        if (!nombre.trim()) return alert('Nombre requerido');

        try {
            await createArea(nombre);
            setNombre('');
            loadAreas();
        } catch (err) {
            console.error(err.message);
        }
    };

    // EDIT
    const startEdit = (area) => {
        setEditId(area.id);
        setEditNombre(area.nombre);
    };

    const cancelEdit = () => {
        setEditId(null);
        setEditNombre('');
    };

    const saveEdit = async () => {
        if (!editNombre.trim()) return alert('Nombre requerido');

        try {
            const update = await modArea(editId, editNombre);
            setAreas(prev =>
                prev.map(a => a.id === editId ? update : a)
            );
            cancelEdit();
        } catch (err) {
            console.error(err.message);
        }
    };

    // MODAL CONTROL
    const openModal = (id, type) => {
        setSelectedId(id);
        setActionType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedId(null);
    };

    const handleConfirm = async () => {
        try {
            if (actionType === 'delete') {
                await deleteArea(selectedId);
            } else {
                await estadoDelArea(selectedId);
            }

            loadAreas();
            closeModal();
        } catch (err) {
            console.error(err.message);
        }
    };

    return (
        <div className="areas-container">
            <h2>Áreas / Menciones</h2>

            {/*  FORM  */}
            <form onSubmit={handleCreate}>
                <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del área"
                />
                <button style={{ background: 'var(--uajms-blue-primary)', color: '#fff', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}
                 type="submit">Agregar</button>
            </form>

            {/*  TABLE  */}
            <div className="areas-table">
                <table className="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {currentAreas.map(a => (
                            <tr key={a.id}>
                                <td>{a.id}</td>
                                <td>
                                    {editId === a.id ? (
                                        <input
                                            value={editNombre}
                                            onChange={(e) => setEditNombre(e.target.value)}
                                        />
                                    ) : (
                                        a.nombre
                                    )}
                                </td>
                                <td>
                                    <span
                                        className={`badge ${a.estado === 'ACTIVO' ? 'activo' : 'inactivo'}`}
                                        onClick={() => openModal(a.id, 'estado')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {a.estado === 'ACTIVO' ? <CheckCircleIcon /> : <CancelIcon />}
                                        {a.estado}
                                    </span>
                                </td>
                                <td>
                                    {editId === a.id ? (
                                        <>
                                            <button onClick={saveEdit}>Guardar</button>
                                            <button onClick={cancelEdit}>Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => startEdit(a)}>
                                                Editar
                                            </button>

                                            <button onClick={() => openModal(a.id, 'delete')}>
                                                Eliminar
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/*  CONTROLES DE PAGINACIÓN  */}
            {areas.length > 0 && (
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

            {/*  MODAL  */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <p>
                            {actionType === 'delete'
                                ? '¿Eliminar área definitivamente?'
                                : '¿Cambiar estado del área?'}
                        </p>

                        <div className="modal-actions">
                            <button onClick={closeModal}>Cancelar</button>
                            <button className="danger" onClick={handleConfirm}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AreasPage;