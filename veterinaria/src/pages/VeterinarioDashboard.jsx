import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStethoscope, faCalendarCheck, faPaw, 
  faPlusCircle, faSyringe, faClipboardList, faSignOutAlt, faSave, faTimes 
} from '@fortawesome/free-solid-svg-icons';

const VeterinarioDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [modalType, setModalType] = useState(null);

  const modulos = [
    { titulo: 'Mascotas', desc: 'Fichas de pacientes', icono: faPaw, color: '#4FC3F7', ruta: '/mascotas' },
    { titulo: 'Turnos', desc: 'Consultas de hoy', icono: faCalendarCheck, color: '#26C6DA', ruta: '/turnos' },
    { titulo: 'Historial', desc: 'Registros médicos', icono: faStethoscope, color: '#00BCD4', ruta: '/historial' }
  ];

  const cerrarModal = () => setModalType(null);

  return (
    <div className="container-fluid min-vh-100 p-0 d-flex flex-column" 
         style={{ 
           backgroundImage: `url('https://images.unsplash.com/photo-1581578731548-092afbd5f3fb?q=80&w=2070&auto=format&fit=crop')`,
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed',
           backgroundRepeat: 'no-repeat'
         }}>
      
      {/* Saludo */}
      <div className="text-center py-5 text-white">
        <h1 className="display-4 fw-bold mb-2" style={{ textShadow: '2px 2px 10px rgba(0,0,0,0.6)' }}>
          ¡Hola Veterinario/a! 🩺
        </h1>
        <p className="lead fs-4 opacity-90">
          Listo para cuidar patitas hoy
        </p>
      </div>

      {/* Header */}
      <div className="mx-4 mt-3 d-flex justify-content-between align-items-center px-4 py-3 rounded-4 shadow-sm" 
           style={{ 
             background: 'rgba(255, 255, 255, 0.12)', 
             backdropFilter: 'blur(12px)', 
             border: '1px solid rgba(255,255,255,0.15)' 
           }}>
        <div>
          <h1 className="fw-bold mb-0 text-white">Malfi Veterinaria</h1>
          <span className="badge rounded-pill px-3 py-2 mt-1 shadow-sm" 
                style={{ background: 'rgba(255,255,255,0.8)', color: '#006D77' }}>
            SESIÓN: <strong>VETERINARIO</strong>
          </span>
        </div>
        <button className="btn rounded-pill px-4 fw-bold shadow-sm" 
                style={{ background: 'white', color: '#006D77', border: '2px solid #26C6DA' }}
                onClick={onLogout}>
          <FontAwesomeIcon icon={faSignOutAlt} className="me-2" /> Salir
        </button>
      </div>

      {/* Tarjetas */}
      <div className="container mt-5 mb-auto">
        <div className="row g-4 justify-content-center">
          {modulos.map((m, i) => (
            <div className="col-md-4 col-lg-3" key={i}>
              <div 
                className="card h-100 border-0 text-center p-4 shadow-lg"
                style={{ 
                  borderRadius: '35px', 
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.85)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(m.ruta)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-15px)';
                  e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.25), 0 0 20px ${m.color}66`;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.12)';
                }}
              >
                <div className="mx-auto mb-3 d-flex align-items-center justify-content-center shadow"
                     style={{ width: '90px', height: '90px', backgroundColor: m.color, color: 'white', borderRadius: '28px' }}>
                  <FontAwesomeIcon icon={m.icono} size="3x" />
                </div>
                <h3 className="fw-bold mb-1" style={{ color: '#006D77' }}>{m.titulo}</h3>
                <p className="text-muted small mb-0 fw-bold">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mx-4 mb-5 p-4 rounded-5 shadow-lg" 
           style={{ 
             background: 'rgba(255, 255, 255, 0.15)', 
             backdropFilter: 'blur(10px)', 
             border: '1px solid rgba(255,255,255,0.15)' 
           }}>
        <div className="d-flex flex-wrap justify-content-center gap-4">
          <button className="btn rounded-pill px-4 py-3 fw-bold shadow" 
                  style={{ background: 'white', color: '#006D77', border: '2px solid #26C6DA' }}
                  onClick={() => setModalType('diagnostico')}>
            <FontAwesomeIcon icon={faPlusCircle} className="me-2" style={{color: '#118AB2'}} /> Nuevo Diagnóstico
          </button>
          <button className="btn rounded-pill px-4 py-3 fw-bold shadow" 
                  style={{ background: 'white', color: '#006D77', border: '2px solid #26C6DA' }}
                  onClick={() => setModalType('vacuna')}>
            <FontAwesomeIcon icon={faSyringe} className="me-2" style={{color: '#06D6A0'}} /> Vacunación
          </button>
          <button className="btn rounded-pill px-4 py-3 fw-bold shadow" 
                  style={{ background: 'white', color: '#006D77', border: '2px solid #26C6DA' }}
                  onClick={() => setModalType('receta')}>
            <FontAwesomeIcon icon={faClipboardList} className="me-2" style={{color: '#EF476F'}} /> Recetario
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '30px' }}>
              <div className="modal-header border-0 p-4">
                <h4 className="modal-title fw-bold" style={{ color: '#006D77' }}>
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
                <button className="btn text-white rounded-pill px-4 shadow" style={{ backgroundColor: '#26C6DA' }} onClick={() => { alert('¡Guardado con éxito!'); cerrarModal(); }}>
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