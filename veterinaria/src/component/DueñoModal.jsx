import React, { useState, useEffect } from 'react';

const DueñoModal = ({ show, onClose, onGuardar, datosEdicion }) => {
    // Agregamos 'email' que está en tu tabla SQL y manejamos el 'id' para editar
    const [formData, setFormData] = useState({ 
        nombre: '', 
        dni: '', 
        telefono: '', 
        email: '', 
        direccion: '' 
    });

    useEffect(() => {
        if (datosEdicion && show) {
            setFormData(datosEdicion);
        } else if (show) {
            // Si es nuevo, reseteamos el formulario
            setFormData({ nombre: '', dni: '', telefono: '', email: '', direccion: '' });
        }
    }, [datosEdicion, show]);

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        // Pasamos el formData completo al componente padre (DueñosPage)
        onGuardar(formData);
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 5000 }}>
            <div className="modal-dialog modal-dialog-centered">
                <form className="modal-content border-0 shadow-lg" onSubmit={handleSubmit} style={{ borderRadius: '20px' }}>
                    <div className="modal-header border-0">
                        <h5 className="modal-title fw-bold" style={{ color: '#663399' }}>
                            {datosEdicion ? '📝 Editar Dueño' : '👤 Registrar Nuevo Dueño'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label small text-muted fw-bold">Nombre Completo</label>
                            <input type="text" className="form-control" value={formData.nombre} 
                                onChange={(e) => setFormData({...formData, nombre: e.target.value})} required />
                        </div>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label small text-muted fw-bold">DNI / CUIL</label>
                                <input type="text" className="form-control" value={formData.dni} 
                                    onChange={(e) => setFormData({...formData, dni: e.target.value})} required />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label small text-muted fw-bold">Teléfono</label>
                                <input type="text" className="form-control" value={formData.telefono} 
                                    onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted fw-bold">Correo Electrónico</label>
                            <input type="email" className="form-control" value={formData.email || ''} 
                                onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@gmail.com" />
                        </div>
                        <div className="mb-3">
                            <label className="form-label small text-muted fw-bold">Dirección</label>
                            <input type="text" className="form-control" value={formData.direccion} 
                                onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
                        </div>
                    </div>

                    <div className="modal-footer border-0">
                        <button type="button" className="btn btn-light rounded-pill px-4" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-primary px-4 rounded-pill fw-bold" 
                                style={{ backgroundColor: '#99cc33', border: 'none' }}>
                            {datosEdicion ? 'Actualizar Datos' : 'Guardar Dueño'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DueñoModal;