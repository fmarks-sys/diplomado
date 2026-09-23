import { useEffect, useState } from 'react';

import {
    getUsuarios,
    createUsuario,
    createUsuarioFromPersona,
    updateUsuario,
    changeEstadoUsuario
} from '../../services/usuariosService';

import './usuarios.css';


const UsuariosPage = () => {

    const [usuarios, setUsuarios] = useState([]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const initialForm = {
        ci: '',
        nombres: '',
        ap: '',
        am: '',
        correo: '',
        telefono: '',
        username: '',
        password: '',
        rol_id: '1'
    };


    // =========================
    // MODALES
    // =========================

    const [createModal, setCreateModal] = useState(false);

    const [editModal, setEditModal] = useState({
        open: false,
        data: null
    });

    const [statusModal, setStatusModal] = useState({
        open: false,
        user: null,
        estado: ''
    });

    const [modal, setModal] = useState({
        open: false,
        message: '',
        type: 'success'
    });


    // =========================
    // FORMULARIOS
    // =========================

    const [form, setForm] = useState(initialForm);

    const [tipoRegistro, setTipoRegistro] =
        useState('NUEVO');

    const [personaId, setPersonaId] =
        useState('');


    const showModal = (message, type = 'success') => {
        setModal({
            open: true,
            message,
            type
        });
    };


    // =========================
    // CARGAR
    // =========================

    const loadUsuarios = async () => {

        try {

            const data = await getUsuarios();

            setUsuarios(data);

        } catch (error) {

            console.error(error);

            showModal(
                error.message || 'Error cargando usuarios',
                'error'
            );
        }
    };


    useEffect(() => {
        loadUsuarios();
    }, []);


    // =========================
    // PAGINACIÓN
    // =========================

    const totalPages =
        Math.ceil(usuarios.length / itemsPerPage);

    const last =
        currentPage * itemsPerPage;

    const first =
        last - itemsPerPage;

    const currentUsuarios =
        usuarios.slice(first, last);


    useEffect(() => {

        if (
            currentPage > totalPages &&
            totalPages > 0
        ) {
            setCurrentPage(totalPages);
        }

    }, [
        usuarios.length,
        totalPages,
        currentPage
    ]);


    // =========================
    // INPUTS
    // =========================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };


    const handleEditChange = (e) => {

        const { name, value } = e.target;

        setEditModal(prev => ({
            ...prev,

            data: {
                ...prev.data,
                [name]: value
            }
        }));
    };


    // =========================
    // ABRIR CREAR
    // =========================

    const openCreate = () => {

        setForm(initialForm);

        setTipoRegistro('NUEVO');

        setPersonaId('');

        setCreateModal(true);
    };


    // =========================
    // CREAR
    // =========================

    const handleCreate = async (e) => {

        e.preventDefault();

        try {

            // -------------------------
            // PERSONA NUEVA
            // -------------------------

            if (tipoRegistro === 'NUEVO') {

                if (
                    !form.ci ||
                    !form.nombres ||
                    !form.ap ||
                    !form.am ||
                    !form.correo ||
                    !form.username ||
                    !form.password ||
                    !form.rol_id
                ) {
                    showModal(
                        'Complete los campos obligatorios',
                        'error'
                    );

                    return;
                }


                await createUsuario({
                    ...form,
                    rol_id: Number(form.rol_id)
                });
            }


            // -------------------------
            // PERSONA EXISTENTE
            // -------------------------

            else {

                if (
                    !personaId ||
                    !form.username ||
                    !form.password ||
                    !form.rol_id
                ) {
                    showModal(
                        'Persona, username, contraseña y rol son obligatorios',
                        'error'
                    );

                    return;
                }


                await createUsuarioFromPersona(
                    personaId,
                    {
                        username: form.username,
                        password: form.password,
                        rol_id: Number(form.rol_id)
                    }
                );
            }


            setCreateModal(false);

            setForm(initialForm);

            await loadUsuarios();

            showModal(
                'Usuario registrado correctamente'
            );


        } catch (error) {

            showModal(
                error.message,
                'error'
            );
        }
    };


    // =========================
    // EDITAR
    // =========================

    const openEdit = (usuario) => {

        setEditModal({
            open: true,

            data: {
                ...usuario,
                rol_id: String(usuario.rol_id)
            }
        });
    };


    const handleSaveEdit = async () => {

        try {

            const data = editModal.data;

            if (
                !data.ci ||
                !data.nombres ||
                !data.ap ||
                !data.am ||
                !data.correo ||
                !data.username ||
                !data.rol_id
            ) {
                showModal(
                    'Complete los campos obligatorios',
                    'error'
                );

                return;
            }


            await updateUsuario(
                data.login_id,
                {
                    ci: data.ci,
                    nombres: data.nombres,
                    ap: data.ap,
                    am: data.am,
                    correo: data.correo,
                    telefono: data.telefono,
                    username: data.username,
                    rol_id: Number(data.rol_id)
                }
            );


            setEditModal({
                open: false,
                data: null
            });


            await loadUsuarios();

            showModal(
                'Usuario actualizado correctamente'
            );


        } catch (error) {

            showModal(
                error.message,
                'error'
            );
        }
    };


    // =========================
    // ESTADO
    // =========================

    const confirmStatus = async () => {

        try {

            await changeEstadoUsuario(
                statusModal.user.login_id,
                statusModal.estado
            );


            setStatusModal({
                open: false,
                user: null,
                estado: ''
            });


            await loadUsuarios();

            showModal(
                'Estado actualizado correctamente'
            );


        } catch (error) {

            showModal(
                error.message,
                'error'
            );
        }
    };


    // =========================
    // RENDER
    // =========================

    return (

        <div className="usuarios-page">

            {/* HEADER */}

            <div className="usuarios-header">

                <h2 className="usuarios-title">
                    Gestión de Usuarios
                </h2>

                <button
                    className="btn-primary"
                    onClick={openCreate}
                >
                    + Agregar Usuario
                </button>

            </div>


            {/* TABLA */}

            <div className="usuarios-table">

                <table className="table">

                    <thead>

                        <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>CI</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Lector</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>

                    </thead>


                    <tbody>

                        {currentUsuarios.map(user => (

                            <tr key={user.login_id}>

                                <td>
                                    <strong>
                                        {user.username}
                                    </strong>
                                </td>

                                <td>
                                    {user.nombres}{' '}
                                    {user.ap}{' '}
                                    {user.am}
                                </td>

                                <td>
                                    {user.ci}
                                </td>

                                <td>
                                    {user.correo}
                                </td>

                                <td>
                                    <span className="role-badge">
                                        {user.rol}
                                    </span>
                                </td>

                                <td>
                                    {user.es_lector
                                        ? 'Sí'
                                        : 'No'}
                                </td>

                                <td>

                                    <span
                                        className={
                                            `badge ${user.estado.toLowerCase()}`
                                        }
                                    >
                                        {user.estado}
                                    </span>

                                </td>

                                <td>

                                    <div className="action-buttons">

                                        <button
                                            className="btn-edit"
                                            onClick={() =>
                                                openEdit(user)
                                            }
                                        >
                                            Editar
                                        </button>


                                        {user.estado !== 'ACTIVO' && (

                                            <button
                                                className="btn-active"
                                                onClick={() =>
                                                    setStatusModal({
                                                        open: true,
                                                        user,
                                                        estado: 'ACTIVO'
                                                    })
                                                }
                                            >
                                                Activar
                                            </button>

                                        )}


                                        {user.estado === 'ACTIVO' && (

                                            <>
                                                <button
                                                    className="btn-block"
                                                    onClick={() =>
                                                        setStatusModal({
                                                            open: true,
                                                            user,
                                                            estado: 'BLOQUEADO'
                                                        })
                                                    }
                                                >
                                                    Bloquear
                                                </button>

                                                <button
                                                    className="btn-disable"
                                                    onClick={() =>
                                                        setStatusModal({
                                                            open: true,
                                                            user,
                                                            estado: 'INACTIVO'
                                                        })
                                                    }
                                                >
                                                    Inhabilitar
                                                </button>
                                            </>

                                        )}

                                    </div>

                                </td>

                            </tr>

                        ))}


                        {usuarios.length === 0 && (

                            <tr>

                                <td
                                    colSpan="8"
                                    className="empty-table"
                                >
                                    No existen usuarios registrados
                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>


            {/* PAGINACIÓN */}

            {usuarios.length > 0 && (

                <div className="pagination">

                    <button
                        className="btn-page"
                        disabled={currentPage === 1}
                        onClick={() =>
                            setCurrentPage(
                                prev => prev - 1
                            )
                        }
                    >
                        Anterior
                    </button>


                    <span>
                        Página{' '}
                        <strong>{currentPage}</strong>
                        {' '}de{' '}
                        <strong>
                            {totalPages || 1}
                        </strong>
                    </span>


                    <button
                        className="btn-page"
                        disabled={
                            currentPage === totalPages ||
                            totalPages === 0
                        }
                        onClick={() =>
                            setCurrentPage(
                                prev => prev + 1
                            )
                        }
                    >
                        Siguiente
                    </button>

                </div>

            )}


            {/* ===================================== */}
            {/* MODAL CREAR */}
            {/* ===================================== */}

            {createModal && (

                <div className="modal-overlay">

                    <div className="modal-box usuario-modal">

                        <h3>Agregar Usuario</h3>


                        <div className="register-type">

                            <button
                                type="button"
                                className={
                                    tipoRegistro === 'NUEVO'
                                        ? 'selected'
                                        : ''
                                }
                                onClick={() =>
                                    setTipoRegistro('NUEVO')
                                }
                            >
                                Persona nueva
                            </button>

                            <button
                                type="button"
                                className={
                                    tipoRegistro === 'EXISTENTE'
                                        ? 'selected'
                                        : ''
                                }
                                onClick={() =>
                                    setTipoRegistro('EXISTENTE')
                                }
                            >
                                Persona existente
                            </button>

                        </div>


                        <form
                            onSubmit={handleCreate}
                            className="usuario-form"
                        >

                            {tipoRegistro === 'NUEVO' && (

                                <>

                                    <h4>
                                        Datos personales
                                    </h4>

                                    <div className="usuario-grid">

                                        <div>
                                            <label>CI *</label>
                                            <input
                                                name="ci"
                                                value={form.ci}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div>
                                            <label>Nombres *</label>
                                            <input
                                                name="nombres"
                                                value={form.nombres}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div>
                                            <label>Apellido paterno *</label>
                                            <input
                                                name="ap"
                                                value={form.ap}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div>
                                            <label>Apellido materno *</label>
                                            <input
                                                name="am"
                                                value={form.am}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div>
                                            <label>Correo *</label>
                                            <input
                                                type="email"
                                                name="correo"
                                                value={form.correo}
                                                onChange={handleChange}
                                            />
                                        </div>

                                        <div>
                                            <label>Teléfono</label>
                                            <input
                                                name="telefono"
                                                value={form.telefono}
                                                onChange={handleChange}
                                            />
                                        </div>

                                    </div>

                                </>

                            )}


                            {tipoRegistro === 'EXISTENTE' && (

                                <div>

                                    <label>
                                        ID Persona / Lector *
                                    </label>

                                    <input
                                        type="number"
                                        value={personaId}
                                        onChange={(e) =>
                                            setPersonaId(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Ej: 15"
                                    />

                                    <small>
                                        Utilice el ID de una persona
                                        ya registrada como lector.
                                    </small>

                                </div>

                            )}


                            <h4>
                                Acceso al sistema
                            </h4>


                            <div className="usuario-grid">

                                <div>
                                    <label>Username *</label>

                                    <input
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                    />
                                </div>


                                <div>
                                    <label>Contraseña *</label>

                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                    />
                                </div>


                                <div>
                                    <label>Rol *</label>

                                    <select
                                        name="rol_id"
                                        value={form.rol_id}
                                        onChange={handleChange}
                                    >
                                        <option value="1">
                                            BIBLIOTECARIO
                                        </option>

                                        <option value="2">
                                            LECTOR
                                        </option>
                                    </select>

                                </div>

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() =>
                                        setCreateModal(false)
                                    }
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


            {/* ===================================== */}
            {/* MODAL EDITAR */}
            {/* ===================================== */}

            {editModal.open && editModal.data && (

                <div className="modal-overlay">

                    <div className="modal-box usuario-modal">

                        <h3>
                            Editar Usuario
                        </h3>


                        <div className="usuario-form">

                            <h4>Datos personales</h4>

                            <div className="usuario-grid">

                                <div>
                                    <label>CI *</label>
                                    <input
                                        name="ci"
                                        value={editModal.data.ci || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div>
                                    <label>Nombres *</label>
                                    <input
                                        name="nombres"
                                        value={editModal.data.nombres || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div>
                                    <label>Apellido paterno *</label>
                                    <input
                                        name="ap"
                                        value={editModal.data.ap || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div>
                                    <label>Apellido materno *</label>
                                    <input
                                        name="am"
                                        value={editModal.data.am || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div>
                                    <label>Correo *</label>
                                    <input
                                        type="email"
                                        name="correo"
                                        value={editModal.data.correo || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div>
                                    <label>Teléfono</label>
                                    <input
                                        name="telefono"
                                        value={editModal.data.telefono || ''}
                                        onChange={handleEditChange}
                                    />
                                </div>

                            </div>


                            <h4>Acceso al sistema</h4>


                            <div className="usuario-grid">

                                <div>
                                    <label>Username *</label>

                                    <input
                                        name="username"
                                        value={
                                            editModal.data.username || ''
                                        }
                                        onChange={handleEditChange}
                                    />
                                </div>


                                <div>
                                    <label>Rol *</label>

                                    <select
                                        name="rol_id"
                                        value={
                                            editModal.data.rol_id || ''
                                        }
                                        onChange={handleEditChange}
                                    >
                                        <option value="1">
                                            BIBLIOTECARIO
                                        </option>

                                        <option value="2">
                                            LECTOR
                                        </option>
                                    </select>

                                </div>

                            </div>


                            <div className="modal-actions">

                                <button
                                    className="btn-cancel"
                                    onClick={() =>
                                        setEditModal({
                                            open: false,
                                            data: null
                                        })
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    onClick={handleSaveEdit}
                                >
                                    Guardar Cambios
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}


            {/* ===================================== */}
            {/* CONFIRMAR ESTADO */}
            {/* ===================================== */}

            {statusModal.open && (

                <div className="modal-overlay">

                    <div className="modal-box warning">

                        <h3>
                            Confirmar operación
                        </h3>

                        <p>
                            ¿Desea cambiar el estado de{' '}
                            <strong>
                                {statusModal.user?.username}
                            </strong>
                            {' '}a{' '}
                            <strong>
                                {statusModal.estado}
                            </strong>
                            ?
                        </p>


                        <div className="modal-actions">

                            <button
                                onClick={confirmStatus}
                            >
                                Sí
                            </button>

                            <button
                                className="btn-cancel"
                                onClick={() =>
                                    setStatusModal({
                                        open: false,
                                        user: null,
                                        estado: ''
                                    })
                                }
                            >
                                Cancelar
                            </button>

                        </div>

                    </div>

                </div>

            )}


            {/* ===================================== */}
            {/* MENSAJE */}
            {/* ===================================== */}

            {modal.open && (

                <div className="modal-overlay">

                    <div
                        className={
                            `modal-box ${modal.type}`
                        }
                    >

                        <p>{modal.message}</p>

                        <button
                            className="btn-ok"
                            onClick={() =>
                                setModal({
                                    open: false,
                                    message: '',
                                    type: 'success'
                                })
                            }
                        >
                            Aceptar
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
};


export default UsuariosPage;