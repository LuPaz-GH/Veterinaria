import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faCalendarCheck, faPaw, faHeart, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom'; 

const AdminPage = () => {
  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center p-5"
      style={{
        backgroundImage: `url('https://i.pinimg.com/1200x/66/e6/e4/66e6e4b662ecc5582f38e8b465a251fb.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div 
        className="text-center text-white p-5 rounded-4 shadow-lg"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)', 
          backdropFilter: 'blur(12px)',
          maxWidth: '800px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        {/* Bienvenida */}
        <h1 className="fw-bold mb-3" style={{ fontSize: '4rem', textShadow: '4px 4px 12px rgba(0,0,0,0.8)' }}>
          ¡Hola Dueña Vicky! 💜
        </h1>
        <p className="lead fs-3 mb-5">
          Bienvenida al corazón de <strong>Malfi Veterinaria</strong>
        </p>

        {/* Botones principales grandes */}
        <div className="d-flex flex-column flex-md-row gap-4 justify-content-center mb-5">
          <Link 
            to="/turnos" 
            className="btn btn-success btn-lg px-5 py-4 rounded-pill shadow-lg fw-bold d-flex align-items-center justify-content-center"
            style={{ fontSize: '1.6rem', minWidth: '300px' }}
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="me-3 fs-1" />
            Ir a la Agenda
          </Link>

          <Link 
            to="/caja" 
            className="btn btn-primary btn-lg px-5 py-4 rounded-pill shadow-lg fw-bold d-flex align-items-center justify-content-center"
            style={{ fontSize: '1.6rem', minWidth: '300px' }}
          >
            <FontAwesomeIcon icon={faWallet} className="me-3 fs-1" />
            Ver Caja del Día
          </Link>
        </div>

        {/* Resumen motivador  */}
        <div className="row g-4 justify-content-center">
          <div className="col-md-6">
            <div className="card bg-dark bg-opacity-75 text-white border-0 shadow p-4 rounded-4">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon icon={faHeart} size="2x" className="text-danger me-3" />
                <h4 className="mb-0">Hoy en Malfi</h4>
              </div>
              <p className="fs-5 mb-2">
                Un día lleno de colitas felices y ladridos de agradecimiento 🐶
              </p>
              <p className="small opacity-75">
                ¡Seguí cuidando con todo el amor que nos caracteriza!
              </p>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card bg-dark bg-opacity-75 text-white border-0 shadow p-4 rounded-4">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon icon={faPaw} size="2x" className="text-warning me-3" />
                <h4 className="mb-0">Recordatorio</h4>
              </div>
              <p className="fs-5 mb-0">
                No olvides revisar el stock de vacunas y antipulgas antes de cerrar.
              </p>
            </div>
          </div>
        </div>

        {/* Botón extra opcional */}
        <Link 
          to="/estadisticas" 
          className="btn btn-outline-light btn-lg px-5 py-3 mt-5 rounded-pill shadow fw-bold"
        >
          <FontAwesomeIcon icon={faChartLine} className="me-2" />
          Ver Estadísticas Completas
        </Link>
      </div>
    </div>
  );
};

export default AdminPage;