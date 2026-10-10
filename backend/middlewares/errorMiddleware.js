export const notFound = (_req, res) => {
    return res.status(404).json({ error: 'Ruta no encontrada' });
};

export const errorHandler = (error, _req, res, next) => {
    if (res.headersSent) return next(error);

    const codigo = error.status ?? error.statusCode;
    const status = Number.isInteger(codigo) && codigo >= 400 && codigo <= 599
        ? codigo : 500;

    const mensajes = {
        'entity.parse.failed': 'El cuerpo de la solicitud contiene JSON inválido',
        'entity.too.large': 'El cuerpo de la solicitud supera el tamaño permitido',
        'encoding.unsupported': 'Codificación de la solicitud no admitida',
        'charset.unsupported': 'Juego de caracteres de la solicitud no admitido',
        'request.aborted': 'Solicitud interrumpida',
        'request.size.invalid': 'Tamaño de solicitud inválido'
    };

    if (status >= 500) console.error(error);

    return res.status(status).json({
        error: status >= 500 ? 'Error interno del servidor'
            : mensajes[error.type] || error.message || 'Solicitud inválida'
    });
};
