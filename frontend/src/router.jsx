import React from "react";
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/NavBar'
import Sidebar from './components/layout/Sidebar'
import Footer from './components/layout/Footer'
import Register from "./pages/Register";
import Login from "./pages/Login"

import Home from './pages/Home'

function AppRouter() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Navbar />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6">
                    <Routes>
                        <Route path="/" element={<Home/>} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                    </Routes>
                </main>
            </div>
            <Footer />
        </div>

    );
}

export default AppRouter;