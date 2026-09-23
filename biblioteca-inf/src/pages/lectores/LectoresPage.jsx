import { useEffect, useState } from 'react';
import {
    getLectores,
    createLector,
    updateLector,
    estadoLector
} from '../../services/lectoresService';
import './lectores.css';

const initialForm = {
    ru: '',
    ci: '',
    nombres: '',
    ap: '',
    am: '',
    correo: '',
    telefono: '',
    tipo_lector: 'ESTUDIANTE'
};

function LectoresPage() {
    const [lectores, setLectores] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [form, setForm] = useState(initialForm);
    const [editModal, setEditModal] = useState({
        open: false,
        data: null
    });

    //modal
    const [addModal, setAddModal] = useState(false);

    const openAddModal = () => {
        setForm(initialForm);
        setAddModal(true);
    };

    const closeAddModal = () => {
        setAddModal(false);
        setForm(initialForm);
    };

    const loadLectores = async () => {
        try {
            const data = await getLectores();
            setLectores(Array.isArray(data) ? data : []);
        } catch (err) {
            alert(err.message || 'Error al cargar lectores');
        }
    };

    useEffect(() => {
        loadLectores();
    }, []);

    const totalPages = Math.ceil(lectores.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentLectores = lectores.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [lectores.length, totalPages, currentPage]);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;

        setEditModal((prev) => ({
            ...prev,
            data: {
                ...prev.data,
                [name]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.ci.trim() || !form.nombres.trim() || !form.ap.trim() || !form.am.trim() || !form.correo.trim()) {
            alert('Complete CI, nombres, apellido paterno, apellido materno y correo');
            return;
        }

        try {
            await createLector({
                ...form,
                ru: form.ru.trim() || null,
                ci: form.ci.trim(),
                nombres: form.nombres.trim(),
                ap: form.ap.trim(),
                am: form.am.trim(),
                correo: form.correo.trim(),
                telefono: form.telefono.trim() || null
            });

            setForm(initialForm);
            setAddModal(false);
            setCurrentPage(1);
            await loadLectores();

            setForm(initialForm);
            setCurrentPage(1);
            await loadLectores();
        } catch (err) {
            alert(err.message || 'Error al crear lector');
        }
    };

    const handleToggleEstado = async (id) => {
        try {
            await estadoLector(id);
            await loadLectores();
        } catch (err) {
            alert(err.message || 'Error al cambiar el estado');
        }
    };

    const openEditModal = (lector) => {
        setEditModal({
            open: true,
            data: { ...lector }
        });
    };

    const closeEditModal = () => {
        setEditModal({ open: false, data: null });
    };

    const handleSaveEdit = async () => {
        const data = editModal.data;

        if (!data?.ci?.trim() || !data?.nombres?.trim() || !data?.ap?.trim() || !data?.am?.trim() || !data?.correo?.trim()) {
            alert('Complete CI, nombres, apellido paterno, apellido materno y correo');
            return;
        }

        try {
            await updateLector(data.id, {
                ru: data.ru?.trim() || null,
                ci: data.ci.trim(),
                nombres: data.nombres.trim(),
                ap: data.ap.trim(),
                am: data.am.trim(),
                correo: data.correo.trim(),
                telefono: data.telefono?.trim() || null,
                tipo_lector: data.tipo_lector
            });

            closeEditModal();
            await loadLectores();
        } catch (err) {
            alert(err.message || 'Error al actualizar lector');
        }
    };

    return (
        <div className="lectores-page">
            <h2 className="lectores-title">Lectores</h2>

            <div className="lectores-header-actions">
                <button className="btn-add" onClick={openAddModal}>
                    + Agregar lector
                </button>
            </div>

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
                        {currentLectores.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center' }}>
                                    No hay lectores registrados
                                </td>
                            </tr>
                        ) : (
                            currentLectores.map((lector) => (
                                <tr key={lector.id}>
                                    <td>{lector.id}</td>
                                    <td>{lector.ru || '—'}</td>
                                    <td>{lector.ci}</td>
                                    <td>{lector.nombres}</td>
                                    <td>{`${lector.ap || ''} ${lector.am || ''}`.trim() || '—'}</td>
                                    <td>{lector.correo || '—'}</td>
                                    <td>{lector.telefono || '—'}</td>
                                    <td>{lector.tipo_lector}</td>
                                    <td>
                                        <span
                                            className={`badge ${lector.estado === 'ACTIVO'
                                                ? 'disponible'
                                                : 'prestado'
                                                }`}
                                        >
                                            {lector.estado}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-toggle"
                                            onClick={() => handleToggleEstado(lector.id)}
                                            style={{ marginRight: '5px' }}
                                        >
                                            {lector.estado === 'ACTIVO' ? 'Sancionar' : 'Activar'}
                                        </button>

                                        <button onClick={() => openEditModal(lector)}>
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {lectores.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '15px'
                    }}
                >
                    <button
                        className="btn-page"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </button>

                    <span>
                        Página <strong>{currentPage}</strong> de{' '}
                        <strong>{totalPages || 1}</strong>
                    </span>

                    <button
                        className="btn-page"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {addModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Agregar Lector</h3>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-form">
                                <div>
                                    <label>RU:</label>
                                    <input
                                        name="ru"
                                        placeholder="Registro universitario"
                                        value={form.ru}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>CI:</label>
                                    <input
                                        name="ci"
                                        placeholder="Cédula de identidad"
                                        value={form.ci}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Nombres:</label>
                                    <input
                                        name="nombres"
                                        placeholder="Nombres"
                                        value={form.nombres}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Apellido paterno:</label>
                                    <input
                                        name="ap"
                                        placeholder="Apellido paterno"
                                        value={form.ap}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Apellido materno:</label>
                                    <input
                                        name="am"
                                        placeholder="Apellido materno"
                                        value={form.am}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Correo:</label>
                                    <input
                                        name="correo"
                                        type="email"
                                        placeholder="correo@ejemplo.com"
                                        value={form.correo}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div>
                                    <label>Teléfono:</label>
                                    <input
                                        name="telefono"
                                        type="tel"
                                        inputMode="numeric"
                                        placeholder="Teléfono"
                                        value={form.telefono}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label>Tipo de lector:</label>
                                    <select
                                        name="tipo_lector"
                                        value={form.tipo_lector}
                                        onChange={handleChange}
                                    >
                                        <option value="ESTUDIANTE">Estudiante</option>
                                        <option value="DOCENTE">Docente</option>
                                        <option value="EXTERNO">Externo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={closeAddModal}
                                >
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

            {editModal.open && editModal.data && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h3>Editar Lector</h3>

                        <div
                            style={{
                                display: 'grid',
                                gap: '12px',
                                margin: '15px 0',
                                textAlign: 'left'
                            }}
                        >
                            <div>
                                <label>RU:</label>
                                <input
                                    name="ru"
                                    value={editModal.data.ru || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>CI:</label>
                                <input
                                    name="ci"
                                    value={editModal.data.ci || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Nombres:</label>
                                <input
                                    name="nombres"
                                    value={editModal.data.nombres || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Apellido paterno:</label>
                                <input
                                    name="ap"
                                    value={editModal.data.ap || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Apellido materno:</label>
                                <input
                                    name="am"
                                    value={editModal.data.am || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Correo:</label>
                                <input
                                    name="correo"
                                    type="email"
                                    value={editModal.data.correo || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Teléfono:</label>
                                <input
                                    name="telefono"
                                    type="tel"
                                    inputMode="numeric"
                                    value={editModal.data.telefono || ''}
                                    onChange={handleEditChange}
                                />
                            </div>

                            <div>
                                <label>Tipo Lector:</label>
                                <select
                                    name="tipo_lector"
                                    value={editModal.data.tipo_lector}
                                    onChange={handleEditChange}
                                >
                                    <option value="ESTUDIANTE">Estudiante</option>
                                    <option value="DOCENTE">Docente</option>
                                    <option value="EXTERNO">Externo</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={closeEditModal}>
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
