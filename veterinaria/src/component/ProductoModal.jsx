import React, { useState, useEffect } from 'react';

const ProductoModal = ({ show, onClose, onGuardar, datosEdicion, categoria }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    precio_venta: '',
    stock: '',
    stock_minimo: 5,
    info: '' // Aquí guardamos el vencimiento
  });

  useEffect(() => {
    if (datosEdicion && show) {
      setFormData({
        nombre: datosEdicion.nombre || '',
        precio_venta: datosEdicion.precio_venta || '',
        stock: datosEdicion.stock || '',
        stock_minimo: datosEdicion.stock_minimo || 5,
        info: datosEdicion.vencimiento_alimento || datosEdicion.vencimiento_med || ''
      });
    } else {
      setFormData({ nombre: '', precio_venta: '', stock: '', stock_minimo: 5, info: '' });
    }
  }, [datosEdicion, show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onGuardar(formData);
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5000 }}>
      <div className="modal-dialog modal-dialog-centered">
        <form className="modal-content border-0 shadow-lg rounded-4" onSubmit={handleSubmit}>
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold" style={{ color: '#663399' }}>
              {datosEdicion ? '📝 Editar Producto' : '📦 Nuevo Producto'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label small fw-bold">Nombre</label>
              <input type="text" className="form-control" value={formData.nombre} 
                     onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
            </div>
            <div className="row">
              <div className="col-6 mb-3">
                <label className="form-label small fw-bold">Precio Venta ($)</label>
                <input type="number" className="form-control" value={formData.precio_venta} 
                       onChange={(e) => setFormData({...formData, precio_venta: e.target.value})} required />
              </div>
              <div className="col-6 mb-3">
                <label className="form-label small fw-bold">Stock</label>
                <input type="number" className="form-control" value={formData.stock} 
                       onChange={(e) => setFormData({...formData, stock: e.target.value})} required />
              </div>
            </div>
            {categoria !== 'petshop' && (
              <div className="mb-3">
                <label className="form-label small fw-bold">Vencimiento (opcional)</label>
                <input type="date" className="form-control" value={formData.info ? formData.info.split('T')[0] : ''} 
                       onChange={(e) => setFormData({...formData, info: e.target.value})} />
              </div>
            )}
          </div>

          <div className="modal-footer border-0">
            <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary px-4 rounded-pill fw-bold" style={{ backgroundColor: '#99cc33', border: 'none' }}>
              {datosEdicion ? 'Actualizar' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductoModal;