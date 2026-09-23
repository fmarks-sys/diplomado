import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Token requerido'
        });
    }

    const token = authHeader.substring(7);

    if (!token) {
        return res.status(401).json({
            error: 'Token requerido'
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // decoded:
        // {
        //    loginId,
        //    personaId,
        //    rol,
        //    iat,
        //    exp
        // }

        req.user = decoded;

        next();

    } catch (error) {

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expirado'
            });
        }

        return res.status(401).json({
            error: 'Token inválido'
        });
    }
};