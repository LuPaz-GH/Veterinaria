import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPills, faPlus, faEdit, faTrash, faSearch, faFilePdf, faFileExcel,
    faInfoCircle, faMedkit, faDollarSign, faBox, faArrowLeft, faArrowRight,
    faTrashAlt, faHistory, faTrashRestore, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const MedicamentosPage = () => {
    const [medicamentos, setMedicamentos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const limite = 12;
    const [loading, setLoading] = useState(false);

    // ESTADO PARA EL MODAL DE ÉXITO REDISEÑADO
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');

    // ESTADOS PARA PAPELERA
    const [showPapelera, setShowPapelera] = useState(false);
    const [medicamentosEliminados, setMedicamentosEliminados] = useState([]);
    const [busquedaPapelera, setBusquedaPapelera] = useState('');

    // ESTADOS PARA BORRADO PERMANENTE
    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);

    const lanzarExito = (mensaje) => {
        setMensajeExito(mensaje);
        setShowSuccessModal(true);
    };

    // FUNCIÓN DE CARGA Y BÚSQUEDA COMBINADA
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (busqueda.trim() !== '') {
                res = await api.get(`/productos/buscar?q=${busqueda}&categoria=medicamentos`);
                const data = res.data.productos || res.data || [];
                setMedicamentos(Array.isArray(data) ? data.filter(p => p.categoria === 'medicamentos') : []);
                setTotalPaginas(1);
            } else {
                res = await api.get(`/productos/medicamentos?pagina=${pagina}&limite=${limite}`);
                const data = res.data.productos || res.data || [];
                setMedicamentos(Array.isArray(data) ? data : []);
                setTotalPaginas(res.data.totalPaginas || 1);
            }
        } catch (err) {
            console.error("❌ Error al cargar:", err);
            setMedicamentos([]);
        } finally {
            setLoading(false);
        }
    }, [pagina, busqueda, limite]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            cargar();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [cargar]);

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/productos/papelera/medicamentos');
            setMedicamentosEliminados(res.data || []);
        } catch (err) {
            console.error("❌ Error al cargar papelera:", err);
        }
    };

    const restaurarMedicamento = async (id) => {
        try {
            await api.put(`/productos/restaurar/${id}`);
            lanzarExito("Medicamento restaurado correctamente");
            cargarPapelera();
            cargar();
        } catch (err) {
            console.error("❌ Error al restaurar:", err);
        }
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            await api.delete(`/productos/papelera/${idToPermanentDelete}`); 
            lanzarExito("Medicamento eliminado definitivamente");
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
            cargarPapelera();
        } catch (err) {
            console.error("Error al eliminar permanentemente:", err);
        }
    };

    const obtenerPapeleraFiltrada = () => {
        return medicamentosEliminados.filter(m => 
            (m.nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase())
        );
    };

    const getVencimientoInfo = (fechaVenc) => {
        if (!fechaVenc) return { estado: 'sin_fecha', texto: 'Sin fecha', clase: 'bg-secondary' };
        const hoy = new Date();
        const venc = new Date(fechaVenc);
        const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
        if (diasRestantes < 0) return { estado: 'vencido', texto: 'VENCIDO', clase: 'bg-danger text-white' };
        if (diasRestantes <= 30) return { estado: 'proximo', texto: `Próximo (${diasRestantes} d)`, clase: 'bg-warning text-dark' };
        return { estado: 'ok', texto: `OK (${diasRestantes} d)`, clase: 'bg-success text-white' };
    };

    const getStockBadgeClass = (cantidad) => {
        if (cantidad <= 0) return 'bg-danger';
        if (cantidad <= 5) return 'bg-warning text-dark';
        return 'bg-primary';
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(medicamentos.map(m => ({
            Nombre: m.nombre,
            Precio: m.precio_venta,
            Stock: m.stock,
            Vencimiento: m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Medicamentos");
        XLSX.writeFile(wb, "Stock_Medicamentos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Farmacia - Malfi Veterinaria", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Nombre', 'Precio', 'Stock', 'Vencimiento']],
            body: medicamentos.map(m => [
                m.nombre,
                `$${m.precio_venta}`,
                m.stock,
                m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A'
            ])
        });
        doc.save("Stock_Medicamentos_Malfi.pdf");
    };

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{
            backgroundImage: `url('https://i.pinimg.com/736x/17/82/7f/17827f1bb88cd66e62c0c1d17f16d184.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faPills} className="me-2" /> Farmacia
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-4 shadow-lg text-white fw-bold" onClick={() => { cargarPapelera(); setShowPapelera(true); }} style={{ backgroundColor: '#D82F43', border: '2px solid rgba(255,255,255,0.4)' }}>
                            <FontAwesomeIcon icon={faTrashAlt} className="me-2" /> Papelera
                        </button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-light rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>
                            + Nuevo
                        </button>
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
                                placeholder="Buscar en toda la farmacia..."
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-white py-5"><div className="spinner-border text-light"></div></div>
                ) : (
                    <>
                        <div className="row g-4">
                            {medicamentos.length > 0 ? (
                                medicamentos.map(m => {
                                    const vencInfo = getVencimientoInfo(m.vencimiento_med);
                                    return (
                                        <div className="col-md-4 col-lg-3" key={m.id}>
                                            <div className="card border-0 shadow-sm p-3 rounded-4 h-100 border-start border-4 border-primary"
                                                style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                    <h6 className="fw-bold text-dark">{m.nombre}</h6>
                                                    <span className={`badge ${vencInfo.clase} small`}>{vencInfo.texto}</span>
                                                </div>
                                                <p className="text-primary fw-bold mb-1">${m.precio_venta}</p>
                                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                                    <span className={`badge ${getStockBadgeClass(m.stock)} px-3 py-2 rounded-pill`}>
                                                        Stock: {m.stock}
                                                    </span>
                                                    <div className="d-flex gap-1">
                                                        <button className="btn btn-sm btn-outline-primary rounded-circle bg-white" onClick={() => { setDatosEdicion(m); setShowModal(true); }}>
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-danger rounded-circle bg-white" onClick={() => { setIdToDelete(m.id); setShowConfirm(true); }}>
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-12 text-center text-white py-5">
                                    <h3>No se encontraron resultados</h3>
                                </div>
                            )}
                        </div>

                        {busqueda.trim() === '' && (
                            <div className="d-flex justify-content-center align-items-center gap-3 mt-5 pb-4">
                                <button className="btn btn-light rounded-circle shadow-sm" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                </button>
                                <span className="badge bg-white text-dark px-3 py-2 rounded-pill shadow-sm fw-bold">
                                    Página {pagina}
                                </span>
                                <button className="btn btn-light rounded-circle shadow-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}>
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* MODAL PAPELERA REDISEÑADO CON BUSCADOR */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div className="p-4 text-center text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: '#D82F43', fontSize: '1.4rem' }}>
                                <FontAwesomeIcon icon={faHistory} /> PAPELERA DE MEDICAMENTOS
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
                                                obtenerPapeleraFiltrada().map(med => (
                                                    <tr key={med.id}>
                                                        <td><div className="fw-bold">{med.nombre}</div><small className="text-muted">Stock: {med.stock}</small></td>
                                                        <td className="text-success fw-bold">${med.precio_venta}</td>
                                                        <td className="text-center"><span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '8px' }}>{med.responsable_borrado || 'Luciana'}</span></td>
                                                        <td className="small">{new Date(med.fecha_borrado).toLocaleString('es-AR')}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-success btn-sm rounded-circle p-2 shadow-sm" onClick={() => restaurarMedicamento(med.id)}><FontAwesomeIcon icon={faTrashRestore} /></button>
                                                        </td>
                                                        <td className="text-center">
                                                            <button className="btn btn-danger btn-sm rounded-circle p-2 shadow-sm" onClick={() => { setIdToPermanentDelete(med.id); setShowConfirmPermanent(true); }}><FontAwesomeIcon icon={faTrash} /></button>
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

            {/* MODAL DE ÉXITO ESTÉTICO CORREGIDO */}
            {showSuccessModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 4000 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div className="modal-content border-0 rounded-5 text-center p-5 position-relative shadow-lg" style={{ overflow: 'visible', marginTop: '40px' }}>
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
                message="Esta acción no se puede deshacer. El medicamento se borrará por completo de la base de datos." 
                confirmText="Sí, eliminar para siempre" confirmColor="danger" 
            />

            <ConfirmModal
                show={showConfirm} onClose={() => setShowConfirm(false)}
                onConfirm={async () => {
                    await api.delete(`/productos/${idToDelete}`);
                    setShowConfirm(false); 
                    cargar();
                    lanzarExito("Medicamento enviado a la papelera");
                }}
                title="¿Mover a la papelera?" message="Podrás restaurarlo más tarde desde la papelera."
            />

            <ProductoModal
                show={showModal} onClose={() => setShowModal(false)}
                onGuardar={async (form) => {
                    const url = datosEdicion ? `/productos/${datosEdicion.id}` : '/productos';
                    const metodo = datosEdicion ? 'put' : 'post';
                    await api[metodo](url, { ...form, categoria: 'medicamentos' });
                    setShowModal(false);
                    cargar();
                    lanzarExito("Medicamento guardado correctamente");
                }}
                datosEdicion={datosEdicion}
                categoria="medicamentos"
            />
        </div>
    );
};

export default MedicamentosPage;