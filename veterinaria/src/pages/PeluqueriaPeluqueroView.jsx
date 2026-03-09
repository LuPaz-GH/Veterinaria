import React, { useState, useEffect, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faScissors, faPaw, faUser, faCheckCircle,
  faPlay, faSearch, faPlus, faPencilAlt, faTrash,
  faThumbsUp, faExclamationTriangle, faThumbsDown, faTimes, faClock, faEdit,
  faCalendarDay, faArrowRight, faHistory,
  faFilePdf, faFileExcel 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import api from '../services/api'; 

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- SUB-COMPONENTE: MODAL PARA CREAR/EDITAR ---
const TurnoModal = ({ show, onClose, onGuardar, turnoAEditar }) => {
  const [form, setForm] = useState({
    mascota_id: '',
    mascota_nombre: '',
    raza: '',
    dueno: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    servicio: 'Baño + Corte',
    notas: ''
  });

  const [mascotas, setMascotas] = useState([]);

  useEffect(() => {
    if (show) {
      const fetchMascotas = async () => {
        try {
          const response = await api.get('/mascotas');
          setMascotas(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
          console.error("Error al cargar mascotas:", err);
        }
      };
      fetchMascotas();
    }
  }, [show]);

  useEffect(() => {
    if (turnoAEditar) {
      setForm({
        mascota_id: turnoAEditar.mascota_id || '',
        mascota_nombre: turnoAEditar.mascota || '',
        raza: turnoAEditar.raza || '',
        dueno: turnoAEditar.dueno || '',
        fecha: turnoAEditar.fecha || new Date().toISOString().split('T')[0],
        hora: turnoAEditar.hora || '',
        servicio: turnoAEditar.servicio || 'Baño + Corte',
        notas: turnoAEditar.observaciones || ''
      });
    } else {
      setForm({ 
        mascota_id: '', mascota_nombre: '', raza: '', dueno: '', 
        fecha: new Date().toISOString().split('T')[0], 
        hora: '', servicio: 'Baño + Corte', notas: '' 
      });
    }
  }, [turnoAEditar, show]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const fieldName = name === 'notes' ? 'notas' : name;
    setForm(prev => ({ ...prev, [fieldName]: value }));

    if (name === 'mascota_id' && value) {
      const mascotaSel = mascotas.find(m => String(m.id) === value);
      if (mascotaSel) {
        setForm(prev => ({
          ...prev,
          mascota_nombre: mascotaSel.nombre,
          raza: mascotaSel.raza || '',
          dueno: mascotaSel.dueno_nombre || ''
        }));
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const datosEnviar = { ...form };
    datosEnviar.es_nueva_mascota = !form.mascota_id;
    datosEnviar.dueno_nombre = form.dueno.trim();
    datosEnviar.mascota_nombre = form.mascota_nombre.trim();
    
    onGuardar(datosEnviar, turnoAEditar?.id);
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
                <div className="col-12">
                  <label className="form-label fw-bold small">Mascota (Paciente)</label>
                  <select className="form-select shadow-sm" name="mascota_id" value={form.mascota_id} onChange={handleChange}>
                    <option value="">-- Registrar Nuevo Paciente --</option>
                    {mascotas.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre} ({m.dueno_nombre ? `de ${m.dueno_nombre}` : 'sin dueño'})
                      </option>
                    ))}
                  </select>
                </div>
                {!form.mascota_id && (
                  <>
                    <div className="col-6">
                      <label className="form-label fw-bold small text-primary">Nombre del Paciente *</label>
                      <input type="text" className="form-control shadow-sm border-primary" name="mascota_nombre" value={form.mascota_nombre} onChange={handleChange} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-bold small">Raza</label>
                      <input type="text" className="form-control shadow-sm" name="raza" value={form.raza} onChange={handleChange} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-bold small text-primary">Nombre del Dueño *</label>
                      <input type="text" className="form-control shadow-sm border-primary" name="dueno" value={form.dueno} onChange={handleChange} required />
                    </div>
                  </>
                )}
                <div className="col-6">
                  <label className="form-label fw-bold small">Fecha</label>
                  <input type="date" className="form-control shadow-sm" name="fecha" value={form.fecha} onChange={handleChange} required />
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
                  {turnoAEditar ? 'Actualizar' : 'Guardar y Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinalizarModal = ({ show, onClose, onGuardar, turnoId }) => {
  const [behavior, setBehavior] = useState('Bueno');
  const [notes, setNotes] = useState('');
  if (!show) return null;
  const handleGuardarFinal = () => {
    const fecha = new Date().toLocaleDateString('es-AR');
    const estadoTexto = `${behavior.toUpperCase()} - ${notes || 'Sin observaciones'} - ${fecha}`;
    onGuardar(turnoId, estadoTexto);
    setNotes(''); 
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
              <textarea className="form-control shadow-sm" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Se portó bien..." />
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

const PeluqueriaPeluqueroView = () => {
  const [turnosEstetica, setTurnosEstetica] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [accionConfirm, setAccionConfirm] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [turnoAEditar, setTurnoAEditar] = useState(null);

  const cargarTurnos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/estetica');
      setTurnosEstetica(Array.isArray(response.data) ? response.data : []);
    } catch (err) { 
      console.error("Error al cargar turnos:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { cargarTurnos(); }, []);

  const turnosFiltrados = useMemo(() => {
    return turnosEstetica.filter(t =>
      (t.mascota || '').toLowerCase().includes(filtro.toLowerCase()) ||
      (t.dueno || '').toLowerCase().includes(filtro.toLowerCase())
    );
  }, [turnosEstetica, filtro]);

  const grupos = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    const porFecha = {};
    turnosFiltrados.forEach(t => {
      const fechaStr = t.fecha || '';
      if (!fechaStr) return;
      if (!porFecha[fechaStr]) porFecha[fechaStr] = [];
      porFecha[fechaStr].push(t);
    });
    Object.keys(porFecha).forEach(fecha => {
      porFecha[fecha].sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
    });
    const hoy = porFecha[hoyStr] || [];
    delete porFecha[hoyStr];
    const fechasFuturas = Object.keys(porFecha).filter(f => f > hoyStr).sort();
    const fechasPasadas = Object.keys(porFecha).filter(f => f < hoyStr).sort((a, b) => b.localeCompare(a));
    return {
      hoy,
      futurosPorFecha: fechasFuturas.reduce((acc, fecha) => { acc[fecha] = porFecha[fecha]; return acc; }, {}),
      pasadosPorFecha: fechasPasadas.reduce((acc, fecha) => { acc[fecha] = porFecha[fecha]; return acc; }, {})
    };
  }, [turnosFiltrados]);

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(255, 20, 147);
      doc.text("Reporte de Peluqueria Canina", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 28);

      const tableColumn = ["Fecha", "Hora", "Mascota", "Dueño", "Servicio", "Estado"];
      const tableRows = turnosFiltrados.map(t => [
        t.fecha || 'Sin fecha',
        t.hora?.substring(0, 5) || 'Sin hora',
        t.mascota || 'Sin nombre',
        t.dueno || 'Sin dueño',
        t.servicio || '—',
        t.realizado === 2 ? 'Completado' : t.realizado === 1 ? 'En curso' : 'Pendiente'
      ]);

      autoTable(doc, {
        startY: 35,
        head: [tableColumn],
        body: tableRows,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 105, 180] },
        alternateRowStyles: { fillColor: [255, 240, 245] }
      });

      doc.save(`turnos_peluqueria_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el PDF. Verifica la consola.");
    }
  };

  const exportToExcel = () => {
    const dataExcel = turnosFiltrados.map(t => ({
      Fecha: t.fecha || 'Sin fecha',
      Hora: t.hora?.substring(0, 5) || 'Sin hora',
      Mascota: t.mascota || 'Sin nombre',
      Dueño: t.dueno || 'Sin dueño',
      Servicio: t.servicio || '—',
      Estado: t.realizado === 2 ? 'Completado' : t.realizado === 1 ? 'En curso' : 'Pendiente',
      Notas: t.observaciones || ''
    }));
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Turnos");
    XLSX.writeFile(wb, `turnos_peluqueria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const iniciarTurno = async (id) => {
    try {
      await api.put(`/estetica/${id}`, { realizado: 1 });
      cargarTurnos();
    } catch (err) { console.error("Error al iniciar turno:", err); }
  };

  const finalizarTurnoConNotas = async (id, notasFinales) => {
    try {
      await api.put(`/estetica/${id}`, { realizado: 2, observaciones: notasFinales });
      setShowFinalizarModal(false);
      cargarTurnos();
    } catch (err) { console.error("Error al finalizar turno:", err); }
  };

  const guardarTurno = async (datos, idExistente) => {
    try {
      const payload = {
        fecha: datos.fecha,
        hora: datos.hora,
        servicio: datos.servicio,
        mascota_nombre: datos.mascota_nombre,
        dueno_nombre: datos.dueno_nombre,
        mascota_id: datos.mascota_id || null,
        raza: datos.raza,
        notas: datos.notas,
        es_nueva_mascota: datos.es_nueva_mascota
      };
      if (idExistente) { 
        await api.put(`/estetica/${idExistente}`, payload); 
      } else { 
        await api.post('/estetica', payload); 
      }
      cargarTurnos();
      setShowTurnoModal(false);
    } catch (err) {
      console.error("Error al guardar:", err);
      alert("Error al guardar turno.");
    }
  };

  const confirmarAccion = () => {
    if (accionConfirm === "iniciar") { iniciarTurno(turnoSeleccionado); setShowConfirm(false); }
    else if (accionConfirm === "finalizar") { setShowConfirm(false); setShowFinalizarModal(true); }
    else if (accionConfirm === "eliminar") { 
      api.delete(`/estetica/${turnoSeleccionado}`).then(() => cargarTurnos()); 
      setShowConfirm(false); 
    }
  };

  const pedirConfirmacion = (id, accion) => { 
    setTurnoSeleccionado(id); 
    setAccionConfirm(accion); 
    setShowConfirm(true); 
  };

  const getBehaviorBadge = (estado) => {
    if (!estado) return null;
    const behavior = estado.split(' - ')[0]?.toUpperCase() || '';
    let color = behavior === 'BUENO' ? 'bg-success' : behavior === 'MALO' ? 'bg-danger' : 'bg-warning text-dark';
    return <span className={`badge ${color} px-2 py-1 mb-1 small`}>{behavior}</span>;
  };

  const renderCard = (turno) => (
    <div className="col-md-6 col-lg-4" key={turno.id}>
      <div className="card border-0 shadow-lg h-100" style={{ 
        borderRadius: '1.5rem', background: 'rgba(255,255,255,0.95)',
        borderLeft: `6px solid ${turno.realizado === 1 ? '#ffc107' : turno.realizado === 2 ? '#28a745' : '#dc3545'}`
      }}>
        <div className="card-body p-4 d-flex flex-column">
          <div className="d-flex justify-content-between align-items-start">
            <h5 className="fw-bold text-primary mb-1"><FontAwesomeIcon icon={faPaw} className="me-2" />{turno.mascota || 'Sin nombre'}</h5>
            <div className="d-flex gap-1">
              <button className="btn btn-sm text-primary" onClick={() => { setTurnoAEditar(turno); setShowTurnoModal(true); }}><FontAwesomeIcon icon={faPencilAlt} /></button>
              <button className="btn btn-sm text-danger" onClick={() => pedirConfirmacion(turno.id, "eliminar")}><FontAwesomeIcon icon={faTrash} /></button>
            </div>
          </div>
          <p className="text-muted small mb-2"><FontAwesomeIcon icon={faUser} className="me-1" />{turno.dueno || 'Sin dueño'}</p>
          <div className="small mb-1"><strong>Fecha/Hora:</strong> {turno.fecha || 'Sin fecha'} {turno.hora?.substring(0,5) || ''}</div>
          <div className="small mb-3"><strong>Servicio:</strong> {turno.servicio || '—'}</div>
          {turno.observaciones && (
            <div className="mt-2 p-2 rounded bg-light border small mb-3">
              {getBehaviorBadge(turno.observaciones)}
              <div className="text-muted fst-italic text-truncate mt-1">{turno.observaciones}</div>
            </div>
          )}
          <div className="mt-auto">
            {turno.realizado === 0 && <button className="btn btn-warning w-100 fw-bold rounded-pill" onClick={() => pedirConfirmacion(turno.id, "iniciar")}>Iniciar turno</button>}
            {turno.realizado === 1 && <button className="btn btn-success w-100 fw-bold rounded-pill" onClick={() => pedirConfirmacion(turno.id, "finalizar")}>Finalizar turno</button>}
            {turno.realizado === 2 && <div className="text-center text-success fw-bold"><FontAwesomeIcon icon={faCheckCircle} className="me-1" />Completado</div>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 p-4 p-md-5" style={{ backgroundImage: `url('https://i.pinimg.com/1200x/d3/62/54/d362543624849f9fba17f8f6a85c2953.jpg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <div className="container position-relative">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h1 className="fw-bold m-0" style={{ color: '#ff1493', textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
            <FontAwesomeIcon icon={faScissors} className="me-3" /> Peluquería
          </h1>
          <button className="btn rounded-pill px-4 fw-bold shadow text-white" style={{ backgroundColor: '#ff69b4', border: 'none' }} onClick={() => { setTurnoAEditar(null); setShowTurnoModal(true); }}>
            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
          </button>
        </div>

        <div className="row justify-content-center mb-5 g-3">
          <div className="col-12 col-md-6">
            <div className="card border-0 shadow-sm" style={{ borderRadius: '50px' }}>
              <div className="card-body py-2 px-4 d-flex align-items-center">
                <FontAwesomeIcon icon={faSearch} className="text-muted me-2" />
                <input type="text" className="form-control border-0 shadow-none bg-transparent" placeholder="Buscar por mascota o dueño..." value={filtro} onChange={e => setFiltro(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="col-12 col-md-4 d-flex gap-2 justify-content-center">
            <button className="btn btn-danger rounded-pill px-3 shadow-sm fw-bold" onClick={exportToPDF}>
              <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
            </button>
            <button className="btn btn-success rounded-pill px-3 shadow-sm fw-bold" onClick={exportToExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="me-2" /> Excel
            </button>
          </div>
        </div>

        {loading ? <div className="text-center text-white fw-bold mt-5">Cargando...</div> : (
          <>
            <h3 className="fw-bold mb-3 text-white"><FontAwesomeIcon icon={faCalendarDay} className="me-2" />Hoy</h3>
            <div className="row g-4 mb-5">
              {grupos.hoy.length > 0 ? grupos.hoy.map(renderCard) : <p className="text-white opacity-75">No hay turnos para hoy.</p>}
            </div>
            
            <h3 className="fw-bold mb-3 text-white"><FontAwesomeIcon icon={faArrowRight} className="me-2" />Próximos</h3>
            {Object.entries(grupos.futurosPorFecha).map(([fecha, turnos]) => (
              <div key={fecha} className="mb-5">
                <h4 className="fw-bold text-light mb-3">{new Date(fecha + "T00:00:00").toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                <div className="row g-4">{turnos.map(renderCard)}</div>
              </div>
            ))}

            <h3 className="fw-bold mb-3 text-white"><FontAwesomeIcon icon={faHistory} className="me-2" />Historial</h3>
            {Object.entries(grupos.pasadosPorFecha).map(([fecha, turnos]) => (
              <div key={fecha} className="mb-5">
                <h4 className="fw-bold text-light mb-3 opacity-75">{new Date(fecha + "T00:00:00").toLocaleDateString('es-AR')}</h4>
                <div className="row g-4">{turnos.map(renderCard)}</div>
              </div>
            ))}
          </>
        )}
      </div>
      <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmarAccion} title="Confirmar Acción" message="¿Deseas realizar este cambio en el turno?" />
      <TurnoModal show={showTurnoModal} onClose={() => setShowTurnoModal(false)} onGuardar={guardarTurno} turnoAEditar={turnoAEditar} />
      <FinalizarModal show={showFinalizarModal} onClose={() => setShowFinalizarModal(false)} onGuardar={finalizarTurnoConNotas} turnoId={turnoSeleccionado} />
    </div>
  );
};

export default PeluqueriaPeluqueroView;