import React, { useState, useEffect } from 'react';

const MascotaModal = ({ show, onClose, onGuardar, datosEdicion }) => {
  const [formData, setFormData] = useState({ nombre: '', especie: 'Perro', raza: '', dueño: '' });

  useEffect(() => {
    if (datosEdicion) {
      setFormData(datosEdicion);
    } else {
      setFormData({ nombre: '', especie: 'Perro', raza: '', dueño: '' });
    }
  }, [datosEdicion, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formData);
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content border-0 shadow-lg" onSubmit={handleSubmit} style={{ borderRadius: '20px' }}>
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold" style={{ color: '#663399' }}>
              {datosEdicion ? 'Editar Mascota' : 'Registrar Mascota'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Nombre</label>
              <input type="text" className="form-control" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
            </div>
            <div className="row mb-3">
              <div className="col">
                <label className="form-label small text-muted">Especie</label>
                <select className="form-select" value={formData.especie} onChange={(e) => setFormData({...formData, especie: e.target.value})}>
                  <option value="Perro">Perro</option>
                  <option value="Gato">Gato</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="col">
                <label className="form-label small text-muted">Raza</label>
                <input type="text" className="form-control" value={formData.raza} onChange={(e) => setFormData({...formData, raza: e.target.value})} />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">Nombre del Dueño</label>
              <input type="text" className="form-control" value={formData.dueño} onChange={(e) => setFormData({...formData, dueño: e.target.value})} required />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#99cc33', border: 'none' }}>
              {datosEdicion ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MascotaModal;