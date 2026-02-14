// src/component/AtencionModal.jsx
import React, { useState } from 'react';

const AtencionModal = ({ show, onClose, turno, veterinarioId, onFinalizar }) => {
    const [atencion, setAtencion] = useState({ peso: '', diagnostico: '', tratamiento: '' });

    if (!show || !turno) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onFinalizar({
            turno_id: turno.id,
            mascota_id: turno.mascota_id,
            veterinario_id: veterinarioId,
            ...atencion
        });
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <form className="modal-content border-0 rounded-4 shadow-lg" onSubmit={handleSubmit}>
                    <div className="modal-header bg-primary text-white border-0">
                        <h5 className="modal-title fw-bold">Atendiendo a: {turno.mascota}</h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
                    </div>
                    <div className="modal-body p-4">
                        <div className="row mb-3">
                            <div className="col-md-4">
                                <label className="form-label fw-bold">Peso (kg)</label>
                                <input type="number" step="0.1" className="form-control" 
                                    onChange={(e) => setAtencion({...atencion, peso: e.target.value})} required />
                            </div>
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Diagnóstico</label>
                            <textarea className="form-control" rows="3" 
                                onChange={(e) => setAtencion({...atencion, diagnostico: e.target.value})} required></textarea>
                        </div>
                        <div className="mb-3">
                            <label className="form-label fw-bold">Tratamiento sugerido</label>
                            <textarea className="form-control" rows="3" 
                                onChange={(e) => setAtencion({...atencion, tratamiento: e.target.value})} required></textarea>
                        </div>
                    </div>
                    <div className="modal-footer border-0">
                        <button type="button" className="btn btn-light" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-success px-4 rounded-pill fw-bold">FINALIZAR CONSULTA</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AtencionModal;