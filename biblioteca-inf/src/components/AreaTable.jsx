import { deleteArea } from '../services/areasService';
import './areaTable.css';

const AreaTable = ({ areas, onRefresh }) => {

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar área?')) return;

        await deleteArea(id);
        onRefresh();
    };

    return (
        <table className="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Acciones</th>
                </tr>
            </thead>

            <tbody>
                {areas.map(a => (
                    <tr key={a.id}>
                        <td>{a.id}</td>
                        <td>{a.nombre}</td>
                        <td>
                            <button onClick={() => handleDelete(a.id)}>
                                Eliminar
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default AreaTable;