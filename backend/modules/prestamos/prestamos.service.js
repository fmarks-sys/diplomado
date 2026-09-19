import * as repo from './prestamos.repository.js';

//lista actualizada de prestamos vencidos
export const listPrestamos = async () => {
    await repo.updateVencidos(); // automático
    return await repo.getAllPrestamos();
};

// 🔹 CREAR
export const addPrestamo = async (data) => {
    const { lector_id, recurso_id, fecha_devolucion_prevista, tipo_prestamo } = data;

    // 1. Validar campos obligatorios
    if (!lector_id || !recurso_id || !fecha_devolucion_prevista) {
        throw new Error('Campos requeridos');
    }

    const tipo = tipo_prestamo || 'DOMICILIO';

    // 2. Validar Lector
    const lector = await repo.getLectorById(Number(lector_id));
    if (!lector) throw new Error('Lector no existe');
    // if (lector.estado === 'SANCIONADO' || lector.estado === 'INACTIVO') {
    if (lector.estado === 'SANCIONADO'){
        throw new Error('El lector no está habilitado para préstamos');
    }

    // 3. Validar Recurso (aquí sí existe la variable `recurso`)
    const recurso = await repo.getRecursoById(Number(recurso_id));
    if (!recurso) throw new Error('Recurso no existe');

    // Validar estado físico del recurso (MANTENIMIENTO / BAJA)
    if (recurso.estado !== 'DISPONIBLE') {
        throw new Error(`El recurso no está disponible para préstamo (Estado actual: ${recurso.estado})`);
    }

    // 4. Regla especial TESIS
    if (recurso.tipo_recurso === 'TESIS' && tipo !== 'SALA') {
        throw new Error('Las tesis solo se prestan en sala');
    }

    // 5. Validar Stock
    if (recurso.cantidad_disponible <= 0) {
        throw new Error('No hay stock disponible');
    }

    //  Ejecutar Préstamo + Transacción
    return await repo.executeCreatePrestamoTx(
        lector_id,
        recurso_id,
        fecha_devolucion_prevista,
        tipo
    );
};

//  DEVOLVER
export const devolverPrestamo = async (id) => {
    if (!id) throw new Error('ID requerido');
    return await repo.executeDevolucionTx(id);
};

//lector
export const listMisPrestamos = async (usuario_id) => {
    await repo.updateVencidos();
    return await repo.getPrestamosByUsuario(usuario_id);
};

///
export const listMisAlertas = async (usuario_id) => {
    await repo.updateVencidos();
    return await repo.getAlertasByUsuario(usuario_id);
};