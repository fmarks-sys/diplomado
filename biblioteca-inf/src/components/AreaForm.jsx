import { useState } from 'react';
import { createArea } from '../services/areasService';
import './areaForm.css';

const AreaForm = ({ onCreated }) => {
    const [nombre, setNombre] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!nombre) return alert('Nombre requerido');

        await createArea(nombre);
        setNombre('');
        onCreated();
    };

    return (
        <form className="area-form" onSubmit={handleSubmit}>
            <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del área"
            />

            <button type="submit">
                Agregar
            </button>
        </form>
    );
};

export default AreaForm;