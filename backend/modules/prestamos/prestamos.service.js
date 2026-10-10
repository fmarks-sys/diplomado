import * as repo from './prestamos.repository.js';

const errorHttp = (status, message) => Object.assign(new Error(message), { status });
const validarId = (valor, campo, status = 400) => {
    const numero = Number(valor);
    if (!['string', 'number'].includes(typeof valor) || !/^\d+$/.test(String(valor))
        || !Number.isInteger(numero) || numero < 1 || numero > 2147483647) {
        throw errorHttp(status, `${campo} inválido`);
    }
    return numero;
};

// LISTAR TODOS LOS PRÉSTAMOS
export const listPrestamos = async () => {

    // Actualizar automáticamente préstamos vencidos
    await repo.updateVencidos();

    return await repo.getAllPrestamos();
};


// CREAR PRÉSTAMO
export const addPrestamo = async (data) => {

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw errorHttp(400, 'Datos de préstamo requeridos');
    }
    const {
        lector_id,
        recurso_id,
        fecha_devolucion_prevista,
        tipo_prestamo
    } = data;

    // 1. CAMPOS OBLIGATORIOS
    if (
        lector_id === undefined ||
        lector_id === null ||
        recurso_id === undefined ||
        recurso_id === null ||
        !fecha_devolucion_prevista
    ) {

        throw errorHttp(400,
            'Lector, recurso y fecha de devolución son requeridos'
        );
    }


    // 2. VALIDAR IDs
    const lectorId = validarId(lector_id, 'ID de lector');
    const recursoId = validarId(recurso_id, 'ID de recurso');


    // 3. VALIDAR TIPO DE PRÉSTAMO
    if (tipo_prestamo != null && typeof tipo_prestamo !== 'string') {
        throw errorHttp(400, 'Tipo de préstamo inválido');
    }
    const tipoPrestamo = (
        tipo_prestamo || 'DOMICILIO'
    )
        .trim()
        .toUpperCase();


    if (
        !['SALA', 'DOMICILIO']
            .includes(tipoPrestamo)
    ) {

        throw errorHttp(400,
            'Tipo de préstamo inválido'
        );
    }


    // 4. VALIDAR FECHA
    const fechaRegex =
        /^\d{4}-\d{2}-\d{2}$/;


    if (
        typeof fecha_devolucion_prevista !== 'string' || !fechaRegex.test(
            fecha_devolucion_prevista
        )
    ) {

        throw errorHttp(400,
            'La fecha debe tener formato YYYY-MM-DD'
        );
    }


    // Evitar fechas imposibles como 2026-02-31
    const [
        anioFecha,
        mesFecha,
        diaFecha
    ] = fecha_devolucion_prevista
        .split('-')
        .map(Number);


    const fechaValidacion = new Date(
        anioFecha,
        mesFecha - 1,
        diaFecha
    );


    if (
        fechaValidacion.getFullYear()
        !== anioFecha ||

        fechaValidacion.getMonth()
        !== mesFecha - 1 ||

        fechaValidacion.getDate()
        !== diaFecha
    ) {

        throw errorHttp(400,
            'Fecha de devolución inválida'
        );
    }


    // Obtener fecha actual local en YYYY-MM-DD
    const hoy = new Date();

    const anio =
        hoy.getFullYear();

    const mes =
        String(
            hoy.getMonth() + 1
        ).padStart(2, '0');

    const dia =
        String(
            hoy.getDate()
        ).padStart(2, '0');


    const fechaHoy =
        `${anio}-${mes}-${dia}`;


    // Permitimos devolución HOY,
    // pero nunca una fecha anterior.
    if (
        fecha_devolucion_prevista
        < fechaHoy
    ) {

        throw errorHttp(400,
            'La fecha de devolución no puede ser anterior a hoy'
        );
    }


    // 5. VALIDAR LECTOR
    const lector =
        await repo.getLectorById(
            lectorId
        );


    if (!lector) {

        throw errorHttp(404,
            'Lector no existe'
        );
    }


    // Solo lectores ACTIVOS
    if (
        lector.estado !== 'ACTIVO'
    ) {

        throw errorHttp(409,
            `El lector no está habilitado para préstamos. Estado actual: ${lector.estado}`
        );
    }


    // 6. VALIDAR RECURSO
    const recurso =
        await repo.getRecursoById(
            recursoId
        );


    if (!recurso) {

        throw errorHttp(404,
            'Recurso no existe'
        );
    }

    // 7. VALIDAR ESTADO DEL RECURSO
    if (
        recurso.estado !== 'DISPONIBLE'
    ) {

        throw errorHttp(409,
            `El recurso no está disponible. Estado actual: ${recurso.estado}`
        );
    }


    // 8. REGLA PARA TESIS
    if (
        recurso.tipo_recurso === 'TESIS' &&
        tipoPrestamo !== 'SALA'
    ) {

        throw errorHttp(400,
            'Las tesis solo pueden prestarse en sala'
        );
    }


    // 9. VALIDACIÓN PRELIMINAR DE STOCK
    //
    // Repository vuelve a comprobarlo dentro de la
    // transacción para evitar problemas de concurrencia.
    if (
        Number(
            recurso.cantidad_disponible
        ) <= 0
    ) {

        throw errorHttp(409,
            'No hay unidades disponibles'
        );
    }


    // 10. CREAR PRÉSTAMO
    return await repo.executeCreatePrestamoTx(
        lectorId,
        recursoId,
        fecha_devolucion_prevista,
        tipoPrestamo
    );
};


// DEVOLVER PRÉSTAMO
export const devolverPrestamo = async (id) => {

    const prestamoId = validarId(id, 'ID de préstamo');


    return await repo.executeDevolucionTx(
        prestamoId
    );
};


// MIS PRÉSTAMOS
export const listMisPrestamos = async (
    personaId
) => {

    const id = validarId(personaId, 'Identificador de persona en el token', 401);


    await repo.updateVencidos();


    return await repo.getPrestamosByPersona(
        id
    );
};


// MIS ALERTAS
export const listMisAlertas = async (
    personaId
) => {

    const id = validarId(personaId, 'Identificador de persona en el token', 401);


    await repo.updateVencidos();


    return await repo.getAlertasByPersona(
        id
    );
};
