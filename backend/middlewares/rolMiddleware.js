export const isAdmin = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado'
        });
    }

    if (req.user.rol !== 'BIBLIOTECARIO') {
        return res.status(403).json({
            error: 'Acceso exclusivo para BIBLIOTECARIO'
        });
    }

    next();
};


export const isLector = (req, res, next) => {

    if (!req.user) {
        return res.status(401).json({
            error: 'Usuario no autenticado'
        });
    }

    if (req.user.rol !== 'LECTOR') {
        return res.status(403).json({
            error: 'Acceso exclusivo para LECTOR'
        });
    }

    next();
};


// Para rutas donde ambos roles pueden entrar
export const hasRole = (...roles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({
                error: 'No tiene permisos para acceder a este recurso'
            });
        }

        next();
    };
};