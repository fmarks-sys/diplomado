import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUserWithLector, findUserByEmail } from './auth.repository.js';

//Funcion Registrar: que espera data
export const register = async (data) => {

    const existing = await findUserByEmail(data.correo);
    if (existing) throw new Error('El usuario ya existe');

    const hashed = await bcrypt.hash(data.password, 10);

    return await createUserWithLector({
        nombre: data.nombre,
        correo: data.correo,
        password_hash: hashed,
        rol: data.rol,

        // 👇 SOLO SI ES LECTOR
        ru: data.ru,
        ci: data.ci,
        nombres: data.nombres,
        apellidos: data.apellidos,
        telefono: data.telefono,
        tipo_lector: data.tipo_lector
    });
};

export const login = async (correo, password) => {

    const user = await findUserByEmail(correo);
    if (!user) throw new Error('El usuario no existe');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Password incorrecto');

    const token = jwt.sign(
        { id: user.id, rol: user.rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // ❗ NO devuelvas password_hash
    delete user.password_hash;

    return { token, user };
};