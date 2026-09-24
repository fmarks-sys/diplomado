import * as repo from './prestamos.repository.js';


// ======================================================
// LISTAR TODOS LOS PRÉSTAMOS
// ======================================================
export const listPrestamos = async () => {

    // Actualizar automáticamente préstamos vencidos
    await repo.updateVencidos();

    return await repo.getAllPrestamos();
};


// ======================================================
// CREAR PRÉSTAMO
// ======================================================
export const addPrestamo = async (data) => {

    const {
        lector_id,
        recurso_id,
        fecha_devolucion_prevista,
        tipo_prestamo
    } = data;


    // ==================================================
    // 1. CAMPOS OBLIGATORIOS
    // ==================================================
    if (
        lector_id === undefined ||
        lector_id === null ||
        recurso_id === undefined ||
        recurso_id === null ||
        !fecha_devolucion_prevista
    ) {

        throw new Error(
            'Lector, recurso y fecha de devolución son requeridos'
        );
    }


    // ==================================================
    // 2. VALIDAR IDs
    // ==================================================
    const lectorId = Number(lector_id);
    const recursoId = Number(recurso_id);


    if (
        !Number.isInteger(lectorId) ||
        lectorId <= 0
    ) {

        throw new Error(
            'ID de lector inválido'
        );
    }


    if (
        !Number.isInteger(recursoId) ||
        recursoId <= 0
    ) {

        throw new Error(
            'ID de recurso inválido'
        );
    }


    // ==================================================
    // 3. VALIDAR TIPO DE PRÉSTAMO
    // ==================================================
    const tipoPrestamo = String(
        tipo_prestamo || 'DOMICILIO'
    )
        .trim()
        .toUpperCase();


    if (
        !['SALA', 'DOMICILIO']
            .includes(tipoPrestamo)
    ) {

        throw new Error(
            'Tipo de préstamo inválido'
        );
    }


    // ==================================================
    // 4. VALIDAR FECHA
    // ==================================================
    const fechaRegex =
        /^\d{4}-\d{2}-\d{2}$/;


    if (
        !fechaRegex.test(
            fecha_devolucion_prevista
        )
    ) {

        throw new Error(
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

        throw new Error(
            'Fecha de devolución inválida'
        );
    }


    // ==================================================
    // Obtener fecha actual local en YYYY-MM-DD
    // ==================================================
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

        throw new Error(
            'La fecha de devolución no puede ser anterior a hoy'
        );
    }


    // ==================================================
    // 5. VALIDAR LECTOR
    // ==================================================
    const lector =
        await repo.getLectorById(
            lectorId
        );


    if (!lector) {

        throw new Error(
            'Lector no existe'
        );
    }


    // Solo lectores ACTIVOS
    if (
        lector.estado !== 'ACTIVO'
    ) {

        throw new Error(
            `El lector no está habilitado para préstamos. Estado actual: ${lector.estado}`
        );
    }


    // ==================================================
    // 6. VALIDAR RECURSO
    // ==================================================
    const recurso =
        await repo.getRecursoById(
            recursoId
        );


    if (!recurso) {

        throw new Error(
            'Recurso no existe'
        );
    }


    // ==================================================
    // 7. VALIDAR ESTADO DEL RECURSO
    // ==================================================
    if (
        recurso.estado !== 'DISPONIBLE'
    ) {

        throw new Error(
            `El recurso no está disponible. Estado actual: ${recurso.estado}`
        );
    }


    // ==================================================
    // 8. REGLA PARA TESIS
    // ==================================================
    if (
        recurso.tipo_recurso === 'TESIS' &&
        tipoPrestamo !== 'SALA'
    ) {

        throw new Error(
            'Las tesis solo pueden prestarse en sala'
        );
    }


    // ==================================================
    // 9. VALIDACIÓN PRELIMINAR DE STOCK
    //
    // Repository vuelve a comprobarlo dentro de la
    // transacción para evitar problemas de concurrencia.
    // ==================================================
    if (
        Number(
            recurso.cantidad_disponible
        ) <= 0
    ) {

        throw new Error(
            'No hay unidades disponibles'
        );
    }


    // ==================================================
    // 10. CREAR PRÉSTAMO
    // ==================================================
    return await repo.executeCreatePrestamoTx(
        lectorId,
        recursoId,
        fecha_devolucion_prevista,
        tipoPrestamo
    );
};


// ======================================================
// DEVOLVER PRÉSTAMO
// ======================================================
export const devolverPrestamo = async (id) => {

    const prestamoId = Number(id);


    if (
        !Number.isInteger(prestamoId) ||
        prestamoId <= 0
    ) {

        throw new Error(
            'ID de préstamo inválido'
        );
    }


    return await repo.executeDevolucionTx(
        prestamoId
    );
};


// ======================================================
// MIS PRÉSTAMOS
// ======================================================
export const listMisPrestamos = async (
    personaId
) => {

    const id = Number(personaId);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        throw new Error(
            'Persona inválida'
        );
    }


    await repo.updateVencidos();


    return await repo.getPrestamosByPersona(
        id
    );
};


// ======================================================
// MIS ALERTAS
// ======================================================
export const listMisAlertas = async (
    personaId
) => {

    const id = Number(personaId);


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {

        throw new Error(
            'Persona inválida'
        );
    }


    await repo.updateVencidos();


    return await repo.getAlertasByPersona(
        id
    );
};