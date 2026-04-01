import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTools, faSave, faEdit, faCheckCircle, faStethoscope, 
    faScissors, faArrowLeft, faChevronLeft, faChevronRight,
    faTrash, faTrashRestore, faTimes
} from '@fortawesome/free-solid-svg-icons';
import api from '../services/api';

const ConfiguracionPage = () => {
    const [servicios, setServicios] = useState([]);
    const [serviciosEliminados, setServiciosEliminados] = useState([]);
    const [editando, setEditando] = useState(null);
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showPapelera, setShowPapelera] = useState(false);

    // --- ESTADOS PARA PAGINACIÓN ---
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 10;

    useEffect(() => { 
        fetchServicios(); 
    }, []);

    const fetchServicios = async () => {
        try {
            // Usamos la instancia de 'api' que ya maneja la URL base y el token
            const res = await api.get('/servicios');
            
            // Separamos activos de inactivos
            const activos = res.data.filter(s => s.activo === 1 || s.activo === true);
            const eliminados = res.data.filter(s => s.activo === 0 || s.activo === false);
            
            setServicios(activos);
            setServiciosEliminados(eliminados);
        } catch (err) {
            console.error("Error al cargar servicios:", err);
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
            alert("Ingrese un precio válido");
            return;
        }
        try {
            await api.put(`/servicios/${s.id}`, { 
                precio: parseFloat(nuevoPrecio), 
                nombre: s.nombre 
            });
            setEditando(null);
            await fetchServicios(); // Recargamos todo
            setShowSuccess(true);
        } catch (err) { 
            alert("Error al actualizar el precio"); 
        }
    };

    // FUNCIÓN CORREGIDA: Mover a papelera
    const moverAPapelera = async (id) => {
        if (!window.confirm("¿Mover este servicio a la papelera?")) return;
        try {
            // Enviamos activo: 0 al backend
            await api.put(`/servicios/${id}`, { activo: 0 });
            
            // Forzamos la recarga de las dos listas
            await fetchServicios(); 
            
            setPaginaActual(1); // Volvemos a la página 1 por si se vacía la actual
        } catch (err) {
            console.error(err);
            alert("Error al mover a papelera. Revisa la consola.");
        }
    };

    // FUNCIÓN CORREGIDA: Restaurar
    const restaurarServicio = async (id) => {
        try {
            await api.put(`/servicios/${id}`, { activo: 1 });
            await fetchServicios(); // Recargamos
            alert("Servicio restaurado correctamente");
        } catch (err) {
            alert("Error al restaurar");
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

                    <button className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowPapelera(true)}>
                        <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera ({serviciosEliminados.length})
                    </button>
                </div>

                <h2 className="fw-bold mb-4 text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                    <FontAwesomeIcon icon={faTools} className="me-3" />
                    Configuración de Precios
                </h2>

                <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4 py-3">Servicio</th>
                                    <th>Categoría</th>
                                    <th>Precio Actual</th>
                                    <th className="text-end pe-4">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviciosPaginados.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-4 text-muted">No hay servicios activos</td></tr>
                                ) : (
                                    serviciosPaginados.map(s => (
                                        <tr key={s.id} className="align-middle">
                                            <td className="ps-4 fw-bold">
                                                <FontAwesomeIcon icon={s.categoria === 'veterinaria' ? faStethoscope : faScissors} className={`me-2 ${s.categoria === 'veterinaria' ? 'text-danger' : 'text-info'}`} />
                                                {s.nombre}
                                            </td>
                                            <td><span className={`badge rounded-pill text-capitalize px-3 py-2 ${s.categoria === 'veterinaria' ? 'bg-danger-subtle text-danger' : 'bg-info-subtle text-info'}`}>{s.categoria}</span></td>
                                            <td>
                                                {editando === s.id ? (
                                                    <div className="input-group input-group-sm" style={{width: '150px'}}>
                                                        <span className="input-group-text bg-white border-end-0">$</span>
                                                        <input type="number" className="form-control border-start-0 shadow-none" value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} />
                                                    </div>
                                                ) : <span className="fw-bold text-success fs-5">$ {Number(s.precio).toLocaleString('es-AR')}</span>}
                                            </td>
                                            <td className="text-end pe-4">
                                                {editando === s.id ? (
                                                    <div className="d-flex gap-2 justify-content-end">
                                                        <button className="btn btn-success btn-sm rounded-pill px-3 fw-bold" onClick={() => handleGuardar(s)}><FontAwesomeIcon icon={faSave} className="me-1"/> Guardar</button>
                                                        <button className="btn btn-light btn-sm rounded-pill px-3 border" onClick={() => setEditando(null)}>Cancelar</button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex gap-2 justify-content-end align-items-center">
                                                        <button className="btn btn-outline-primary btn-sm rounded-pill px-4 fw-bold" onClick={() => { setEditando(s.id); setNuevoPrecio(s.precio); }}>
                                                            <FontAwesomeIcon icon={faEdit} className="me-1"/> Editar
                                                        </button>
                                                        <button className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{width:'32px', height:'32px'}} onClick={() => moverAPapelera(s.id)}>
                                                            <FontAwesomeIcon icon={faTrash} size="xs" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-3 bg-light border-top">
                        <div className="small text-muted fw-bold">Página {paginaActual} de {totalPaginas || 1}</div>
                        <div className="btn-group shadow-sm">
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === 1} onClick={() => cambiarPagina(paginaActual - 1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === totalPaginas || totalPaginas === 0} onClick={() => cambiarPagina(paginaActual + 1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL PAPELERA (Diseño corregido) */}
            {showPapelera && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 2100 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
                            <div className="modal-header text-white px-4 py-3" style={{ backgroundColor: '#dc3545' }}>
                                <h5 className="modal-title fw-bold">
                                    <FontAwesomeIcon icon={faTrashRestore} className="me-2" /> Papelera de Servicios
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPapelera(false)}></button>
                            </div>
                            <div className="modal-body p-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
                                <table className="table align-middle">
                                    <thead>
                                        <tr className="text-muted small text-uppercase">
                                            <th>Servicio</th>
                                            <th>Precio</th>
                                            <th className="text-end pe-3">Restaurar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {serviciosEliminados.length === 0 ? (
                                            <tr><td colSpan="3" className="text-center py-4 text-muted fw-bold">No hay servicios borrados</td></tr>
                                        ) : (
                                            serviciosEliminados.map(s => (
                                                <tr key={s.id}>
                                                    <td className="fw-bold">{s.nombre}</td>
                                                    <td className="text-success fw-bold">$ {Number(s.precio).toLocaleString()}</td>
                                                    <td className="text-end">
                                                        <button className="btn btn-success rounded-circle shadow-sm" title="Restaurar" onClick={() => restaurarServicio(s.id)} style={{width:'35px', height:'35px'}}>
                                                            <FontAwesomeIcon icon={faTrashRestore} size="sm" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="modal-footer border-0 p-3">
                                <button className="btn btn-dark px-4 rounded-pill fw-bold shadow" onClick={() => setShowPapelera(false)}>CERRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ÉXITO */}
            {showSuccess && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-5 text-center">
                            <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
                            <h3 className="fw-bold">¡Precio Actualizado!</h3>
                            <button className="btn btn-success rounded-pill px-5 py-2 mt-3 fw-bold shadow" onClick={() => setShowSuccess(false)}>ACEPTAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConfiguracionPage;