import React, { useState, useEffect } from 'react';

const HistorialModal = ({ show, onClose, onGuardar, clientes = [], datosEdicion }) => {
  const [formData, setFormData] = useState({ 
    dueñoId: '', 
    mascotaId: '', 
    fecha: '', 
    diagnostico: '', 
    tratamiento: '' 
  });
  const [mascotasDelDueño, setMascotasDelDueño] = useState([]);

  // Efecto para cargar datos si se va a editar o resetear si es nuevo
  useEffect(() => {
    if (datosEdicion && show) {
      setFormData(datosEdicion);
      // Al editar, buscamos las mascotas del dueño guardado
      const cliente = clientes.find(c => c.id === parseInt(datosEdicion.dueñoId));
      setMascotasDelDueño(cliente?.mascotas || []);
    } else if (show) {
      // Si es nuevo, ponemos la fecha de hoy por defecto
      setFormData({ 
        dueñoId: '', 
        mascotaId: '', 
        fecha: new Date().toISOString().split('T')[0], 
        diagnostico: '', 
        tratamiento: '' 
      });
      setMascotasDelDueño([]);
    }
  }, [datosEdicion, show, clientes]);

  // Maneja el cambio de dueño para actualizar la lista de mascotas
  const handleDueñoChange = (id) => {
    setFormData({ ...formData, dueñoId: id, mascotaId: '' });
    const clienteEncontrado = clientes.find(c => c.id === parseInt(id));
    setMascotasDelDueño(clienteEncontrado?.mascotas || []);
  };

  if (!show) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form 
          className="modal-content border-0 shadow-lg" 
          onSubmit={(e) => { e.preventDefault(); onGuardar(formData); }} 
          style={{ borderRadius: '20px' }}
        >
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold" style={{ color: '#ff4500' }}>
              {datosEdicion ? 'Editar Registro Médico' : 'Nueva Entrada Médica'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {/* Selección de Dueño */}
            <div className="mb-3">
              <label className="form-label small text-muted">Dueño Responsable</label>
              <select 
                className="form-select" 
                value={formData.dueñoId} 
                onChange={(e) => handleDueñoChange(e.target.value)} 
                required
              >
                <option value="">-- Seleccionar Dueño --</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="row">
              {/* Selección de Mascota */}
              <div className="col-md-6 mb-3">
                <label className="form-label small text-muted">Mascota Paciente</label>
                <select 
                  className="form-select" 
                  value={formData.mascotaId} 
                  onChange={(e) => setFormData({...formData, mascotaId: e.target.value})} 
                  required
                >
                  <option value="">-- Seleccionar --</option>
                  {mascotasDelDueño.map(m => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Fecha de Consulta */}
              <div className="col-md-6 mb-3">
                <label className="form-label small text-muted">Fecha de Atención</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={formData.fecha} 
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})} 
                  required 
                />
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="mb-3">
              <label className="form-label small text-muted">Diagnóstico Médico</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.diagnostico} 
                onChange={(e) => setFormData({...formData, diagnostico: e.target.value})} 
                placeholder="Ej: Infección respiratoria leve" 
                required 
              />
            </div>

            {/* Tratamiento */}
            <div className="mb-3">
              <label className="form-label small text-muted">Tratamiento e Indicaciones</label>
              <textarea 
                className="form-control" 
                rows="3" 
                value={formData.tratamiento} 
                onChange={(e) => setFormData({...formData, tratamiento: e.target.value})} 
                placeholder="Detalla medicamentos, dosis y próximos controles..."
                required
              ></textarea>
            </div>
          </div>

          <div className="modal-footer border-0">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
            <button 
              type="submit" 
              className="btn btn-danger px-4" 
              style={{ backgroundColor: '#ff4500', border: 'none' }}
            >
              {datosEdicion ? 'Actualizar Registro' : 'Guardar en Historial'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HistorialModal;