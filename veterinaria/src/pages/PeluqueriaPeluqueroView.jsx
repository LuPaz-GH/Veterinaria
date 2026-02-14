import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faScissors, faPaw, faUser, faCheckCircle,
  faPlay, faStickyNote, faSearch, faPlus, faPencilAlt, faTrash,
  faThumbsUp, faExclamationTriangle, faThumbsDown
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';

// --- SUB-COMPONENTE: MODAL PARA CREAR/EDITAR ---
const TurnoModal = ({ show, onClose, onGuardar, turnoAEditar }) => {
  const [form, setForm] = useState({
    mascota: '', raza: '', dueño: '', hora: '', servicio: 'Baño + Corte', notas: ''
  });

  useEffect(() => {
    if (turnoAEditar) {
      setForm({
        mascota: turnoAEditar.mascota || '',
        raza: turnoAEditar.raza || '',
        dueño: turnoAEditar.dueño || '',
        hora: turnoAEditar.hora || '',
        servicio: turnoAEditar.servicio || 'Baño + Corte',
        notas: turnoAEditar.notas || ''
      });
    } else {
      setForm({ mascota: '', raza: '', dueño: '', hora: '', servicio: 'Baño + Corte', notas: '' });
    }
  }, [turnoAEditar, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(form, turnoAEditar?.id);
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ color: '#ff69b4' }}>
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              {turnoAEditar ? 'Editar Turno' : 'Nuevo Turno'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label fw-bold small">Mascota</label>
                  <input type="text" className="form-control shadow-sm" name="mascota" value={form.mascota} onChange={handleChange} required />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold small">Raza</label>
                  <input type="text" className="form-control shadow-sm" name="raza" value={form.raza} onChange={handleChange} />
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold small">Dueño</label>
                  <input type="text" className="form-control shadow-sm" name="dueño" value={form.dueño} onChange={handleChange} required />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold small">Hora</label>
                  <input type="time" className="form-control shadow-sm" name="hora" value={form.hora} onChange={handleChange} required />
                </div>
                <div className="col-6">
                  <label className="form-label fw-bold small">Servicio</label>
                  <select className="form-select shadow-sm" name="servicio" value={form.servicio} onChange={handleChange}>
                    <option value="Baño + Corte">Baño + Corte</option>
                    <option value="Baño básico">Baño básico</option>
                    <option value="Corte higiénico">Corte higiénico</option>
                    <option value="Corte de uñas">Corte de uñas</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fw-bold small">Notas</label>
                  <textarea className="form-control shadow-sm" rows="2" name="notes" value={form.notas} onChange={handleChange} />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4" style={{ backgroundColor: '#ff69b4', border: 'none' }}>
                  {turnoAEditar ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTE: MODAL DE FINALIZACIÓN (NOTAS) ---
const FinalizarModal = ({ show, onClose, onGuardar, turnoId }) => {
  const [behavior, setBehavior] = useState('Bueno');
  const [notes, setNotes] = useState('');

  if (!show) return null;

  const handleGuardarFinal = () => {
    const fecha = new Date().toLocaleDateString('es-AR');
    const estadoTexto = `${behavior.toUpperCase()} - ${notes || 'Sin observaciones'} - ${fecha}`;
    onGuardar(turnoId, estadoTexto);
    setNotes(''); // Limpiar para la próxima
    onClose();
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content rounded-4 border-0 shadow-lg">
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold" style={{ color: '#ff69b4' }}>
              <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> Finalizar Trabajo
            </h5>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label fw-bold small">Comportamiento</label>
              <select className="form-select shadow-sm" value={behavior} onChange={(e) => setBehavior(e.target.value)}>
                <option value="Bueno">Bueno 👍</option>
                <option value="Regular">Regular ⚠️</option>
                <option value="Malo">Malo 👎</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold small">Observaciones del servicio</label>
              <textarea className="form-control shadow-sm" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Se portó bien, nudos en las orejas..." />
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>Cancelar</button>
              <button type="button" className="btn btn-success rounded-pill px-4" onClick={handleGuardarFinal}>Guardar y Finalizar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const PeluqueriaPeluqueroView = () => {
  const [turnosEstetica, setTurnosEstetica] = useState(() => {
    const saved = localStorage.getItem('serviciosEstetica');
    return saved ? JSON.parse(saved) : [
      { id: 1, mascota: "Ariel", raza: "Siames", dueño: "Susana", hora: "18:30", servicio: "Corte + Baño", notas: "", estado: "Pendiente", ultimoEstadoPeluqueria: "BUENO - 15/01/2026" },
    ];
  });

  const [filtro, setFiltro] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [accionConfirm, setAccionConfirm] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [turnoAEditar, setTurnoAEditar] = useState(null);

  useEffect(() => {
    localStorage.setItem('serviciosEstetica', JSON.stringify(turnosEstetica));
  }, [turnosEstetica]);

  const turnosFiltrados = turnosEstetica.filter(t =>
    (t.mascota || '').toLowerCase().includes(filtro.toLowerCase()) ||
    (t.dueño || '').toLowerCase().includes(filtro.toLowerCase())
  );

  const iniciarTurno = (id) => {
    setTurnosEstetica(prev => prev.map(t => t.id === id ? { ...t, estado: "En Proceso" } : t));
  };

  const finalizarTurnoConNotas = (id, nuevoEstado) => {
    setTurnosEstetica(prev => prev.map(t => t.id === id ? { ...t, estado: "Finalizado", ultimoEstadoPeluqueria: nuevoEstado } : t));
    setTurnoSeleccionado(null); // Limpiar después de guardar todo
  };

  const guardarTurno = (datos, idExistente) => {
    if (idExistente) {
      setTurnosEstetica(prev => prev.map(t => t.id === idExistente ? { ...t, ...datos } : t));
    } else {
      const nuevo = { id: Date.now(), ...datos, estado: 'Pendiente', ultimoEstadoPeluqueria: null };
      setTurnosEstetica(prev => [...prev, nuevo]);
    }
  };

  // CORRECCIÓN DE LÓGICA DE CONFIRMACIÓN
  const confirmarAccion = () => {
    if (accionConfirm === "iniciar") {
      iniciarTurno(turnoSeleccionado);
      setTurnoSeleccionado(null);
    } else if (accionConfirm === "finalizar") {
      setShowFinalizarModal(true);
      // No reseteamos turnoSeleccionado aquí porque lo usa el FinalizarModal
    } else if (accionConfirm === "eliminar") {
      setTurnosEstetica(prev => prev.filter(t => t.id !== turnoSeleccionado));
      setTurnoSeleccionado(null);
    }
    setShowConfirm(false);
    setAccionConfirm(null);
  };

  const pedirConfirmacion = (id, accion) => {
    setTurnoSeleccionado(id);
    setAccionConfirm(accion);
    setShowConfirm(true);
  };

  const getBehaviorBadge = (estado) => {
    if (!estado) return null;
    const [behavior] = estado.split(' - ');
    let color = behavior === 'BUENO' ? 'bg-success' : behavior === 'MALO' ? 'bg-danger' : 'bg-warning text-dark';
    return <span className={`badge ${color} px-2 py-1 mb-1 small`}>{behavior}</span>;
  };

  return (
    <div className="min-vh-100 p-4 p-md-5 position-relative" style={{
      backgroundImage: `linear-gradient(135deg, rgba(255, 105, 180, 0.25) 0%, rgba(255, 182, 193, 0.25) 100%), url('https://i.pinimg.com/1200x/d3/62/54/d362543624849f9fba17f8f6a85c2953.jpg')`,
      backgroundSize: 'cover', backgroundAttachment: 'fixed', overflowX: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.45)', zIndex: 0 }} />

      <div className="container position-relative" style={{ zIndex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold m-0" style={{ color: '#ff1493' }}>
            <FontAwesomeIcon icon={faScissors} className="me-3" /> Mis Turnos
          </h1>
          <button className="btn rounded-pill px-4 fw-bold shadow text-white" style={{ backgroundColor: '#ff69b4', border: 'none' }} onClick={() => { setTurnoAEditar(null); setShowTurnoModal(true); }}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
          </button>
        </div>

        {/* BUSCADOR ACORTADO */}
        <div className="row justify-content-center mb-5">
          <div className="col-12 col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '50px' }}>
              <div className="card-body py-2 px-4 d-flex align-items-center">
                <FontAwesomeIcon icon={faSearch} className="text-muted me-2" />
                <input type="text" className="form-control border-0 shadow-none bg-transparent" placeholder="Buscar..." value={filtro} onChange={e => setFiltro(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {turnosFiltrados.map(turno => (
            <div className="col-md-6 col-lg-4" key={turno.id}>
              <div className="card border-0 shadow-lg h-100" style={{ 
                borderRadius: '1.5rem', background: 'rgba(255,255,255,0.95)',
                borderLeft: `6px solid ${turno.estado === 'En Proceso' ? '#ffc107' : turno.estado === 'Finalizado' ? '#28a745' : '#dc3545'}`
              }}>
                <div className="card-body p-4 d-flex flex-column">
                  <div className="d-flex justify-content-between">
                    <h5 className="fw-bold"><FontAwesomeIcon icon={faPaw} className="me-2 text-primary" />{turno.mascota}</h5>
                    <div className="d-flex gap-1">
                      <button className="btn btn-sm text-primary" onClick={() => { setTurnoAEditar(turno); setShowTurnoModal(true); }}><FontAwesomeIcon icon={faPencilAlt} /></button>
                      <button className="btn btn-sm text-danger" onClick={() => pedirConfirmacion(turno.id, "eliminar")}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  </div>
                  <p className="text-muted small mb-2"><FontAwesomeIcon icon={faUser} className="me-1" />{turno.dueño}</p>
                  
                  <span className={`badge mb-3 align-self-start ${turno.estado === 'Pendiente' ? 'bg-danger' : turno.estado === 'En Proceso' ? 'bg-warning text-dark' : 'bg-success'}`}>{turno.estado}</span>

                  <div className="small mb-1"><strong>Hora:</strong> {turno.hora}</div>
                  <div className="small mb-3 text-truncate"><strong>Servicio:</strong> {turno.servicio}</div>

                  {turno.ultimoEstadoPeluqueria && (
                    <div className="mt-2 p-2 rounded bg-light border small">
                      {getBehaviorBadge(turno.ultimoEstadoPeluqueria)}
                      <div className="text-muted italic text-truncate">{turno.ultimoEstadoPeluqueria}</div>
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    {turno.estado === 'Pendiente' && <button className="btn btn-warning w-100 fw-bold rounded-pill" onClick={() => pedirConfirmacion(turno.id, "iniciar")}><FontAwesomeIcon icon={faPlay} className="me-2"/>Iniciar</button>}
                    {turno.estado === 'En Proceso' && <button className="btn btn-success w-100 fw-bold rounded-pill" onClick={() => pedirConfirmacion(turno.id, "finalizar")}><FontAwesomeIcon icon={faCheckCircle} className="me-2"/>Finalizar</button>}
                    {turno.estado === 'Finalizado' && <div className="text-center text-success fw-bold"><FontAwesomeIcon icon={faCheckCircle} /> Completado</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal 
        show={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        onConfirm={confirmarAccion} 
        title={accionConfirm === "eliminar" ? "Eliminar Turno" : "Confirmar Cambio"}
        message={accionConfirm === "eliminar" ? "¿Estás seguro de eliminar este registro?" : "¿Deseas cambiar el estado de este turno?"}
        confirmColor={accionConfirm === "eliminar" ? "danger" : "primary"}
      />

      <TurnoModal show={showTurnoModal} onClose={() => setShowTurnoModal(false)} onGuardar={guardarTurno} turnoAEditar={turnoAEditar} />
      
      <FinalizarModal 
        show={showFinalizarModal} 
        onClose={() => { setShowFinalizarModal(false); setTurnoSeleccionado(null); }} 
        onGuardar={finalizarTurnoConNotas} 
        turnoId={turnoSeleccionado} 
      />
    </div>
  );
};

export default PeluqueriaPeluqueroView;