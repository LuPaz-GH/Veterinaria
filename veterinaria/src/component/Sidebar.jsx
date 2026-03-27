import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaw, faCalendarCheck, faHistory, faSignOutAlt, 
  faHome, faScissors, faShoppingBag, faBowlFood, 
  faPills, faCashRegister, faChartLine, faUsers, faUsersCog 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from './ConfirmModal';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')) || null;
  const rol = user?.rol || 'invitado';

  const esAdmin = rol === 'admin';
  const esVeterinario = rol === 'veterinario';
  const esRecepcionista = rol === 'recepcionista';
  const esPeluquero = rol === 'peluquero';

  let colorFondo;
  let colorIconoPaw;
  let colorActivo = 'rgba(255, 255, 255, 0.25)';

  if (esAdmin) {
    colorFondo = 'linear-gradient(180deg, #6a1b9a 0%, #9c27b0 100%)';
    colorIconoPaw = '#ab47bc';
  } else if (esVeterinario) {
    colorFondo = 'linear-gradient(180deg, #00acc1 0%, #26c6da 100%)';
    colorIconoPaw = '#006D77';
  } else if (esPeluquero) {
    colorFondo = 'linear-gradient(180deg, #ff9ac7 0%, #ff69b4 100%)';
    colorIconoPaw = '#ff69b4';
  } else if (esRecepcionista) {
    colorFondo = 'linear-gradient(180deg, #4caf50 0%, #66bb6a 100%)';
    colorIconoPaw = '#1B5E20';
  } else {
    colorFondo = 'linear-gradient(180deg, #757575 0%, #9e9e9e 100%)';
    colorIconoPaw = '#424242';
  }

  const menuItems = [
    { name: 'Inicio', path: '/home', icon: faHome },
  ];

  if (esVeterinario || esAdmin || esRecepcionista) {
    menuItems.push({ name: 'Clientes', path: '/clientes', icon: faUsers });
  }

  if (!esPeluquero || esAdmin || esRecepcionista) {
    menuItems.push({ name: 'Turnos', path: '/turnos', icon: faCalendarCheck });
  }

  if (esPeluquero || esAdmin || esRecepcionista) {
    menuItems.push({ name: 'Estética / Peluquería', path: '/estetica', icon: faScissors });
  }

  if (esRecepcionista || esAdmin) {
    menuItems.push(
      { name: 'Petshop', path: '/petshop', icon: faShoppingBag },
      { name: 'Alimentos', path: '/alimentos', icon: faBowlFood },
      { name: 'Medicamentos', path: '/medicamentos', icon: faPills },
      { name: 'Caja', path: '/caja', icon: faCashRegister }
    );
  }

  if (esVeterinario || esAdmin) {
    menuItems.push({ name: 'Historial Clínico', path: '/historial', icon: faHistory });
  }

  // SECCIÓN ADMIN: Se eliminó el "Panel Dueña" de aquí
  if (esAdmin) {
    menuItems.push(
      { name: 'Auditoría', path: '/auditoria', icon: faHistory },
      { name: 'Gestión Empleados', path: '/empleados', icon: faUsersCog }
    );
  }

  const handleLogout = () => { setShowLogoutModal(true); };
  const confirmarLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
    setShowLogoutModal(false);
  };

  if (!user) return null;

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 text-white shadow-lg" style={{ width: '280px', height: '100vh', background: colorFondo, position: 'fixed', left: 0, top: 0, zIndex: 4000, overflowY: 'auto' }}>
      <div className="d-flex align-items-center mb-5">
        <div className="bg-white rounded-circle p-2 me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '50px', height: '50px', border: '2px solid rgba(0,0,0,0.1)' }}>
          <FontAwesomeIcon icon={faPaw} size="xl" style={{ color: colorIconoPaw }} />
        </div>
        <div>
          <span className="fs-4 fw-bold d-block">Malfi</span>
          <span className="badge bg-white text-dark text-capitalize small">{rol}</span>
        </div>
      </div>
      <ul className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li className="nav-item mb-2" key={item.name}>
              <Link to={item.path} className="nav-link text-white d-flex align-items-center gap-3 py-3 rounded-pill" style={{ background: isActive ? colorActivo : 'transparent', border: isActive ? '1px solid white' : '1px solid transparent', fontWeight: isActive ? 'bold' : 'normal' }}>
                <FontAwesomeIcon icon={item.icon} style={{ width: '25px', fontSize: '1.2rem' }} />
                <span className="fs-5">{item.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <hr className="bg-white opacity-50" />
      <button className="btn btn-outline-light rounded-pill d-flex align-items-center gap-3 py-3 mb-3" onClick={handleLogout}><FontAwesomeIcon icon={faSignOutAlt} /><span className="fw-bold">Cerrar Sesión</span></button>
      <ConfirmModal show={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={confirmarLogout} title="Cerrar sesión" message="¿Desea cerrar sesión?" confirmText="Sí, cerrar" cancelText="Cancelar" confirmColor="danger" />
    </div>
  );
};

export default Sidebar;