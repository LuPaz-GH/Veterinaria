import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTools, faSave, faEdit, faCheckCircle, faStethoscope, 
    faScissors, faArrowLeft, faChevronLeft, faChevronRight,
    faTrash, faTrashRestore, faTimes, faExclamationTriangle, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';

const ConfiguracionPage = () => {
    const [servicios, setServicios] = useState([]);
    const [serviciosEliminados, setServiciosEliminados] = useState([]);
    const [editando, setEditando] = useState(null);
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [showPapelera, setShowPapelera] = useState(false);

    // --- ESTADOS PARA NUEVOS MODALES ESTÉTICOS ---
    const [confirmModal, setConfirmModal] = useState({ show: false, servicio: null });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' }); // type: 'success', 'restored', 'error'

    // --- ESTADOS PARA PAGINACIÓN ---
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 10;

    useEffect(() => { 
        fetchServicios(); 
    }, []);

    // Función para mostrar mensajes temporales (Toasts)
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const fetchServicios = async () => {
        try {
            const res = await api.get('/servicios');
            const activos = res.data.filter(s => s.activo === 1 || s.activo === true);
            const eliminados = res.data.filter(s => s.activo === 0 || s.activo === false);
            setServicios(activos);
            setServiciosEliminados(eliminados);
        } catch (err) {
            console.error("Error al cargar servicios:", err);
            showToast("Error al conectar con el servidor", "error");
        }
    };

    // --- LÓGICA DE PAGINACIÓN ---
    const ultimoIndice = paginaActual * registrosPorPagina;
    const primerIndice = ultimoIndice - registrosPorPagina;
    const serviciosPaginados = servicios.slice(primerIndice, ultimoIndice);
    const totalPaginas = Math.ceil(servicios.length / registrosPorPagina);

    const cambiarPagina = (numero) => {
        if (numero >= 1 && numero <= totalPaginas) {
            setPaginaActual(numero);
        }
    };

    const handleGuardar = async (s) => {
        if (!nuevoPrecio || isNaN(nuevoPrecio)) {
            showToast("Ingrese un precio válido", "error");
            return;
        }
        try {
            await api.put(`/servicios/${s.id}`, { 
                precio: parseFloat(nuevoPrecio), 
                nombre: s.nombre 
            });
            setEditando(null);
            setNuevoPrecio('');
            await fetchServicios();
            showToast(`¡Precio de "${s.nombre}" actualizado!`, "success");
        } catch (err) { 
            console.error(err);
            showToast("Error al actualizar el precio", "error");
        }
    };

    // Abrir modal de confirmación en lugar de confirm() nativo
    const solicitarMoverAPapelera = (servicio) => {
        setConfirmModal({ show: true, servicio });
    };

    const confirmarMoverAPapelera = async () => {
        const { servicio } = confirmModal;
        setConfirmModal({ show: false, servicio: null }); // Cerrar modal primero

        try {
            await api.put(`/servicios/${servicio.id}`, { 
                activo: 0,
                nombre: servicio.nombre 
            });
            await fetchServicios();
            showToast(`"${servicio.nombre}" movido a la papelera`, "success");
            if (serviciosPaginados.length === 1 && paginaActual > 1) {
                setPaginaActual(paginaActual - 1);
            }
        } catch (err) {
            console.error(err);
            showToast("Error al mover a papelera", "error");
        }
    };

    const restaurarServicio = async (servicio) => {
        try {
            await api.put(`/servicios/${servicio.id}`, { 
                activo: 1,
                nombre: servicio.nombre 
            });
            await fetchServicios();
            showToast(`"${servicio.nombre}" restaurado correctamente`, "restored");
        } catch (err) {
            console.error(err);
            showToast("Error al restaurar", "error");
        }
    };

    return (
        <div className="min-vh-100 p-4 position-relative" 
             style={{ 
                backgroundImage: `url('https://i.pinimg.com/736x/ef/1f/af/ef1faf0a74cd6ef7768e445731e194eb.jpg')`,
                backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
             }}>
            
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.65)', zIndex: 0 }} />

            <div className="position-relative" style={{ zIndex: 1 }}>
                
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <button className="btn btn-light rounded-pill px-4 py-2 shadow-sm fw-bold" onClick={() => window.location.href = '/caja'}>
                        <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Volver
                    </button>
                    <button className="btn btn-danger rounded-pill px-4 py-2 shadow-sm fw-bold" onClick={() => setShowPapelera(true)}>
                        <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera ({serviciosEliminados.length})
                    </button>
                </div>

                <h2 className="fw-bold mb-4 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <FontAwesomeIcon icon={faTools} className="me-3" /> Configuración de Precios
                </h2>

                <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0 align-middle">
                            <thead className="bg-light text-uppercase fs-7 text-muted">
                                <tr>
                                    <th className="ps-4 py-3">Servicio</th>
                                    <th>Categoría</th>
                                    <th>Precio Actual</th>
                                    <th className="text-end pe-4">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviciosPaginados.length > 0 ? (
                                    serviciosPaginados.map(s => (
                                        <tr key={s.id}>
                                            <td className="ps-4 fw-bold text-dark">
                                                <FontAwesomeIcon 
                                                    icon={s.categoria === 'veterinaria' ? faStethoscope : faScissors} 
                                                    className={`me-2 ${s.categoria === 'veterinaria' ? 'text-danger' : 'text-info'}`}
                                                /> {s.nombre}
                                            </td>
                                            <td>
                                                <span className={`badge rounded-pill text-capitalize px-3 py-2 fs-8 ${s.categoria === 'veterinaria' ? 'bg-danger-subtle text-danger' : 'bg-info-subtle text-info'}`}>
                                                    {s.categoria}
                                                </span>
                                            </td>
                                            <td>
                                                {editando === s.id ? (
                                                    <div className="input-group input-group-sm rounded-pill overflow-hidden border" style={{width: '150px'}}>
                                                        <span className="input-group-text bg-white border-0 text-muted">$</span>
                                                        <input type="number" className="form-control border-0 shadow-none ps-0" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
                                                    </div>
                                                ) : (
                                                    <span className="fw-bold text-success fs-5">$ {Number(s.precio).toLocaleString('es-AR')}</span>
                                                )}
                                            </td>
                                            <td className="text-end pe-4">
                                                {editando === s.id ? (
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <button className="btn btn-success btn-sm rounded-pill px-3 fw-bold" onClick={() => handleGuardar(s)}><FontAwesomeIcon icon={faSave} /> Guardar</button>
                                                        <button className="btn btn-light btn-sm rounded-pill px-3 border" onClick={() => { setEditando(null); setNuevoPrecio(''); }}>Cancelar</button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex gap-2 justify-content-end align-items-center">
                                                        <button className="btn btn-outline-primary btn-sm rounded-pill px-4 fw-bold" onClick={() => { setEditando(s.id); setNuevoPrecio(s.precio); }}>
                                                            <FontAwesomeIcon icon={faEdit} className="me-1"/> Editar
                                                        </button>
                                                        <button className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{width:'32px', height:'32px'}} onClick={() => solicitarMoverAPapelera(s)}>
                                                            <FontAwesomeIcon icon={faTrash} size="xs" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center py-5 text-muted">No hay servicios activos.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* PAGINACIÓN */}
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light border-top">
                        <div className="small text-muted fw-bold">Página {paginaActual} de {totalPaginas || 1}</div>
                        <div className="btn-group shadow-sm">
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === 1} onClick={() => cambiarPagina(paginaActual - 1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === totalPaginas || totalPaginas === 0} onClick={() => cambiarPagina(paginaActual + 1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* 1. NUEVO MODAL ESTÉTICO DE CONFIRMACIÓN (Reemplaza confirm) */}
            {/* ============================================================ */}
            {confirmModal.show && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2200, backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm" style={{maxWidth: '350px'}}>
                        <div className="modal-content border-0 rounded-4 shadow-lg text-center overflow-hidden">
                            <div className="p-4">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning mb-3" size="3x" />
                                <h5 className="fw-bold text-dark">¿Confirmar Acción?</h5>
                                <p className="text-muted small mb-0">¿Estás seguro de mover el servicio <strong className="text-dark">"{confirmModal.servicio?.nombre}"</strong> a la papelera?</p>
                            </div>
                            <div className="d-flex border-top">
                                <button className="btn btn-light w-50 rounded-0 border-end py-3 fw-bold text-muted shadow-none" onClick={() => setConfirmModal({ show: false, servicio: null })}>Cancelar</button>
                                <button className="btn btn-danger w-50 rounded-0 py-3 fw-bold shadow-none" onClick={confirmarMoverAPapelera}>Sí, mover</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* 2. NUEVO REDISEÑO DEL MODAL DE PAPELERA (Más limpio) */}
            {/* ============================================================ */}
            {showPapelera && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 2100, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
                            <div className="modal-header text-white px-4 py-3" style={{ backgroundColor: '#212529' }}>
                                <h5 className="modal-title fw-bold">
                                    <FontAwesomeIcon icon={faTrashRestore} className="me-2" /> Papelera de Servicios
                                </h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowPapelera(false)}></button>
                            </div>
                            <div className="modal-body p-0">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light text-uppercase fs-7 text-muted">
                                        <tr>
                                            <th className="ps-4 py-3">Servicio</th>
                                            <th>Categoría</th>
                                            <th>Precio</th>
                                            <th className="text-end pe-4">Restaurar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviciosEliminados.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center py-5 text-muted fw-bold"><FontAwesomeIcon icon={faInfoCircle} className="me-2"/>No hay servicios en la papelera.</td></tr>
                                        ) : (
                                            serviciosEliminados.map(s => (
                                                <tr key={s.id}>
                                                    <td className="ps-4 fw-bold text-dark">{s.nombre}</td>
                                                    <td><span className={`badge rounded-pill text-capitalize px-3 py-2 fs-8 ${s.categoria === 'veterinaria' ? 'bg-danger-subtle text-danger' : 'bg-info-subtle text-info'}`}>{s.categoria}</span></td>
                                                    <td className="text-success fw-bold fs-6">$ {Number(s.precio).toLocaleString()}</td>
                                                    <td className="text-end pe-4">
                                                        <button className="btn btn-success btn-sm rounded-pill fw-bold px-3 shadow-sm" title="Restaurar" onClick={() => restaurarServicio(s)}>
                                                            <FontAwesomeIcon icon={faTrashRestore} className="me-1" /> Restaurar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-footer border-0 p-3 bg-light d-flex justify-content-between align-items-center">
                                <small className="text-muted fs-8">Los servicios aquí no aparecen en la Caja.</small>
                                <button className="btn btn-dark px-4 rounded-pill fw-bold shadow" onClick={() => setShowPapelera(false)}>CERRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* 3. NUEVO MENSAJE DE ÉXITO SUAVE (TOAST) REEMPLAZA AL MODAL GIGANTE */}
            {/* ============================================================ */}
            {toast.show && (
                <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 3000 }}>
                    <div className={`toast show align-items-center text-white bg-${toast.type === 'error' ? 'danger' : (toast.type === 'restored' ? 'info' : 'success')} border-0 rounded-4 shadow-lg`} role="alert" aria-live="assertive" aria-atomic="true">
                        <div className="d-flex">
                            <div className="toast-body fw-bold d-flex align-items-center p-3 fs-7">
                                <FontAwesomeIcon icon={toast.type === 'error' ? faTimes : faCheckCircle} size="lg" className="me-2"/>
                                {toast.message}
                            </div>
                            <button type="button" className="btn-close btn-close-white me-2 m-auto shadow-none" onClick={() => setToast({...toast, show: false})} aria-label="Close"></button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS adicional insertado directamente para estilos rápidos */}
            <style>{`
                .fs-7 { font-size: 0.85rem; }
                .fs-8 { font-size: 0.75rem; }
                .bg-danger-subtle { background-color: #f8d7da !important; }
                .bg-info-subtle { background-color: #cff4fc !important; }
                .text-danger { color: #dc3545 !important; }
                .text-info { color: #0dcaf0 !important; }
                .toast { min-width: 250px; }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .toast.show { animation: slideIn 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default ConfiguracionPage;