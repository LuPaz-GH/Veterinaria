// src/component/ConfirmModal.jsx
import React from 'react';

const ConfirmModal = ({
  show,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro de realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'danger',
  showCancel = true, // Nueva prop para ocultar cancelar en mensajes de éxito
  style = {} 
}) => {
  if (!show) return null;

  const btnClass = `btn btn-${confirmColor} px-5 py-2 rounded-pill fw-bold shadow-sm`;

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        zIndex: 3000, 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        ...style 
      }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold" style={{ color: confirmColor === 'success' ? '#28a745' : '#663399' }}>
              {title}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center py-4">
            <p className="fs-5 text-muted mb-4">{message}</p>
            <div className="d-flex justify-content-center gap-3">
              {showCancel && (
                <button 
                  type="button" 
                  className="btn btn-light px-5 py-2 rounded-pill fw-bold shadow-sm"
                  onClick={onClose}
                >
                  {cancelText}
                </button>
              )}
              <button 
                type="button" 
                className={btnClass}
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;