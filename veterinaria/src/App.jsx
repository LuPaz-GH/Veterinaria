import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './component/Sidebar';
import HomePage from './pages/HomePage';
import MascotasPage from './pages/ClientesPage';
import TurnosPage from './pages/TurnosPage';
import DueñosPage from './pages/DueñosPage';
import InventarioPage from './pages/InventarioPage';
import PetshopPage from './pages/PetshopPage';
import AlimentosPage from './pages/AlimentosPage';
import CajaPage from './pages/CajaPage';
import LoginPage from './pages/LoginPage';
import HistorialPage from './pages/HistorialPage';
import DueñoDashboard from './pages/DueñoDashboard';
import GestionEmpleados from './pages/GestionEmpleados';
import AuditoriaPage from './pages/AuditoriaPage';
import ResetPassword from './component/ResetPassword';
import ConfiguracionPage from './pages/ConfiguracionPage';

// ==================== IMPORTS OCULTADOS TEMPORALMENTE ====================
// import EsteticaPage from './pages/EsteticaPage';
// import MedicamentosPage from './pages/MedicamentosPage';
// import PeluqueriaPeluqueroView from './pages/PeluqueriaPeluqueroView';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const AppContent = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const location = useLocation();
  const esLogin = location.pathname === '/login';

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const fondoGlobal = (user?.rol === 'admin' || user?.rol === 'veterinario' || user?.rol === 'recepcionista')
    ? 'linear-gradient(135deg, #663399 0%, #ff69b4 100%)'
    : 'linear-gradient(135deg, #1e5128 0%, #4e944f 100%)';

  return (
    <div 
      className="d-flex flex-column flex-md-row min-vh-100" 
      style={{ background: esLogin ? 'none' : fondoGlobal }}
    >
      {!esLogin && user && <Sidebar />}

      <main 
        className="flex-grow-1 d-flex flex-column" 
        style={{ marginLeft: esLogin || !user ? '0' : '280px', minHeight: '100vh' }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/home" element={<HomePage user={user} />} />
          <Route path="/clientes" element={<MascotasPage user={user} />} />
          <Route path="/turnos" element={<TurnosPage user={user} />} />
          <Route path="/duenos" element={<DueñosPage user={user} />} />
          <Route path="/inventario" element={<InventarioPage user={user} />} />

          {/* ======================== OCULTADO TEMPORALMENTE ======================== */}
          
          {/* Estética completa */}
          <Route path="/estetica" element={<Navigate to="/home" replace />} />
          <Route path="/estetica/*" element={<Navigate to="/home" replace />} />

          {/* Medicamentos completo */}
          <Route path="/medicamentos" element={<Navigate to="/home" replace />} />
          <Route path="/medicamentos/*" element={<Navigate to="/home" replace />} />

          {/* Sesión del Peluquero */}
          <Route path="/peluquero" element={<Navigate to="/home" replace />} />
          <Route path="/peluqueria" element={<Navigate to="/home" replace />} />

          {/* ==================================================================== */}

          {/* Rutas activas */}
          <Route path="/petshop" element={<PetshopPage user={user} />} />
          <Route path="/alimentos" element={<AlimentosPage user={user} />} />
          <Route path="/caja" element={<CajaPage user={user} />} />

          <Route 
            path="/historial" 
            element={['admin', 'veterinario'].includes(user?.rol) ? <HistorialPage user={user} /> : <Navigate to="/home" replace />} 
          />

          <Route 
            path="/admin" 
            element={user?.rol === 'admin' ? <DueñoDashboard user={user} /> : <Navigate to="/home" replace />} 
          />

          <Route 
            path="/empleados" 
            element={user?.rol === 'admin' ? <GestionEmpleados /> : <Navigate to="/home" replace />} 
          />

          <Route 
            path="/auditoria" 
            element={user?.rol === 'admin' ? <AuditoriaPage user={user} /> : <Navigate to="/home" replace />} 
          />

          <Route 
            path="/configuracion" 
            element={['admin', 'dueno'].includes(user?.rol) ? <ConfiguracionPage /> : <Navigate to="/home" replace />} 
          />

          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;