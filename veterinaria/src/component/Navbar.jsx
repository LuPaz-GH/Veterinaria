import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaw, faUsers, faHome, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aquí mañana limpiaremos el token de sesión
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm mb-4" style={{ backgroundColor: '#663399' }}>
      <div className="container">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/home">
          <FontAwesomeIcon icon={faPaw} className="me-2" />
          Colitas Felices
        </Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/home">
                <FontAwesomeIcon icon={faHome} className="me-1" /> Inicio
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/mascotas">
                <FontAwesomeIcon icon={faPaw} className="me-1" /> Mascotas
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/duenos">
                <FontAwesomeIcon icon={faUsers} className="me-1" /> Dueños
              </Link>
            </li>
          </ul>
          
          <button className="btn btn-outline-light btn-sm border-0 d-flex align-items-center" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;