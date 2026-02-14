import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';

const TurnoModal = ({ show, onClose, onGuardar, clientes = [], onAgregarNuevoCliente, datosEdicion }) => {
  const [formData, setFormData] = useState({ 
    dueñoId: '', 
    mascotaId: '', 
    nuevaMascotaNombre: '', 
    nuevaMascotaEspecie: '', 
    fecha: '', 
    hora: '', 
    motivo: '' 
  });

  const [mascotasDelDueño, setMascotasDelDueño] = useState([]);
  const [esNuevaMascota, setEsNuevaMascota] = useState(false);

  useEffect(() => {
    if (datosEdicion && show) {
      setFormData(datosEdicion);
      const cliente = clientes.find(c => c.id === parseInt(datosEdicion.dueñoId));
      setMascotasDelDueño(cliente?.mascotas || []);
      setEsNuevaMascota(false);
    } else if (show) {
      setFormData({ dueñoId: '', mascotaId: '', nuevaMascotaNombre: '', nuevaMascotaEspecie: '', fecha: '', hora: '', motivo: '' });
      setMascotasDelDueño([]);
      setEsNuevaMascota(false);
    }
  }, [datosEdicion, show, clientes]);

  if (!show) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content border-0 shadow-lg" onSubmit={(e) => { e.preventDefault(); onGuardar(formData); }} style={{ borderRadius: '20px' }}>
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold" style={{ color: '#663399' }}>
              {datosEdicion ? 'Reagendar Turno' : 'Programar Turno'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Dueño</label>
              <div className="d-flex gap-2">
                <select className="form-select" value={formData.dueñoId} onChange={(e) => setFormData({...formData, dueñoId: e.target.value})} required>
                  <option value="">-- Seleccionar cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button type="button" className="btn btn-outline-primary" onClick={onAgregarNuevoCliente}><FontAwesomeIcon icon={faUserPlus} /></button>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label small text-muted">Fecha</label>
                <input type="date" className="form-control" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label small text-muted">Hora</label>
                <input type="time" className="form-control" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small text-muted">Motivo</label>
              <textarea className="form-control" rows="2" value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})}></textarea>
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#00bfff', border: 'none' }}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TurnoModal;