import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarCheck, faUsers, faPaw, faPhone, 
  faSignOutAlt, faBell, faMoneyBillWave, faClipboardList
} from '@fortawesome/free-solid-svg-icons';

const RecepcionistaDashboard = ({ onLogout }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundImage: `url('https://i.pinimg.com/1200x/31/0b/2a/310b2a9bd9e6c1c842a8aab0c35e5c28.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay oscuro para mejorar legibilidad */}
      <div 
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.35)', 
          zIndex: 0 
        }}
      />

      {/* Contenido Principal */}
      <div 
        className="position-relative text-center text-white p-5 rounded-5 shadow-lg"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.45)', 
          backdropFilter: 'blur(15px)',
          maxWidth: '850px',
          width: '100%',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        {/* Botón de Salir - Esquina superior derecha */}
        <button 
          className="btn btn-sm position-absolute top-0 end-0 m-3 rounded-pill px-3 py-2"
          style={{ 
            background: 'rgba(255, 255, 255, 0.2)', 
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(10px)'
          }}
          onClick={onLogout}
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
          Salir
        </button>

        {/* Saludo Principal */}
        <h1 className="display-4 fw-bold mb-3">
          ¡Hola Recepcionista! <FontAwesomeIcon icon={faPhone} className="text-success" />
        </h1>
        <p className="lead fs-5 mb-5 opacity-90">
          Gestión y atención al cliente Malfi
        </p>

        {/* Botones Principales */}
        <div className="d-flex flex-column gap-3 mb-5">
          <button 
            className="btn btn-lg rounded-pill px-5 py-4 fw-bold shadow-lg border-0"
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              fontSize: '1.2rem',
              transition: 'all 0.3s ease'
            }}
            onClick={() => navigate('/turnos')}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(34, 197, 94, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
            }}
          >
            <FontAwesomeIcon icon={faCalendarCheck} className="me-3 fs-5" />
            Agenda de Turnos
          </button>

          <button 
            className="btn btn-lg rounded-pill px-5 py-4 fw-bold shadow-lg border-0"
            style={{ 
              background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
              color: 'white',
              fontSize: '1.2rem',
              transition: 'all 0.3s ease'
            }}
            onClick={() => navigate('/duenos')}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(234, 179, 8, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
            }}
          >
            <FontAwesomeIcon icon={faUsers} className="me-3 fs-5" />
            Gestión de Dueños
          </button>
        </div>

        {/* Tarjetas de Información */}
        <div className="row g-3">
          {/* Atención al Cliente */}
          <div className="col-md-6">
            <div 
              className="p-4 rounded-4 h-100"
              style={{ 
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon 
                  icon={faPhone} 
                  size="2x" 
                  className="text-success me-3"
                />
                <h5 className="mb-0 fw-bold">Atención al Cliente</h5>
              </div>
              <p className="mb-0 opacity-90" style={{ fontSize: '0.95rem' }}>
                "Una sonrisa en recepción es el primer paso para una mascota sana. ¡Buen trabajo!"
              </p>
              <small className="d-block mt-3 opacity-75">— Tu equipo Malfi</small>
            </div>
          </div>

          {/* Pendientes de hoy */}
          <div className="col-md-6">
            <div 
              className="p-4 rounded-4 h-100"
              style={{ 
                background: 'rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon 
                  icon={faBell} 
                  size="2x" 
                  className="text-warning me-3"
                />
                <h5 className="mb-0 fw-bold">Pendientes de hoy</h5>
              </div>
              <p className="mb-0 opacity-90" style={{ fontSize: '0.95rem' }}>
                No olvides confirmar los turnos de la tarde y revisar los ingresos en caja.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de Acceso Rápido Adicionales */}
        <div className="mt-4 pt-4 border-top border-secondary">
          <p className="mb-3 opacity-75 small">Accesos rápidos</p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <button 
              className="btn btn-sm rounded-pill px-3 py-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
              onClick={() => navigate('/clientes')}
            >
              <FontAwesomeIcon icon={faPaw} className="me-2" />
              Pacientes
            </button>
            <button 
              className="btn btn-sm rounded-pill px-3 py-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
              onClick={() => navigate('/caja')}
            >
              <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
              Caja
            </button>
            <button 
              className="btn btn-sm rounded-pill px-3 py-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.15)', 
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
              onClick={() => navigate('/petshop')}
            >
              <FontAwesomeIcon icon={faClipboardList} className="me-2" />
              Petshop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecepcionistaDashboard;