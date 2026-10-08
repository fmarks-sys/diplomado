import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import './login.css';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        password: '',
    });

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        //  VALIDACIÓN ANTES
        if (!form.username || !form.password) {
            setError('Completa todos los campos');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await login(form);

            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <div className="login-shell">
                <section className="login-intro" aria-labelledby="login-brand-title">
                    <div className="login-brand">
                        <span className="login-brand-icon" aria-hidden="true">
                            <MenuBookOutlinedIcon />
                        </span>
                        <span>UAJMS <span className="login-brand-caption">Biblioteca de Informática</span></span>
                    </div>
                    <div className="login-intro-content">
                        <p className="login-eyebrow">CONOCIMIENTO A TU ALCANCE</p>
                        <h1 id="login-brand-title">Tu biblioteca.<br />Tu próximo descubrimiento.</h1>
                        <p>Un espacio para consultar recursos y gestionar los servicios de tu biblioteca.</p>
                        <span className="login-intro-line" aria-hidden="true" />
                    </div>
                    <p className="login-institution">Universidad Autónoma Juan Misael Saracho</p>
                </section>
                <div className="login-form-panel">
                    <form className="login-box" onSubmit={handleSubmit}>
                        <header className="login-heading">
                            <p className="login-eyebrow">BIBLIOTECA ING. INFORMATICA UAJMS</p>
                            <h2>Bienvenido</h2>
                            <p>Ingresa tus credenciales para continuar.</p>
                        </header>
                        {error && <p className="login-error" role="alert">{error}</p>}
                        <div className="login-field">
                            <label htmlFor="login-username">Usuario</label>
                            <input
                                id="login-username"
                                name="username"
                                placeholder="Ingresar usuario"
                                value={form.username}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="login-field">
                            <label htmlFor="login-password">Contraseña</label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                placeholder="Ingresar contraseña"
                                value={form.password}
                                onChange={handleChange}
                            />
                        </div>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                        <p className="login-form-note">Sistema de gestión de biblioteca</p>
                    </form>
                </div>
            </div>
        </main>
    );
};

export default Login;
