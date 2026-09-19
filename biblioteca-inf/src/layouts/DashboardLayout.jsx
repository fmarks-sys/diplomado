import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import SideBar from "../components/sidebar/SideBar";
import Footer from "../components/footer/Footer";
import './dashboardLayout.css';

function DashboardLayout() {
    return (
        <div className="dashboard">
            <SideBar />

            <div className="main">
                <Navbar />

                <main className="content">
                    <Outlet />
                </main>

                <Footer />
            </div>
        </div>
    );
}

export default DashboardLayout;