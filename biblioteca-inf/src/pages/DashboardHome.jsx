import './dashboard.css';

function DashboardHome() {
    return (
        <div className="dashboard-home">

            <h1 className="title">Dashboard</h1>

            {/* CARDS */}
            <div className="cards">

                <div className="card">
                    <h3>Total Recursos</h3>
                    <p className="value">120</p>
                    <span className="info">Libros y Tesis</span>
                </div>

                <div className="card">
                    <h3>Préstamos Activos</h3>
                    <p className="value">35</p>
                    <span className="info">Actualmente prestados</span>
                </div>

                <div className="card">
                    <h3>Lectores</h3>
                    <p className="value">80</p>
                    <span className="info">Usuarios registrados</span>
                </div>

                <div className="card warning">
                    <h3>Vencidos</h3>
                    <p className="value">5</p>
                    <span className="info">Préstamos atrasados</span>
                </div>

            </div>

            {/* TABLA RECIENTE */}
            <div className="table-section">
                <h2>Préstamos recientes</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Lector</th>
                            <th>Recurso</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Juan Perez</td>
                            <td>Ingeniería de Software</td>
                            <td>10/07/2026</td>
                            <td className="status activo">PRESTADO</td>
                        </tr>

                        <tr>
                            <td>Maria Lopez</td>
                            <td>Redes Avanzadas</td>
                            <td>08/07/2026</td>
                            <td className="status vencido">VENCIDO</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>
    );
}

export default DashboardHome;