import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),

    ssl: isProduction
        ? { rejectUnauthorized: false }
        : false
});

pool.query('SELECT NOW()')
    .then(() => {
        console.log(
            `✅ PostgreSQL conectado: ${process.env.NODE_ENV}`
        );
    })
    .catch((error) => {
        console.error(
            '❌ Error PostgreSQL:',
            error.message
        );
    });