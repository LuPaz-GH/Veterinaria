import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faBowlFood, faPlus, faEdit, faTrash, faSearch, faFilePdf, 
    faFileExcel, faInfoCircle, faDollarSign, faBox, faUserEdit, 
    faArrowLeft, faArrowRight, faTrashAlt, faHistory, faTrashRestore,
    faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const AlimentosPage = () => {
    const [alimentos, setAlimentos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showDetalle, setShowDetalle] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalProductos, setTotalProductos] = useState(0);
    const limite = 12;
    const [loading, setLoading] = useState(false);

    // ESTADOS DE FILTRO
    const [filtroFecha, setFiltroFecha] = useState('todo'); 
    const [fechaPersonalizada, setFechaPersonalizada] = useState('');

    // ESTADO PARA EL MODAL DE ÉXITO REDISEÑADO
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');

    // ESTADOS PARA PAPELERA
    const [showPapelera, setShowPapelera] = useState(false);
    const [alimentosEliminados, setAlimentosEliminados] = useState([]);
    const [busquedaPapelera, setBusquedaPapelera] = useState('');

    // ESTADOS PARA BORRADO PERMANENTE
    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);

    const lanzarExito = (mensaje) => {
        setMensajeExito(mensaje);
        setShowSuccessModal(true);
    };

    const cargarAlimentos = useCallback(async () => {
        setLoading(true);
        try {
            let query = `?pagina=${pagina}&limite=${limite}`;
            let res;

            if (busqueda.trim() !== '') {
                res = await api.get(`/productos/buscar?q=${busqueda}&categoria=alimentos`);
                const data = res.data.productos || res.data || [];
                setAlimentos(Array.isArray(data) ? data.filter(p => p.categoria === 'alimentos') : []);
                setTotalPaginas(1);
            } else {
                if (filtroFecha === 'personalizado' && fechaPersonalizada) {
                    query += `&fecha=${fechaPersonalizada}`;
                }
                res = await api.get(`/productos/alimentos${query}`);
                const data = res.data.productos || res.data || [];
                setAlimentos(Array.isArray(data) ? data : []);
                setTotalPaginas(res.data.totalPaginas || 1);
                setTotalProductos(res.data.total || 0);
            }
        } catch (err) {
            console.error('❌ Error al cargar alimentos:', err);
            setAlimentos([]);
        } finally {
            setLoading(false);
        }
    }, [pagina, busqueda, limite, filtroFecha, fechaPersonalizada]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            cargarAlimentos();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [cargarAlimentos]);

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/productos/papelera/alimentos');
            setAlimentosEliminados(res.data || []);
        } catch (err) {
            console.error('❌ Error al cargar papelera:', err);
        }
    };

    const restaurarAlimento = async (id) => {
        try {
            await api.put(`/productos/restaurar/${id}`);
            lanzarExito("Alimento restaurado correctamente");
            cargarPapelera();
            cargarAlimentos();
        } catch (err) {
            console.error('❌ Error al restaurar:', err);
        }
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            await api.delete(`/productos/papelera/${idToPermanentDelete}`);
            lanzarExito("Alimento eliminado para siempre");
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
            cargarPapelera();
        } catch (err) {
            console.error("❌ Error al eliminar:", err);
        }
    };

    const obtenerPapeleraFiltrada = () => {
        return alimentosEliminados.filter(a => 
            (a.nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase())
        );
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(alimentos.map(a => ({
            Nombre: a.nombre,
            Precio: a.precio_venta,
            Stock: a.stock,
            Vencimiento: a.vencimiento_alimento ? new Date(a.vencimiento_alimento).toLocaleDateString() : 'N/A'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alimentos");
        XLSX.writeFile(wb, "Stock_Alimentos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Inventario de Alimentos - Malfi", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Nombre', 'Precio', 'Stock', 'Vencimiento']],
            body: alimentos.map(a => [
                a.nombre,
                `$${a.precio_venta}`,
                a.stock,
                a.vencimiento_alimento ? new Date(a.vencimiento_alimento).toLocaleDateString() : 'N/A'
            ]),
            headStyles: { fillColor: [40, 167, 69] }
        });
        doc.save("Stock_Alimentos_Malfi.pdf");
    };

    const verificarVencimiento = (fecha) => {
        if (!fecha) return { texto: '', clase: '', vencido: false };
        const hoy = new Date();
        const fVenc = new Date(fecha);
        if (fVenc < hoy) return { texto: 'VENCIDO', clase: 'bg-danger text-white', vencido: true };
        if ((fVenc - hoy) / (1000 * 60 * 60 * 24) <= 30) return { texto: 'VENCE PRONTO', clase: 'bg-warning text-dark', vencido: false };
        return { texto: '', clase: '', vencido: false };
    };

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{
            backgroundImage: `url('https://i.pinimg.com/736x/48/93/4a/48934a256d6b89731eb45e6808a6a4a5.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faBowlFood} className="me-2" /> Alimentos
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-4 shadow-lg text-white fw-bold" onClick={() => { cargarPapelera(); setShowPapelera(true); }} style={{ backgroundColor: '#D82F43', border: '2px solid rgba(255,255,255,0.4)' }}>
                            <FontAwesomeIcon icon={faTrashAlt} className="me-2" /> Papelera
                        </button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-light rounded-pill px-3 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>+ Nuevo</button>
                    </div>
                </div>

                <div className="row justify-content-center mb-5">
                    <div className="col-md-6 col-lg-5">
                        <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                            <span className="input-group-text bg-white border-0 ps-3">
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-0 py-2 ps-1"
                                placeholder="Buscar alimento..."
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-white py-5"><div className="spinner-border text-light"></div></div>
                ) : alimentos.length === 0 ? (
                    <div className="text-center text-white py-5"><h3>No se encontraron alimentos</h3></div>
                ) : (
                    <div className="row g-4">
                        {alimentos.map(a => {
                            const infoVenc = verificarVencimiento(a.vencimiento_alimento);
                            return (
                                <div className="col-md-4 col-lg-3" key={a.id}>
                                    <div className={`card border-0 shadow-sm p-3 rounded-4 h-100 transition-card ${infoVenc.vencido ? 'opacity-75' : ''}`}
                                         style={{ cursor: 'pointer', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}
                                         onClick={() => { setItemSeleccionado(a); setShowDetalle(true); }}>
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <h6 className="fw-bold text-dark">{a.nombre}</h6>
                                            {infoVenc.texto && <span className={`badge ${infoVenc.clase} x-small`}>{infoVenc.texto}</span>}
                                        </div>
                                        <p className="text-success fw-bold mb-1">${a.precio_venta}</p>
                                        <div className="d-flex justify-content-between align-items-center mt-auto">
                                            <span className={`badge ${a.stock <= 5 ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill`}>Stock: {a.stock}</span>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-sm btn-outline-primary rounded-circle bg-white" onClick={e => { e.stopPropagation(); setDatosEdicion(a); setShowModal(true); }}><FontAwesomeIcon icon={faEdit} /></button>
                                                <button className="btn btn-sm btn-outline-danger rounded-circle bg-white" onClick={e => { e.stopPropagation(); setIdToDelete(a.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {busqueda.trim() === '' && (
                    <div className="d-flex justify-content-center align-items-center gap-3 mt-5 pb-4">
                        <button className="btn btn-light rounded-circle shadow-sm" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}><FontAwesomeIcon icon={faArrowLeft} /></button>
                        <span className="badge bg-white text-dark px-3 py-2 rounded-pill shadow-sm fw-bold">Página {pagina}</span>
                        <button className="btn btn-light rounded-circle shadow-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}><FontAwesomeIcon icon={faArrowRight} /></button>
                    </div>
                )}
            </div>

            {/* MODAL PAPELERA */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div className="p-4 text-center text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: '#D82F43', fontSize: '1.4rem' }}>
                                <FontAwesomeIcon icon={faHistory} /> PAPELERA DE ALIMENTOS
                            </div>
                            <div className="p-4 bg-white">
                                <div className="mb-4 d-flex justify-content-center">
                                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-light border w-50">
                                        <span className="input-group-text bg-transparent border-0 ps-3 text-muted"><FontAwesomeIcon icon={faSearch} /></span>
                                        <input type="text" className="form-control border-0 py-2 bg-light" placeholder="Buscar en papelera..." value={busquedaPapelera} onChange={(e) => setBusquedaPapelera(e.target.value)} />
                                    </div>
                                </div>
                                <div className="table-responsive" style={{ maxHeight: '450px' }}>
                                    <table className="table table-hover align-middle mb-0 text-dark">
                                        <thead className="bg-light sticky-top">
                                            <tr>
                                                <th>Nombre</th><th>Precio</th><th className="text-center">Borrado por</th><th>Fecha</th><th className="text-center">Restaurar</th><th className="text-center">Eliminar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {obtenerPapeleraFiltrada().length > 0 ? (
                                                obtenerPapeleraFiltrada().map(ali => (
                                                    <tr key={ali.id}>
                                                        <td><div className="fw-bold">{ali.nombre}</div><small className="text-muted">Stock: {ali.stock}</small></td>
                                                        <td className="text-success fw-bold">${ali.precio_venta}</td>
                                                        <td className="text-center"><span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '8px' }}>{ali.responsable_borrado || 'Luciana'}</span></td>
                                                        <td className="small">{new Date(ali.fecha_borrado).toLocaleString('es-AR')}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-success btn-sm rounded-circle p-2 shadow-sm" onClick={() => restaurarAlimento(ali.id)}><FontAwesomeIcon icon={faTrashRestore} /></button>
                                                        </td>
                                                        <td className="text-center">
                                                            <button className="btn btn-danger btn-sm rounded-circle p-2 shadow-sm" onClick={() => { setIdToPermanentDelete(ali.id); setShowConfirmPermanent(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (<tr><td colSpan="6" className="text-center py-5 text-muted fw-bold">La papelera está vacía</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-center mt-4">
                                    <button className="btn text-white px-5 py-2 fw-bold shadow" style={{ backgroundColor: '#2C3E50', borderRadius: '25px' }} onClick={() => { setShowPapelera(false); setBusquedaPapelera(''); }}>CERRAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* === MODAL DE ÉXITO ESTÉTICO CORREGIDO === */}
            {showSuccessModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 4000 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        {/* IMPORTANTE: Quitamos overflow hidden y agregamos margin top para que el círculo respire */}
                        <div className="modal-content border-0 rounded-5 text-center p-5 position-relative shadow-lg" style={{ overflow: 'visible', marginTop: '40px' }}>
                            {/* Círculo con el check - Mejorada la posición y tamaño */}
                            <div className="position-absolute start-50 translate-middle bg-white rounded-circle shadow d-flex align-items-center justify-content-center" 
                                 style={{ top: '0', width: '100px', height: '100px' }}>
                                <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '80px', color: '#2ecc71' }} />
                            </div>
                            <div className="mt-4 pt-2">
                                <h2 className="fw-bold mb-3 text-dark">¡Éxito!</h2>
                                <p className="text-muted fs-5 mb-4">{mensajeExito}</p>
                                <button className="btn w-100 rounded-pill py-3 fw-bold text-white shadow-sm" 
                                        style={{ backgroundColor: '#2C3E50' }} 
                                        onClick={() => setShowSuccessModal(false)}>
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES DE CONFIRMACIÓN */}
            <ConfirmModal 
                show={showConfirmPermanent} 
                onClose={() => setShowConfirmPermanent(false)} 
                onConfirm={handleConfirmarEliminarPermanente} 
                title="¿Eliminar permanentemente?" 
                message="Esta acción no se puede deshacer. El alimento se borrará por completo de la base de datos." 
                confirmText="Sí, eliminar para siempre" confirmColor="danger" 
            />

            <ConfirmModal
                show={showConfirm} onClose={() => setShowConfirm(false)}
                onConfirm={async () => {
                    await api.delete(`/productos/${idToDelete}`);
                    setShowConfirm(false); cargarAlimentos();
                    lanzarExito("Alimento enviado a la papelera");
                }}
                title="¿Mover a la papelera?" message="Podrás restaurarlo más tarde desde la papelera."
            />

            {/* MODAL DETALLE */}
            {showDetalle && itemSeleccionado && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4 text-dark">
                            <h4 className="fw-bold mb-4 text-success"><FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Detalle de Alimento</h4>
                            <div className="text-center mb-4">
                                <div className="bg-light rounded-pill d-inline-flex p-4 shadow-sm mb-3"><FontAwesomeIcon icon={faBowlFood} size="4x" className="text-success" /></div>
                                <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
                            </div>
                            <ul className="list-group rounded-4 overflow-hidden border">
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faDollarSign} className="text-success" /><strong>Precio:</strong> ${itemSeleccionado.precio_venta}</li>
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faBox} className="text-primary" /><strong>Stock Actual:</strong> {itemSeleccionado.stock} unidades</li>
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faUserEdit} className="text-info" /><strong>Última edición:</strong> {itemSeleccionado.nombre_editor || 'Sistema'}</li>
                            </ul>
                            <button className="btn btn-success w-100 rounded-pill mt-4 fw-bold shadow-sm" onClick={() => setShowDetalle(false)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            <ProductoModal
                show={showModal} onClose={() => setShowModal(false)}
                onGuardar={async form => {
                    await api({ method: datosEdicion ? 'PUT' : 'POST', url: datosEdicion ? `/productos/${datosEdicion.id}` : '/productos', data: { ...form, categoria: 'alimentos' } });
                    setShowModal(false); cargarAlimentos();
                    lanzarExito("Alimento guardado correctamente");
                }}
                datosEdicion={datosEdicion} categoria="alimentos"
            />
        </div>
    );
};

export default AlimentosPage;