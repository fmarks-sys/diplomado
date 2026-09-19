export const isAdmin = (req, res, next) => {
    if (req.user.rol !== 'ADMIN') {
        return res.status(403).json({ error: 'Solo admin' });
    }
    next();
};

export const isLector = (req, res, next) => {
    if (req.user.rol !== 'LECTOR') {
        return res.status(403).json({ error: 'Solo lector' });
    }
    next();
};