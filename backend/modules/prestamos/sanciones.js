// Origen reservado para las sanciones que administra automáticamente CA05.5.
export const MOTIVO_ATRASO = 'Sanción automática por atraso (CA05.5)';

// El estado manual nunca se sobrescribe. Un atraso bloquea inmediatamente,
// incluso antes de que el proceso periódico registre la sanción.
export const estadoLectorSql = (alias) => `CASE
    WHEN ${alias}.estado <> 'ACTIVO' THEN ${alias}.estado
    WHEN EXISTS (SELECT 1 FROM prestamos pendiente
        WHERE pendiente.lector_id = ${alias}.id
          AND pendiente.estado IN ('PRESTADO', 'VENCIDO')
          AND pendiente.fecha_devolucion_prevista < CURRENT_DATE)
      OR EXISTS (SELECT 1 FROM sanciones restriccion
        WHERE restriccion.lector_id = ${alias}.id AND restriccion.estado = 'ACTIVA')
    THEN 'SANCIONADO' ELSE ${alias}.estado END`;

// Debe ejecutarse en una transacción, después de bloquear el lector.
export const sincronizarSanciones = async (client, lectorId) => {
    await client.query(`UPDATE prestamos SET estado = 'VENCIDO'
        WHERE lector_id = $1 AND estado = 'PRESTADO'
          AND fecha_devolucion_prevista < CURRENT_DATE`, [lectorId]);
    await client.query(`INSERT INTO sanciones
        (lector_id, prestamo_id, motivo, fecha_inicio, fecha_fin, estado)
        SELECT p.lector_id, p.id, $2::varchar, CURRENT_DATE, CURRENT_DATE, 'ACTIVA'
        FROM prestamos p WHERE p.lector_id = $1 AND p.estado IN ('PRESTADO', 'VENCIDO')
          AND p.fecha_devolucion_prevista < CURRENT_DATE
          AND NOT EXISTS (SELECT 1 FROM sanciones s WHERE s.prestamo_id = p.id
              AND s.motivo = $2 AND s.estado = 'ACTIVA')`, [lectorId, MOTIVO_ATRASO]);
    // fecha_fin se mantiene al día mientras el atraso continúa; no se usa como
    // plazo fijo. La sanción concluye únicamente al devolver el préstamo.
    await client.query(`UPDATE sanciones s SET
        estado = CASE WHEN p.estado = 'DEVUELTO' THEN 'CUMPLIDA' ELSE 'ACTIVA' END,
        fecha_fin = GREATEST(s.fecha_inicio, COALESCE(p.fecha_entrega_real, CURRENT_DATE))
        FROM prestamos p WHERE s.prestamo_id = p.id AND s.lector_id = $1
          AND s.motivo = $2 AND s.estado = 'ACTIVA'`, [lectorId, MOTIVO_ATRASO]);
};
