import { useEffect, useState } from 'react';

import {
    getAreas,
    createArea,
    cambiarEstadoArea,
    modArea
} from '../../services/areasService';

import './areas.css';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';


// ======================================================
// COMPONENTE
// ======================================================
const AreasPage = () => {

    const [areas, setAreas] = useState([]);
    const [nombre, setNombre] = useState('');

    // Mensajes
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Loading
    const [loading, setLoading] = useState(false);

    // ==================================================
    // PAGINACIÓN
    // ==================================================

    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 5;


    // ==================================================
    // MODAL CAMBIO DE ESTADO
    // ==================================================

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedArea, setSelectedArea] = useState(null);


    // ==================================================
    // EDICIÓN
    // ==================================================

    const [editId, setEditId] = useState(null);

    const [editNombre, setEditNombre] = useState('');


    // ==================================================
    // CARGAR ÁREAS
    // ==================================================

    const loadAreas = async () => {

        try {

            setLoading(true);
            setError('');

            const data = await getAreas();

            setAreas(data);

        } catch (err) {

            console.error(err);

            setError(
                err.message || 'Error al cargar las áreas'
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadAreas();
    }, []);


    // ==================================================
    // PAGINACIÓN
    // ==================================================

    const totalPages = Math.ceil(
        areas.length / itemsPerPage
    );

    const indexOfLastItem =
        currentPage * itemsPerPage;

    const indexOfFirstItem =
        indexOfLastItem - itemsPerPage;

    const currentAreas = areas.slice(
        indexOfFirstItem,
        indexOfLastItem
    );


    // Corregir página si cambia el número de elementos
    useEffect(() => {

        if (
            currentPage > totalPages &&
            totalPages > 0
        ) {
            setCurrentPage(totalPages);
        }

    }, [
        areas.length,
        totalPages,
        currentPage
    ]);


    const goToNextPage = () => {

        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };


    const goToPrevPage = () => {

        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };


    // ==================================================
    // LIMPIAR MENSAJES
    // ==================================================

    const clearMessages = () => {
        setMensaje('');
        setError('');
    };


    // ==================================================
    // CREAR ÁREA
    // ==================================================

    const handleCreate = async (e) => {

        e.preventDefault();

        clearMessages();

        if (!nombre.trim()) {
            setError('Nombre requerido');
            return;
        }

        try {

            const nuevaArea = await createArea(nombre);

            setAreas(prev => [
                nuevaArea,
                ...prev
            ]);

            setNombre('');

            setCurrentPage(1);

            setMensaje(
                'Área creada correctamente'
            );

        } catch (err) {

            console.error(err);

            setError(err.message);
        }
    };


    // ==================================================
    // INICIAR EDICIÓN
    // ==================================================

    const startEdit = (area) => {

        clearMessages();

        setEditId(area.id);

        setEditNombre(area.nombre);
    };


    // ==================================================
    // CANCELAR EDICIÓN
    // ==================================================

    const cancelEdit = () => {

        setEditId(null);

        setEditNombre('');
    };


    // ==================================================
    // GUARDAR EDICIÓN
    // ==================================================

    const saveEdit = async () => {

        clearMessages();

        if (!editNombre.trim()) {

            setError('Nombre requerido');

            return;
        }

        try {

            const updatedArea = await modArea(
                editId,
                editNombre
            );

            setAreas(prev =>
                prev.map(area =>
                    area.id === editId
                        ? updatedArea
                        : area
                )
            );

            cancelEdit();

            setMensaje(
                'Área actualizada correctamente'
            );

        } catch (err) {

            console.error(err);

            setError(err.message);
        }
    };


    // ==================================================
    // ABRIR MODAL DE CAMBIO DE ESTADO
    // ==================================================

    const openEstadoModal = (area) => {

        clearMessages();

        setSelectedArea(area);

        setIsModalOpen(true);
    };


    // ==================================================
    // CERRAR MODAL
    // ==================================================

    const closeModal = () => {

        setIsModalOpen(false);

        setSelectedArea(null);
    };


    // ==================================================
    // CAMBIAR ESTADO
    // ==================================================

    const handleCambiarEstado = async () => {

        if (!selectedArea) {
            return;
        }

        try {

            clearMessages();

            const response =
                await cambiarEstadoArea(
                    selectedArea.id
                );

            /*
             * Backend devuelve:
             *
             * {
             *   message: "...",
             *   area: {...}
             * }
             */

            const updatedArea = response.area;

            setAreas(prev =>
                prev.map(area =>
                    area.id === updatedArea.id
                        ? updatedArea
                        : area
                )
            );

            setMensaje(response.message);

            closeModal();

        } catch (err) {

            console.error(err);

            setError(err.message);

            closeModal();
        }
    };


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="areas-container">

            <h2>Áreas / Menciones</h2>


            {/* ============================= */}
            {/* MENSAJES */}
            {/* ============================= */}

            {mensaje && (
                <div className="alert-success">
                    {mensaje}
                </div>
            )}

            {error && (
                <div className="alert-error">
                    {error}
                </div>
            )}


            {/* ============================= */}
            {/* FORMULARIO */}
            {/* ============================= */}

            <form onSubmit={handleCreate}>

                <input
                    value={nombre}
                    onChange={(e) =>
                        setNombre(e.target.value)
                    }
                    placeholder="Nombre del área"
                />

                <button
                    type="submit"
                    style={{
                        background:
                            'var(--uajms-blue-primary)',
                        color: '#fff',
                        padding: '10px 18px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: 'none',
                        fontWeight: 'bold'
                    }}
                >
                    Agregar
                </button>

            </form>


            {/* ============================= */}
            {/* TABLA */}
            {/* ============================= */}

            <div className="areas-table">

                {loading ? (

                    <p>Cargando áreas...</p>

                ) : (

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

                            {currentAreas.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="4"
                                        style={{
                                            textAlign: 'center'
                                        }}
                                    >
                                        No existen áreas registradas
                                    </td>

                                </tr>

                            ) : (

                                currentAreas.map(area => (

                                    <tr key={area.id}>

                                        {/* ID */}
                                        <td>
                                            {area.id}
                                        </td>


                                        {/* NOMBRE */}
                                        <td>

                                            {editId === area.id ? (

                                                <input
                                                    value={editNombre}
                                                    onChange={(e) =>
                                                        setEditNombre(
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                            ) : (

                                                area.nombre

                                            )}

                                        </td>


                                        {/* ESTADO */}
                                        <td>

                                            <span
                                                className={
                                                    `badge ${
                                                        area.estado ===
                                                        'ACTIVO'
                                                            ? 'activo'
                                                            : 'inactivo'
                                                    }`
                                                }
                                            >

                                                {area.estado ===
                                                'ACTIVO' ? (

                                                    <CheckCircleIcon />

                                                ) : (

                                                    <CancelIcon />

                                                )}

                                                {area.estado}

                                            </span>

                                        </td>


                                        {/* ACCIONES */}
                                        <td>

                                            {editId === area.id ? (

                                                <>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            saveEdit
                                                        }
                                                    >
                                                        Guardar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            cancelEdit
                                                        }
                                                    >
                                                        Cancelar
                                                    </button>

                                                </>

                                            ) : (

                                                <>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEdit(
                                                                area
                                                            )
                                                        }
                                                    >
                                                        Editar
                                                    </button>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openEstadoModal(
                                                                area
                                                            )
                                                        }
                                                    >

                                                        {area.estado ===
                                                        'ACTIVO'
                                                            ? 'Desactivar'
                                                            : 'Activar'}

                                                    </button>

                                                </>

                                            )}

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                )}

            </div>


            {/* ============================= */}
            {/* PAGINACIÓN */}
            {/* ============================= */}

            {areas.length > 0 && (

                <div
                    style={{
                        display: 'flex',
                        justifyContent:
                            'space-between',
                        alignItems: 'center',
                        marginTop: '15px'
                    }}
                >

                    <button
                        className="btn-page"
                        onClick={goToPrevPage}
                        disabled={
                            currentPage === 1
                        }
                    >
                        Anterior
                    </button>


                    <span>

                        Página{' '}

                        <strong>
                            {currentPage}
                        </strong>

                        {' '}de{' '}

                        <strong>
                            {totalPages || 1}
                        </strong>

                    </span>


                    <button
                        className="btn-page"
                        onClick={goToNextPage}
                        disabled={
                            currentPage ===
                                totalPages ||
                            totalPages === 0
                        }
                    >
                        Siguiente
                    </button>

                </div>

            )}


            {/* ============================= */}
            {/* MODAL CAMBIO DE ESTADO */}
            {/* ============================= */}

            {isModalOpen && selectedArea && (

                <div className="modal-overlay">

                    <div className="modal-box">

                        <p>

                            ¿Desea{' '}

                            <strong>
                                {selectedArea.estado ===
                                'ACTIVO'
                                    ? 'desactivar'
                                    : 'activar'}
                            </strong>

                            {' '}el área{' '}

                            <strong>
                                {selectedArea.nombre}
                            </strong>

                            ?

                        </p>


                        <div className="modal-actions">

                            <button
                                type="button"
                                onClick={closeModal}
                            >
                                Cancelar
                            </button>


                            <button
                                type="button"
                                className={
                                    selectedArea.estado ===
                                    'ACTIVO'
                                        ? 'danger'
                                        : ''
                                }
                                onClick={
                                    handleCambiarEstado
                                }
                            >

                                {selectedArea.estado ===
                                'ACTIVO'
                                    ? 'Desactivar'
                                    : 'Activar'}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};


export default AreasPage;