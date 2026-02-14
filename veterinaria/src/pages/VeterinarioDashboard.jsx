import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStethoscope, faCalendarCheck, faPaw, 
  faPlusCircle, faSyringe, faClipboardList, faSignOutAlt, faSave, faTimes 
} from '@fortawesome/free-solid-svg-icons';

const VeterinarioDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [modalType, setModalType] = useState(null); // 'diagnostico', 'vacuna', 'receta'

  const modulos = [
    { titulo: 'Mascotas', desc: 'Fichas de pacientes', icono: faPaw, color: '#E0B0FF', ruta: '/mascotas' },
    { titulo: 'Turnos', desc: 'Consultas de hoy', icono: faCalendarCheck, color: '#00D2FF', ruta: '/turnos' },
    { titulo: 'Historial', desc: 'Registros médicos', icono: faStethoscope, color: '#FF4E50', ruta: '/historial' }
  ];

  const cerrarModal = () => setModalType(null);

  return (
    <div className="container-fluid min-vh-100 p-0 d-flex flex-column" 
         style={{ 
           backgroundImage: `linear-gradient(135deg, rgba(102, 51, 153, 0.85) 0%, rgba(255, 105, 180, 0.85) 100%), url('https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?q=80&w=2070&auto=format&fit=crop')`,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed'
         }}>
      
      {/* Header */}
      <div className="mx-4 mt-4 d-flex justify-content-between align-items-center px-4 py-3 bg-white bg-opacity-10 rounded-4 shadow-sm" 
           style={{ backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.2)' }}>
        <div>
          <h1 className="fw-bold mb-0 text-white">Malfi Veterinaria</h1>
          <span className="badge bg-white text-dark rounded-pill px-3 py-2 mt-1 shadow-sm">
            SESIÓN: <strong style={{color: '#663399'}}>VETERINARIO</strong>
          </span>
        </div>
        <button className="btn btn-outline-light rounded-pill px-4 border-2 fw-bold" onClick={onLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Salir
        </button>
      </div>

      {/* Secciones Principales */}
      <div className="container mt-auto mb-auto">
        <div className="row g-4 justify-content-center">
          {modulos.map((m, i) => (
            <div className="col-md-4 col-lg-3" key={i}>
              <div 
                className="card h-100 border-0 text-center p-4 shadow-lg"
                style={{ 
                  borderRadius: '35px', 
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.95)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(m.ruta)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-15px)';
                  e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.2), 0 0 15px ${m.color}66`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="mx-auto mb-3 d-flex align-items-center justify-content-center shadow"
                     style={{ width: '80px', height: '80px', backgroundColor: m.color, color: 'white', borderRadius: '25px' }}>
                  <FontAwesomeIcon icon={m.icono} size="3x" />
                </div>
                <h3 className="fw-bold mb-1" style={{ color: '#663399' }}>{m.titulo}</h3>
                <p className="text-muted small mb-0 fw-bold">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="mx-4 mb-5 p-4 bg-white bg-opacity-20 rounded-5 shadow-lg border border-white border-opacity-25"
           style={{ backdropFilter: 'blur(10px)' }}>
        <div className="d-flex flex-wrap justify-content-center gap-4">
          <button className="btn btn-light rounded-pill px-4 py-3 shadow border-0 fw-bold" onClick={() => setModalType('diagnostico')}>
            <FontAwesomeIcon icon={faPlusCircle} className="me-2 text-primary" /> Nuevo Diagnóstico
          </button>
          <button className="btn btn-light rounded-pill px-4 py-3 shadow border-0 fw-bold" onClick={() => setModalType('vacuna')}>
            <FontAwesomeIcon icon={faSyringe} className="me-2 text-success" /> Vacunación
          </button>
          <button className="btn btn-light rounded-pill px-4 py-3 shadow border-0 fw-bold" onClick={() => setModalType('receta')}>
            <FontAwesomeIcon icon={faClipboardList} className="me-2 text-danger" /> Recetario
          </button>
        </div>
      </div>

      {/* MODAL DINÁMICO */}
      {modalType && (
        <div className="modal d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '30px' }}>
              <div className="modal-header border-0 p-4">
                <h4 className="modal-title fw-bold" style={{ color: '#663399' }}>
                   {modalType === 'diagnostico' && '📝 Registrar Nuevo Diagnóstico'}
                   {modalType === 'vacuna' && '💉 Registrar Vacunación'}
                   {modalType === 'receta' && '💊 Generar Recetario Médico'}
                </h4>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Buscar Mascota</label>
                    <input type="text" className="form-control rounded-pill border-2" placeholder="Nombre de la mascota..." />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-bold">Fecha</label>
                    <input type="date" className="form-control rounded-pill border-2" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold">
                       {modalType === 'diagnostico' ? 'Detalle del Diagnóstico' : modalType === 'vacuna' ? 'Tipo de Vacuna' : 'Medicamentos y Dosis'}
                    </label>
                    <textarea className="form-control border-2" rows="4" style={{ borderRadius: '20px' }} placeholder="Escribe aquí los detalles..."></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0 p-4">
                <button className="btn btn-light rounded-pill px-4" onClick={cerrarModal}>
                  <FontAwesomeIcon icon={faTimes} className="me-2" /> Cancelar
                </button>
                <button className="btn text-white rounded-pill px-4 shadow" style={{ backgroundColor: '#663399' }} onClick={() => { alert('¡Guardado con éxito!'); cerrarModal(); }}>
                  <FontAwesomeIcon icon={faSave} className="me-2" /> Guardar Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VeterinarioDashboard;