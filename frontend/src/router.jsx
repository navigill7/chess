import React from "react";
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/NavBar'
import Sidebar from './components/layout/Sidebar'

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
                    </Routes>
                </main>
            </div>
        </div>

    );
}

export default AppRouter;