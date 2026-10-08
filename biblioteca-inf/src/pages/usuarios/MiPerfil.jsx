import { useEffect, useState } from 'react';
import { getMiPerfil } from '../../services/lectoresService';
import './miPerfil.css';

const MiPerfil = () => {
    const [perfil, setPerfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let activo = true;

        getMiPerfil()
            .then((data) => {
                if (!data || typeof data !== 'object' || Array.isArray(data)) {
                    throw new Error('Respuesta de perfil inválida');
                }
                if (activo) setPerfil(data);
            })
            .catch((err) => {
                if (activo) setError(err.message || 'No se pudo cargar tu perfil');
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => { activo = false; };
    }, []);

    const datosPersonales = perfil ? [
        ['Nombres', perfil.nombres],
        ['Apellido paterno', perfil.ap],
        ['Apellido materno', perfil.am],
        ['Cédula de identidad', perfil.ci],
        ['Correo electrónico', perfil.correo],
        ['Teléfono', perfil.telefono]
    ] : [];

    return (
        <section className="mi-perfil" aria-labelledby="mi-perfil-titulo">
            <header>
                <h1 id="mi-perfil-titulo">Mi perfil</h1>
                <p>Información de tu cuenta y tus datos personales.</p>
            </header>
            {loading ? <p role="status">Cargando tu perfil...</p> : error ? (
                <p className="mi-perfil-error" role="alert">{error}</p>
            ) : (
                <>
                    <section className="mi-perfil-card" aria-labelledby="perfil-cuenta">
                        <h2 id="perfil-cuenta">Cuenta</h2>
                        <dl>
                            <div><dt>Usuario</dt><dd>{perfil.username || '—'}</dd></div>
                            <div><dt>Rol</dt><dd>{perfil.rol || '—'}</dd></div>
                            <div><dt>Estado de la cuenta</dt><dd>{perfil.estado_login || '—'}</dd></div>
                        </dl>
                    </section>
                    <section className="mi-perfil-card" aria-labelledby="perfil-persona">
                        <h2 id="perfil-persona">Datos personales</h2>
                        <dl>{datosPersonales.map(([etiqueta, valor]) => (
                            <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor || '—'}</dd></div>
                        ))}</dl>
                    </section>
                    {perfil.rol === 'LECTOR' && perfil.lector_id && (
                        <section className="mi-perfil-card" aria-labelledby="perfil-lector">
                            <h2 id="perfil-lector">Datos de lector</h2>
                            <dl>
                                <div><dt>Registro universitario (RU)</dt><dd>{perfil.ru || '—'}</dd></div>
                                <div><dt>Tipo de lector</dt><dd>{perfil.tipo_lector || '—'}</dd></div>
                                <div><dt>Estado del lector</dt><dd>{perfil.estado_lector || '—'}</dd></div>
                            </dl>
                        </section>
                    )}
                </>
            )}
        </section>
    );
};

export default MiPerfil;
