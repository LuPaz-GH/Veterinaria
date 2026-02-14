import React, { useState, useEffect } from 'react';

const InventarioModal = ({ show, onClose, onGuardar, datosEdicion, categoria }) => {
  const [formData, setFormData] = useState({ nombre: '', cantidad: 0, precio: '', info: '' });

  useEffect(() => {
    if (datosEdicion && show) {
      setFormData(datosEdicion);
    } else if (show) {
      setFormData({ nombre: '', cantidad: 0, precio: '', info: '' });
    }
  }, [datosEdicion, show]);

  if (!show) return null;

  const labelInfo = categoria === 'medicamentos' ? 'Fecha de Vencimiento' : 
                    categoria === 'alimentos' ? 'Tipo (Ej: Cachorro)' : 'Descripción Corta';

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content border-0 shadow-lg" 
              onSubmit={(e) => { e.preventDefault(); onGuardar(formData); }} 
              style={{ borderRadius: '20px' }}>
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">
              {datosEdicion ? 'Editar Producto' : 'Nuevo Producto'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label small text-muted">Nombre del Producto</label>
              <input type="text" className="form-control" value={formData.nombre} 
                     onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label small text-muted">Cantidad</label>
                <input type="number" className="form-control" value={formData.cantidad} 
                       onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value)})} required />
              </div>
              <div className="col-6 mb-3">
                <label className="form-label small text-muted">Precio ($)</label>
                <input type="number" className="form-control" value={formData.precio} 
                       onChange={(e) => setFormData({...formData, precio: e.target.value})} required />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label small text-muted">{labelInfo}</label>
              <input type="text" className="form-control" value={formData.info} 
                     onChange={(e) => setFormData({...formData, info: e.target.value})} 
                     placeholder={categoria === 'medicamentos' ? 'AAAA-MM-DD' : ''} required />
            </div>
          </div>
          <div className="modal-footer border-0">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary px-4" style={{ borderRadius: '10px' }}>
              Guardar en Inventario
            </button>
          </div>
        </form>
      </div>
    </div>
  ); 
};

export default InventarioModal;