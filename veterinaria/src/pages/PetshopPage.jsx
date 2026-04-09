import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingBag, faPlus, faEdit, faTrash, faSearch, faFilePdf, faFileExcel,
    faDollarSign, faBoxOpen, faInfoCircle, faUserEdit, faArrowLeft, faArrowRight,
    faUndo, faTimes, faDownload, faTrashAlt, faHistory, faTrashRestore,
    faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const PetshopPage = () => {
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [valorInput, setValorInput] = useState(''); 
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showDetalle, setShowDetalle] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [limite] = useState(12);
    const [loading, setLoading] = useState(false);

    // ESTADO PARA EL MODAL DE ÉXITO REDISEÑADO
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');

    // ESTADOS PARA PAPELERA
    const [showPapelera, setShowPapelera] = useState(false);
    const [productosEliminados, setProductosEliminados] = useState([]);
    const [busquedaPapelera, setBusquedaPapelera] = useState('');

    // ESTADOS PARA BORRADO PERMANENTE
    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);

    const lanzarExito = (mensaje) => {
        setMensajeExito(mensaje);
        setShowSuccessModal(true);
    };

    const cargarProductos = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (busqueda.trim() !== '') {
                res = await api.get(`/productos/buscar?q=${busqueda}&categoria=petshop`);
                const data = res.data.productos || res.data || [];
                setProductos(Array.isArray(data) ? data.filter(p => p.categoria === 'petshop') : []);
            } else {
                res = await api.get(`/productos/petshop?pagina=${pagina}&limite=${limite}`);
                const data = res.data.productos || res.data || [];
                setProductos(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("❌ Error al cargar productos:", err);
            setProductos([]);
        } finally {
            setLoading(false);
        }
    }, [pagina, busqueda, limite]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setBusqueda(valorInput);
            setPagina(1); 
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [valorInput]);

    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/productos/papelera/petshop');
            setProductosEliminados(res.data || []);
        } catch (err) {
            console.error("❌ Error al cargar papelera:", err);
        }
    };

    const restaurarProducto = async (id) => {
        try {
            await api.put(`/productos/restaurar/${id}`);
            lanzarExito("Producto restaurado correctamente");
            cargarPapelera();
            cargarProductos();
        } catch (err) {
            console.error("Error al restaurar:", err);
        }
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            await api.delete(`/productos/papelera/${idToPermanentDelete}`); 
            lanzarExito("Producto eliminado definitivamente");
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
            cargarPapelera();
        } catch (err) {
            console.error("Error al eliminar permanentemente:", err);
        }
    };

    const obtenerPapeleraFiltrada = () => {
        return productosEliminados.filter(p => 
            p.nombre.toLowerCase().includes(busquedaPapelera.toLowerCase())
        );
    };

    const descargarEtiqueta = (p) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 100] });
        doc.setFillColor(0, 123, 255);
        doc.rect(0, 0, 80, 25, 'F');
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("MALFI PETSHOP", 40, 12, { align: "center" });
        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.text(p.nombre, 40, 40, { align: "center" });
        doc.setFontSize(14);
        doc.text(`$${p.precio_venta}`, 40, 55, { align: "center" });
        doc.setFontSize(9);
        doc.text(`Stock: ${p.stock}`, 40, 68, { align: "center" });
        doc.setFontSize(8);
        doc.text("--------------------------------", 40, 80, { align: "center" });
        doc.text("Gracias por elegir Malfi", 40, 88, { align: "center" });
        doc.save(`Etiqueta_${p.nombre}.pdf`);
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(productos.map(p => ({
            Nombre: p.nombre,
            Precio: p.precio_venta,
            Stock: p.stock
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Petshop");
        XLSX.writeFile(wb, "Stock_Petshop_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Petshop - Malfi Veterinaria", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Nombre', 'Precio', 'Stock']],
            body: productos.map(p => [p.nombre, `$${p.precio_venta}`, p.stock])
        });
        doc.save("Stock_Petshop_Malfi.pdf");
    };

    const getStockBadge = (cantidad) => {
        if (cantidad <= 0) return 'bg-danger';
        if (cantidad <= 5) return 'bg-warning text-dark';
        return 'bg-success';
    };

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{
            backgroundImage: `url('https://i.pinimg.com/736x/32/9f/4c/329f4c10c8d03b5c2428340c952e5615.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faShoppingBag} className="me-2" /> Petshop
                    </h1>
                    
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm d-flex align-items-center gap-2 fw-bold text-white" onClick={exportarPDF}>
                            <FontAwesomeIcon icon={faFilePdf} /> PDF
                        </button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm d-flex align-items-center gap-2 fw-bold text-white" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} /> EXCEL
                        </button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm d-flex align-items-center gap-2 fw-bold text-white" onClick={() => { cargarPapelera(); setShowPapelera(true); }}>
                            <FontAwesomeIcon icon={faTrashAlt} /> Papelera
                        </button>
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
                                placeholder="Buscar productos..."
                                value={valorInput}
                                onChange={(e) => setValorInput(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-white py-5"><div className="spinner-border text-light"></div></div>
                ) : (
                    <>
                        <div className="row g-4">
                            {productos.map(p => (
                                <div className="col-md-4 col-lg-3" key={p.id}>
                                    <div
                                        className="card border-0 shadow-sm p-3 rounded-4 h-100 transition-card"
                                        style={{ cursor: 'pointer', background: 'rgba(211, 211, 211, 0.85)', backdropFilter: 'blur(5px)' }}
                                        onClick={() => { setItemSeleccionado(p); setShowDetalle(true); }}
                                    >
                                        <h5 className="fw-bold mb-1 text-dark">{p.nombre}</h5>
                                        <p className="text-success fw-bold mb-2">${p.precio_venta}</p>
                                        <div className="d-flex justify-content-between align-items-center mt-auto">
                                            <span className={`badge ${getStockBadge(p.stock)} px-3 py-2 rounded-pill shadow-sm`}>
                                                {p.stock <= 0 ? 'AGOTADO' : `Stock: ${p.stock}`}
                                            </span>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-sm btn-outline-info rounded-circle shadow-sm bg-white" onClick={(e) => { e.stopPropagation(); descargarEtiqueta(p); }}><FontAwesomeIcon icon={faDownload} /></button>
                                                <button className="btn btn-sm btn-outline-primary rounded-circle shadow-sm bg-white" onClick={(e) => { e.stopPropagation(); setDatosEdicion(p); setShowModal(true); }}><FontAwesomeIcon icon={faEdit} /></button>
                                                <button className="btn btn-sm btn-outline-danger rounded-circle shadow-sm bg-white" onClick={(e) => { e.stopPropagation(); setIdToDelete(p.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {busqueda.trim() === '' && (
                            <div className="d-flex justify-content-center align-items-center gap-3 mt-5 pb-4">
                                <button className="btn btn-light rounded-circle shadow-sm" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}><FontAwesomeIcon icon={faArrowLeft} /></button>
                                <span className="badge bg-white text-dark px-3 py-2 rounded-pill shadow-sm fw-bold">Página {pagina}</span>
                                <button className="btn btn-light rounded-circle shadow-sm" onClick={() => setPagina(pagina + 1)}><FontAwesomeIcon icon={faArrowRight} /></button>
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
                                <FontAwesomeIcon icon={faHistory} /> PAPELERA DE PETSHOP
                            </div>
                            <div className="p-4 bg-white">
                                <div className="mb-4 d-flex justify-content-center">
                                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-light border w-50">
                                        <span className="input-group-text bg-transparent border-0 ps-3 text-muted"><FontAwesomeIcon icon={faSearch} /></span>
                                        <input type="text" className="form-control border-0 py-2 bg-light" placeholder="Buscar en papelera..." value={busquedaPapelera} onChange={(e) => setBusquedaPapelera(e.target.value)} />
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="table align-middle table-hover text-dark">
                                        <thead className="bg-light sticky-top">
                                            <tr>
                                                <th>Nombre</th><th>Precio</th><th className="text-center">Borrado por</th><th>Fecha</th><th className="text-center">Restaurar</th><th className="text-center">Eliminar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {obtenerPapeleraFiltrada().length > 0 ? (
                                                obtenerPapeleraFiltrada().map(p => (
                                                    <tr key={p.id}>
                                                        <td><div className="fw-bold">{p.nombre}</div><small className="text-muted">Stock: {p.stock}</small></td>
                                                        <td className="text-success fw-bold">${p.precio_venta}</td>
                                                        <td className="text-center"><span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '8px' }}>{p.responsable_borrado || 'Luciana'}</span></td>
                                                        <td className="small">{new Date(p.fecha_borrado).toLocaleString('es-AR')}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-success btn-sm rounded-circle p-2 shadow-sm" onClick={() => restaurarProducto(p.id)}><FontAwesomeIcon icon={faTrashRestore} /></button>
                                                        </td>
                                                        <td className="text-center">
                                                            <button className="btn btn-danger btn-sm rounded-circle p-2 shadow-sm" onClick={() => { setIdToPermanentDelete(p.id); setShowConfirmPermanent(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr><td colSpan="6" className="text-center py-5 text-muted fw-bold">La papelera está vacía</td></tr>
                                            )}
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

            {/* MODAL ELIMINAR PERMANENTE */}
            <ConfirmModal 
                show={showConfirmPermanent} 
                onClose={() => setShowConfirmPermanent(false)} 
                onConfirm={handleConfirmarEliminarPermanente} 
                title="¿Eliminar permanentemente?" 
                message="Esta acción no se puede deshacer. El producto se borrará por completo de la base de datos." 
                confirmText="Sí, eliminar para siempre" confirmColor="danger" 
            />

            {/* MODAL MOVER A PAPELERA */}
            <ConfirmModal
                show={showConfirm} onClose={() => setShowConfirm(false)}
                onConfirm={async () => {
                    await api.delete(`/productos/${idToDelete}`);
                    setShowConfirm(false); cargarProductos();
                    lanzarExito("Producto enviado a la papelera");
                }}
                title="¿Mover a la papelera?" message="Podrás restaurarlo más tarde desde la papelera."
            />

            {/* MODAL DETALLE */}
            {showDetalle && itemSeleccionado && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4 text-dark">
                            <h4 className="fw-bold mb-4 text-primary"><FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Detalle del Producto</h4>
                            <div className="text-center mb-4">
                                <div className="bg-light rounded-pill d-inline-flex p-4 shadow-sm mb-3"><FontAwesomeIcon icon={faShoppingBag} size="4x" className="text-primary" /></div>
                                <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
                            </div>
                            <ul className="list-group rounded-4 overflow-hidden border">
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faDollarSign} className="text-success" /><strong>Precio Venta:</strong> ${itemSeleccionado.precio_venta}</li>
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faBoxOpen} className="text-primary" /><strong>Stock Actual:</strong> {itemSeleccionado.stock} unidades</li>
                                <li className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faUserEdit} className="text-info" /><strong>Última edición:</strong> {itemSeleccionado.nombre_editor || 'Sistema'}</li>
                            </ul>
                            <button className="btn btn-primary w-100 rounded-pill mt-4 fw-bold shadow-sm" onClick={() => setShowDetalle(false)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            <ProductoModal
                show={showModal} onClose={() => setShowModal(false)}
                onGuardar={async form => {
                    await api({ method: datosEdicion ? 'PUT' : 'POST', url: datosEdicion ? `/productos/${datosEdicion.id}` : '/productos', data: { ...form, categoria: 'petshop' } });
                    setShowModal(false); cargarProductos();
                    lanzarExito("Producto guardado correctamente");
                }}
                datosEdicion={datosEdicion} categoria="petshop"
            />
        </div>
    );
};

export default PetshopPage;