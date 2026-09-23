import {
    useEffect,
    useState
} from 'react';

import {
    getPrestamos,
    createPrestamo,
    devolverPrestamo
} from '../../services/prestamosService';

import {
    getLectores
} from '../../services/lectoresService';

import {
    getRecursos
} from '../../services/recursosService';

import './prestamos.css';


const PrestamosPage = () => {

    // ==================================================
    // DATOS
    // ==================================================
    const [prestamos, setPrestamos] = useState([]);
    const [lectores, setLectores] = useState([]);
    const [recursos, setRecursos] = useState([]);


    // ==================================================
    // ESTADOS GENERALES
    // ==================================================
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] =
        useState(false);


    // ==================================================
    // AUTOCOMPLETADO
    // ==================================================
    const [searchLector, setSearchLector] =
        useState('');

    const [searchRecurso, setSearchRecurso] =
        useState('');


    // ==================================================
    // FECHA LOCAL
    // ==================================================
    const getTodayLocalDate = () => {

        const today = new Date();

        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, '0');

        const day =
            String(
                today.getDate()
            ).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };


    // ==================================================
    // FORMULARIO
    //
    // fecha_prestamo NO se envía.
    // PostgreSQL/backend la genera automáticamente.
    // ==================================================
    const createInitialFormState = () => ({
        lector_id: '',
        recurso_id: '',
        fecha_devolucion_prevista:
            getTodayLocalDate(),
        tipo_prestamo: 'DOMICILIO'
    });


    const [form, setForm] = useState(
        createInitialFormState
    );


    // ==================================================
    // PAGINACIÓN
    // ==================================================
    const [currentPage, setCurrentPage] =
        useState(1);

    const itemsPerPage = 5;


    // ==================================================
    // FORMATEAR FECHA
    //
    // Evitamos new Date("YYYY-MM-DD") para no generar
    // desplazamientos por zona horaria.
    // ==================================================
    const formatDate = (value) => {

        if (!value) {
            return '—';
        }

        const fecha =
            String(value).substring(0, 10);

        const partes =
            fecha.split('-');

        if (partes.length !== 3) {
            return value;
        }

        const [year, month, day] =
            partes;

        return `${day}/${month}/${year}`;
    };


    // ==================================================
    // NOMBRE COMPLETO DEL LECTOR
    // ==================================================
    const getLectorNombre = (lector) => {

        return [
            lector.nombres,
            lector.ap,
            lector.am
        ]
            .filter(Boolean)
            .join(' ');
    };


    // ==================================================
    // TEXTO PARA AUTOCOMPLETADO DEL LECTOR
    // ==================================================
    const getLectorOptionText = (lector) => {

        const nombre =
            getLectorNombre(lector);

        const ci =
            lector.ci
                ? ` (CI: ${lector.ci})`
                : '';

        const ru =
            lector.ru
                ? ` - RU: ${lector.ru}`
                : '';

        return `${nombre}${ci}${ru}`;
    };


    // ==================================================
    // TEXTO DEL RECURSO
    // ==================================================
    const getRecursoOptionText = (recurso) => {

        return (
            `${recurso.titulo} - ` +
            `[${recurso.codigo_topografico}]`
        );
    };


    // ==================================================
    // CARGAR DATOS
    // ==================================================
    const loadData = async () => {

        try {

            setLoading(true);


            const [
                dataPrestamos,
                dataLectores,
                dataRecursos
            ] = await Promise.all([
                getPrestamos(),
                getLectores(),
                getRecursos()
            ]);


            setPrestamos(
                Array.isArray(dataPrestamos)
                    ? dataPrestamos
                    : []
            );


            // Solo lectores habilitados
            setLectores(
                Array.isArray(dataLectores)
                    ? dataLectores.filter(
                        lector =>
                            lector.estado === 'ACTIVO'
                    )
                    : []
            );


            // Solo recursos disponibles
            setRecursos(
                Array.isArray(dataRecursos)
                    ? dataRecursos.filter(
                        recurso =>
                            recurso.estado === 'DISPONIBLE' &&
                            Number(
                                recurso.cantidad_disponible
                            ) > 0
                    )
                    : []
            );


        } catch (error) {

            console.error(
                'Error al cargar préstamos:',
                error
            );

            alert(
                error.message ||
                'Error al cargar los datos'
            );


        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadData();
    }, []);


    // ==================================================
    // PAGINACIÓN
    // ==================================================
    const totalPages =
        Math.ceil(
            prestamos.length /
            itemsPerPage
        );


    const indexOfLastItem =
        currentPage * itemsPerPage;


    const indexOfFirstItem =
        indexOfLastItem -
        itemsPerPage;


    const currentPrestamos =
        prestamos.slice(
            indexOfFirstItem,
            indexOfLastItem
        );


    useEffect(() => {

        if (
            currentPage > totalPages &&
            totalPages > 0
        ) {

            setCurrentPage(totalPages);
        }

    }, [
        prestamos.length,
        totalPages,
        currentPage
    ]);


    // ==================================================
    // ABRIR MODAL
    // ==================================================
    const openModal = () => {

        setForm(
            createInitialFormState()
        );

        setSearchLector('');
        setSearchRecurso('');

        setIsModalOpen(true);
    };


    // ==================================================
    // CERRAR MODAL
    // ==================================================
    const closeModal = () => {

        if (saving) {
            return;
        }

        setIsModalOpen(false);

        setSearchLector('');
        setSearchRecurso('');

        setForm(
            createInitialFormState()
        );
    };


    // ==================================================
    // SELECCIONAR LECTOR
    // ==================================================
    const handleLectorChange = (e) => {

        const value =
            e.target.value;

        setSearchLector(value);


        const lectorEncontrado =
            lectores.find(
                lector =>
                    getLectorOptionText(
                        lector
                    ) === value
            );


        setForm(prev => ({
            ...prev,

            lector_id:
                lectorEncontrado
                    ? lectorEncontrado.id
                    : ''
        }));
    };


    // ==================================================
    // SELECCIONAR RECURSO
    // ==================================================
    const handleRecursoChange = (e) => {

        const value =
            e.target.value;

        setSearchRecurso(value);


        const recursoEncontrado =
            recursos.find(
                recurso =>
                    getRecursoOptionText(
                        recurso
                    ) === value
            );


        setForm(prev => ({
            ...prev,

            recurso_id:
                recursoEncontrado
                    ? recursoEncontrado.id
                    : ''
        }));
    };


    // ==================================================
    // INPUT NORMAL
    // ==================================================
    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;


        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };


    // ==================================================
    // REGISTRAR PRÉSTAMO
    // ==================================================
    const handleSubmit = async (e) => {

        e.preventDefault();


        if (!form.lector_id) {

            alert(
                'Debes seleccionar un lector válido'
            );

            return;
        }


        if (!form.recurso_id) {

            alert(
                'Debes seleccionar un recurso válido'
            );

            return;
        }


        if (
            !form.fecha_devolucion_prevista
        ) {

            alert(
                'Debes seleccionar la fecha de devolución'
            );

            return;
        }


        try {

            setSaving(true);


            // Solo enviamos lo que espera el backend.
            const payload = {

                lector_id:
                    Number(form.lector_id),

                recurso_id:
                    Number(form.recurso_id),

                fecha_devolucion_prevista:
                    form.fecha_devolucion_prevista,

                tipo_prestamo:
                    form.tipo_prestamo
            };


            await createPrestamo(
                payload
            );


            setIsModalOpen(false);

            setSearchLector('');
            setSearchRecurso('');

            setForm(
                createInitialFormState()
            );


            setCurrentPage(1);

            await loadData();


            alert(
                'Préstamo registrado correctamente'
            );


        } catch (error) {

            console.error(
                'Error al registrar préstamo:',
                error
            );

            alert(
                error.message ||
                'Error al registrar el préstamo'
            );


        } finally {

            setSaving(false);
        }
    };


    // ==================================================
    // DEVOLVER
    // ==================================================
    const handleDevolver = async (id) => {

        const confirmar =
            window.confirm(
                '¿Registrar la devolución de este recurso?'
            );


        if (!confirmar) {
            return;
        }


        try {

            await devolverPrestamo(id);

            await loadData();


            alert(
                'Devolución registrada correctamente'
            );


        } catch (error) {

            console.error(
                'Error al registrar devolución:',
                error
            );

            alert(
                error.message ||
                'Error al registrar la devolución'
            );
        }
    };


    // ==================================================
    // BADGE
    // ==================================================
    const getEstadoClass = (estado) => {

        switch (estado) {

            case 'PRESTADO':
                return 'prestado';

            case 'VENCIDO':
                return 'vencido';

            case 'DEVUELTO':
                return 'devuelto';

            default:
                return '';
        }
    };


    // ==================================================
    // RENDER
    // ==================================================
    return (

        <div className="prestamos-page">

            {/* ==========================================
                ENCABEZADO
            ========================================== */}

            <div
                style={{
                    display: 'flex',
                    justifyContent:
                        'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}
            >

                <h2
                    className="prestamos-title"
                    style={{ margin: 0 }}
                >
                    Préstamos
                </h2>


                <button
                    type="button"
                    onClick={openModal}

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
                    + Asignar Nuevo Préstamo
                </button>

            </div>


            {/* ==========================================
                TABLA
            ========================================== */}

            <div className="prestamos-table">

                <table className="table">

                    <thead>

                        <tr>

                            <th>ID</th>

                            <th>Lector</th>

                            <th>Recurso</th>

                            <th>Fecha Préstamo</th>

                            <th>
                                Devolución Prevista
                            </th>

                            <th>Tipo</th>

                            <th>Estado</th>

                            <th>Acción</th>

                        </tr>

                    </thead>


                    <tbody>

                        {loading ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    style={{
                                        textAlign:
                                            'center'
                                    }}
                                >
                                    Cargando préstamos...
                                </td>

                            </tr>

                        ) : currentPrestamos.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="8"
                                    style={{
                                        textAlign:
                                            'center'
                                    }}
                                >
                                    No existen préstamos registrados.
                                </td>

                            </tr>

                        ) : (

                            currentPrestamos.map(
                                prestamo => (

                                    <tr
                                        key={
                                            prestamo.id
                                        }
                                    >

                                        <td>
                                            {prestamo.id}
                                        </td>


                                        <td>
                                            {
                                                prestamo.lector_nombre
                                            }
                                        </td>


                                        <td>

                                            <strong>
                                                {
                                                    prestamo.recurso_titulo
                                                }
                                            </strong>

                                            {
                                                prestamo.codigo_topografico &&
                                                (
                                                    <>
                                                        <br />

                                                        <small>
                                                            {
                                                                prestamo.codigo_topografico
                                                            }
                                                        </small>
                                                    </>
                                                )
                                            }

                                        </td>


                                        <td>
                                            {
                                                formatDate(
                                                    prestamo.fecha_prestamo
                                                )
                                            }
                                        </td>


                                        <td>
                                            {
                                                formatDate(
                                                    prestamo.fecha_devolucion_prevista
                                                )
                                            }
                                        </td>


                                        <td>
                                            {
                                                prestamo.tipo_prestamo
                                            }
                                        </td>


                                        <td>

                                            <span
                                                className={
                                                    `badge ${getEstadoClass(
                                                        prestamo.estado
                                                    )}`
                                                }
                                            >
                                                {
                                                    prestamo.estado
                                                }
                                            </span>

                                        </td>


                                        <td>

                                            {(
                                                prestamo.estado ===
                                                'PRESTADO' ||

                                                prestamo.estado ===
                                                'VENCIDO'
                                            ) && (

                                                <button
                                                    type="button"

                                                    className="btn-return"

                                                    onClick={() =>
                                                        handleDevolver(
                                                            prestamo.id
                                                        )
                                                    }
                                                >
                                                    Devolver
                                                </button>
                                            )}

                                            {
                                                prestamo.estado ===
                                                'DEVUELTO' &&
                                                (
                                                    <span>
                                                        —
                                                    </span>
                                                )
                                            }

                                        </td>

                                    </tr>
                                )
                            )
                        )}

                    </tbody>

                </table>

            </div>


            {/* ==========================================
                PAGINACIÓN
            ========================================== */}

            {!loading &&
                prestamos.length > 0 && (

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
                        type="button"

                        className="btn-page"

                        onClick={() =>
                            setCurrentPage(
                                prev =>
                                    Math.max(
                                        1,
                                        prev - 1
                                    )
                            )
                        }

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
                        type="button"

                        className="btn-page"

                        onClick={() =>
                            setCurrentPage(
                                prev =>
                                    Math.min(
                                        totalPages,
                                        prev + 1
                                    )
                            )
                        }

                        disabled={
                            currentPage >=
                            totalPages
                        }
                    >
                        Siguiente
                    </button>

                </div>
            )}


            {/* ==========================================
                MODAL
            ========================================== */}

            {isModalOpen && (

                <div className="modal-overlay">

                    <div
                        className="modal-box"

                        style={{
                            maxWidth: '520px'
                        }}
                    >

                        <h3>
                            Asignar Nuevo Préstamo
                        </h3>


                        <form
                            onSubmit={
                                handleSubmit
                            }

                            style={{
                                display: 'grid',
                                gap: '14px',
                                textAlign: 'left',
                                marginTop: '15px'
                            }}
                        >

                            {/* =========================
                                LECTOR
                            ========================= */}

                            <div>

                                <label>
                                    Buscar Lector *
                                </label>


                                <input
                                    type="text"

                                    list="lista-lectores"

                                    placeholder={
                                        'Escribe nombre, CI o RU...'
                                    }

                                    value={
                                        searchLector
                                    }

                                    onChange={
                                        handleLectorChange
                                    }

                                    autoComplete="off"

                                    required

                                    style={{
                                        width: '100%',
                                        padding: '8px'
                                    }}
                                />


                                <datalist
                                    id="lista-lectores"
                                >

                                    {lectores.map(
                                        lector => (

                                            <option
                                                key={
                                                    lector.id
                                                }

                                                value={
                                                    getLectorOptionText(
                                                        lector
                                                    )
                                                }
                                            />

                                        )
                                    )}

                                </datalist>

                            </div>


                            {/* =========================
                                RECURSO
                            ========================= */}

                            <div>

                                <label>
                                    Buscar Recurso *
                                </label>


                                <input
                                    type="text"

                                    list="lista-recursos"

                                    placeholder={
                                        'Escribe título o código...'
                                    }

                                    value={
                                        searchRecurso
                                    }

                                    onChange={
                                        handleRecursoChange
                                    }

                                    autoComplete="off"

                                    required

                                    style={{
                                        width: '100%',
                                        padding: '8px'
                                    }}
                                />


                                <datalist
                                    id="lista-recursos"
                                >

                                    {recursos.map(
                                        recurso => (

                                            <option
                                                key={
                                                    recurso.id
                                                }

                                                value={
                                                    getRecursoOptionText(
                                                        recurso
                                                    )
                                                }
                                            />

                                        )
                                    )}

                                </datalist>

                            </div>


                            {/* =========================
                                DEVOLUCIÓN
                            ========================= */}

                            <div>

                                <label>
                                    Fecha de Devolución *
                                </label>


                                <input
                                    type="date"

                                    name={
                                        'fecha_devolucion_prevista'
                                    }

                                    value={
                                        form.fecha_devolucion_prevista
                                    }

                                    min={
                                        getTodayLocalDate()
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    required

                                    style={{
                                        width: '100%',
                                        padding: '8px'
                                    }}
                                />

                            </div>


                            {/* =========================
                                TIPO
                            ========================= */}

                            <div>

                                <label>
                                    Tipo de Préstamo *
                                </label>


                                <select
                                    name={
                                        'tipo_prestamo'
                                    }

                                    value={
                                        form.tipo_prestamo
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    required

                                    style={{
                                        width: '100%',
                                        padding: '8px'
                                    }}
                                >

                                    <option
                                        value="DOMICILIO"
                                    >
                                        Domicilio
                                    </option>

                                    <option
                                        value="SALA"
                                    >
                                        Sala
                                    </option>

                                </select>

                            </div>


                            {/* =========================
                                BOTONES
                            ========================= */}

                            <div
                                className="modal-actions"
                            >

                                <button
                                    type="button"

                                    className="btn-cancel"

                                    onClick={
                                        closeModal
                                    }

                                    disabled={
                                        saving
                                    }
                                >
                                    Cancelar
                                </button>


                                <button
                                    type="submit"

                                    disabled={
                                        saving
                                    }
                                >
                                    {
                                        saving
                                            ? 'Registrando...'
                                            : 'Registrar Préstamo'
                                    }
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