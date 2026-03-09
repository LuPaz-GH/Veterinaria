import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaw, faPlus, faEdit, faTrash, faSearch, 
  faUserPlus, faExclamationTriangle, faSave, faTimes,
  faFilePdf, faFileExcel, faInfoCircle, faUser, faDna, faClipboardList, faIdCard
} from '@fortawesome/free-solid-svg-icons';

// --- COMPONENTE DE CONFIRMACIÓN IMPORTADO ---
import ConfirmModal from '../component/ConfirmModal'; 

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';  // ← AXIOS CON TOKEN AUTOMÁTICO

const MascotasPage = () => {
  const [mascotas, setMascotas] = useState([]);
  const [duenos, setDuenos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQuickDueno, setShowQuickDueno] = useState(false);
  
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);

  const [datosEdicion, setDatosEdicion] = useState(null);
  const [idEliminar, setIdEliminar] = useState(null);
  
  const [formData, setFormData] = useState({ nombre: '', especie: '', raza: '', dueno_id: '' });
  const [quickDueno, setQuickDueno] = useState({ nombre: '', dni: '', telefono: '' });

  const cargarDatos = async () => {
    try {
      const [resM, resD] = await Promise.all([
        api.get('/mascotas'),
        api.get('/duenos')
      ]);
      setMascotas(Array.isArray(resM.data) ? resM.data : []);
      setDuenos(Array.isArray(resD.data) ? resD.data : []);
    } catch (err) { 
      console.error("Error al cargar datos:", err);
      if (err.response?.status === 401) {
        alert("Sesión expirada. Por favor, inicia sesión nuevamente.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        alert("No se pudieron cargar las mascotas o dueños. Revisa la conexión.");
      }
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(mascotasFiltradas.map(m => ({
      Nombre: m.nombre, Dueño: m.dueno_nombre, Especie: m.especie, Raza: m.raza || 'Mestizo'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, "Pacientes_Malfi.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Veterinaria Malfi - Reporte de Pacientes", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Dueño', 'Especie', 'Raza']],
      body: mascotasFiltradas.map(m => [m.nombre, m.dueno_nombre, m.especie, m.raza || 'Mestizo']),
      headStyles: { fillColor: [102, 51, 153] }
    });
    doc.save("Pacientes_Malfi.pdf");
  };

  const handleVerDetalle = (m) => {
    setPacienteSeleccionado(m);
    setShowDetalleModal(true);
  };

  const handleGuardarMascota = async (e) => {
    e.preventDefault();
    const url = datosEdicion ? `/mascotas/${datosEdicion.id}` : '/mascotas';
    try {
      await api({
        url,
        method: datosEdicion ? 'PUT' : 'POST',
        data: formData
      });
      setShowFormModal(false);
      cargarDatos();
    } catch (err) {
      console.error("Error al guardar mascota:", err);
      alert("No se pudo guardar la mascota. Revisa los datos.");
    }
  };

  const handleGuardarQuickDueno = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/duenos', quickDueno);
      if (res.data.success) {
        await cargarDatos(); 
        setFormData({ ...formData, dueno_id: res.data.id }); 
        setShowQuickDueno(false);
      }
    } catch (err) {
      console.error("Error al crear dueño rápido:", err);
      alert("No se pudo crear el dueño. Revisa los datos.");
    }
  };

  const confirmarEliminar = async () => {
    try {
      await api.delete(`/mascotas/${idEliminar}`);
      setShowConfirmModal(false);
      cargarDatos();
    } catch (err) {
      console.error("Error al eliminar mascota:", err);
      alert("No se pudo eliminar la mascota.");
    }
  };

  // Evitamos crash si mascotas no es array (por error 401 o carga fallida)
  const mascotasFiltradas = Array.isArray(mascotas) 
    ? mascotas.filter(m => 
        (m.nombre || "").toLowerCase().includes(busqueda.toLowerCase()) || 
        (m.dueno_nombre && m.dueno_nombre.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : [];

  return (
    <div 
      className="min-vh-100 position-relative"
      style={{ 
        backgroundImage: `url('https://i.pinimg.com/1200x/67/eb/ec/67ebec541fdc84fd6fa94fdffe53653c.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Sin overlay morado: imagen limpia y sin filtro */}
      <div className="container-fluid p-4 position-relative" style={{ zIndex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="text-white fw-bold"><FontAwesomeIcon icon={faPaw} className="me-2"/> Pacientes</h1>
          <div className="d-flex gap-2">
              <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF} title="PDF"><FontAwesomeIcon icon={faFilePdf} /></button>
              <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel} title="Excel"><FontAwesomeIcon icon={faFileExcel} /></button>
              <button className="btn btn-nueva-mascota rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setFormData({nombre:'', especie:'', raza:'', dueno_id:''}); setShowFormModal(true); }}>
                <FontAwesomeIcon icon={faPlus} className="me-2"/> Nueva Mascota
              </button>
          </div>
        </div>

        <div className="row justify-content-center mb-5">
          <div className="col-md-6">
            <div className="input-group rounded-pill bg-white bg-opacity-75 overflow-hidden shadow-sm border-0 backdrop-blur">
              <span className="input-group-text bg-transparent border-0 ps-4"><FontAwesomeIcon icon={faSearch} className="text-muted"/></span>
              <input type="text" className="form-control border-0 py-3 bg-transparent text-dark" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              {busqueda && <button className="btn bg-transparent border-0 text-muted pe-4" onClick={() => setBusqueda('')}><FontAwesomeIcon icon={faTimes} /></button>}
            </div>
          </div>
        </div>

        <div className="row g-4">
          {mascotasFiltradas.map(m => (
            <div className="col-md-3" key={m.id}>
              <div 
                className="card border-0 shadow-lg p-4 rounded-4 h-100 text-center bg-white bg-opacity-75 backdrop-blur transition-card" 
                style={{ 
                  cursor: 'pointer',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
                onClick={() => handleVerDetalle(m)}
              >
                <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3 mx-auto" style={{color:'#663399'}}><FontAwesomeIcon icon={faPaw} size="2x" /></div>
                <h5 className="fw-bold mb-1 text-capitalize">{m.nombre}</h5>
                <p className="text-muted small mb-0">Dueño: {m.dueno_nombre}</p>
                <p className="text-muted x-small mb-3">Animal: {m.especie}</p>
                <div className="d-flex justify-content-center gap-2 mt-auto">
                  <button className="btn btn-sm btn-outline-primary rounded-circle shadow-sm" onClick={(e) => { e.stopPropagation(); setDatosEdicion(m); setFormData(m); setShowFormModal(true); }}><FontAwesomeIcon icon={faEdit} /></button>
                  <button className="btn btn-sm btn-outline-danger rounded-circle shadow-sm" onClick={(e) => { e.stopPropagation(); setIdEliminar(m.id); setShowConfirmModal(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Ficha Médica Rediseñado */}
        {showDetalleModal && pacienteSeleccionado && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 2000}}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                <div className="modal-header border-0 text-white p-4" style={{ background: 'linear-gradient(135deg, #663399 0%, #8e44ad 100%)' }}>
                  <h5 className="modal-title fw-bold">
                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" /> 
                    Ficha Médica del Paciente
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetalleModal(false)}></button>
                </div>
                <div className="modal-body p-4 bg-light">
                  <div className="text-center mb-4">
                    <div className="bg-white rounded-circle d-inline-flex p-4 shadow-sm border border-5 border-primary border-opacity-10">
                      <FontAwesomeIcon icon={faPaw} size="4x" className="text-primary" />
                    </div>
                    <h2 className="fw-bold mt-2 text-dark text-capitalize">{pacienteSeleccionado.nombre}</h2>
                  </div>
                  
                  <div className="list-group border-0 shadow-sm rounded-4 overflow-hidden mb-3">
                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
                      <FontAwesomeIcon icon={faUser} className="text-muted" style={{width:'20px'}} />
                      <div><small className="text-muted d-block fw-bold text-uppercase">Dueño Responsable</small><span className="fs-5">{pacienteSeleccionado.dueno_nombre}</span></div>
                    </div>
                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
                      <FontAwesomeIcon icon={faPaw} className="text-muted" style={{width:'20px'}} />
                      <div><small className="text-muted d-block fw-bold text-uppercase">Especie</small><span className="fs-5">{pacienteSeleccionado.especie}</span></div>
                    </div>
                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0">
                      <FontAwesomeIcon icon={faDna} className="text-muted" style={{width:'20px'}} />
                      <div><small className="text-muted d-block fw-bold text-uppercase">Raza</small><span className="fs-5">{pacienteSeleccionado.raza || 'Mestizo'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-0 bg-light pt-0 p-4">
                  <button className="btn btn-primary w-100 rounded-pill fw-bold py-2 shadow-sm" onClick={() => setShowDetalleModal(false)}>CERRAR FICHA</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Formulario */}
        {showFormModal && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)', zIndex: 1050}}>
            <div className="modal-dialog modal-dialog-centered">
              <form className="modal-content border-0 rounded-4 shadow-lg p-4" onSubmit={handleGuardarMascota}>
                <h4 className="fw-bold mb-4" style={{color:'#663399'}}>{datosEdicion ? '📝 Editar Paciente' : '➕ Nueva Mascota'}</h4>
                <label className="small fw-bold text-muted">Nombre</label>
                <input type="text" className="form-control mb-3 rounded-3" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                <label className="small fw-bold text-muted">Especie</label>
                <select className="form-select mb-3 rounded-3" value={formData.especie} onChange={e => setFormData({...formData, especie: e.target.value})} required>
                  <option value="">Seleccionar...</option><option value="Perro">Perro</option><option value="Gato">Gato</option><option value="Otro">Otro</option>
                </select>
                <label className="small fw-bold text-muted">Raza</label>
                <input type="text" className="form-control mb-3 rounded-3" value={formData.raza} onChange={e => setFormData({...formData, raza: e.target.value})} />
                <label className="small fw-bold text-muted">Dueño</label>
                <div className="input-group mb-4">
                  <select className="form-select" value={formData.dueno_id} onChange={e => setFormData({...formData, dueno_id: e.target.value})} required>
                    <option value="">Dueño...</option>
                    {duenos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                  <button type="button" className="btn btn-primary" onClick={() => setShowQuickDueno(true)}><FontAwesomeIcon icon={faUserPlus} /></button>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-light w-100 rounded-pill" onClick={() => setShowFormModal(false)}>Cerrar</button>
                  <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold" style={{backgroundColor:'#663399', border:'none'}}>Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Quick Dueño */}
        {showQuickDueno && (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.4)', zIndex: 1100}}>
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <form className="modal-content border-0 rounded-4 shadow-lg p-4" onSubmit={handleGuardarQuickDueno}>
                <h6 className="fw-bold mb-3 text-center"><FontAwesomeIcon icon={faIdCard} className="me-2"/>Dueño</h6>
                <input type="text" className="form-control mb-2" placeholder="Nombre" value={quickDueno.nombre} onChange={e => setQuickDueno({...quickDueno, nombre: e.target.value})} required />
                <input type="text" className="form-control mb-2" placeholder="DNI" value={quickDueno.dni} onChange={e => setQuickDueno({...quickDueno, dni: e.target.value})} required />
                <button type="submit" className="btn btn-success w-100 rounded-pill btn-sm fw-bold">Guardar Dueño</button>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal show={showConfirmModal} onClose={() => setShowConfirmModal(false)} onConfirm={confirmarEliminar} title="¿Borrar?" message="Esta acción no se puede deshacer." />
      </div>
    </div>
  );
};

export default MascotasPage;