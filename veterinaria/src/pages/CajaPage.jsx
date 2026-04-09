import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCashRegister, faPlus, faSearch, faStethoscope, faScissors, 
    faHandHoldingUsd, faBoxOpen, faChevronDown, faBowlFood, 
    faPills, faShoppingBag, faTags, faTrash, faCartPlus, faBan, 
    faPlusCircle, faMinusCircle, faExclamationCircle, faMicroscope, 
    faSyringe, faUserMd, faFileInvoiceDollar, faStar, faCalendarDay,
    faMoneyBillWave, faCreditCard, faExchangeAlt, faTimes, faArrowLeft, 
    faInfoCircle, faEdit, faFileExcel, faFilePdf, faCheckCircle, faPrint, faSignature, faPaw,
    faTools, faChevronLeft, faChevronRight, faTrashRestore,
    faHistory
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../services/api';
import ConfirmModal from '../component/ConfirmModal';

const CajaPage = ({ user }) => {
    const [ventas, setVentas] = useState([]); 
    const [showModal, setShowModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);

    const [showTicketConfirm, setShowTicketConfirm] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [lastSaleData, setLastSaleData] = useState(null);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [ventaToDelete, setVentaToDelete] = useState(null);

    const [busquedaProd, setBusquedaProd] = useState('');
    const [sugerenciasProd, setSugerenciasProd] = useState([]);
    const [mostrarProd, setMostrarProd] = useState(false);
    const [mostrarEstetica, setMostrarEstetica] = useState(false);
    const [mostrarVet, setMostrarVet] = useState(false);

    const [carrito, setCarrito] = useState([]);
    const [metodoPago, setMetodoPago] = useState('efectivo');

    const [serviciosBD, setServiciosBD] = useState([]);
    const [cobrosBorrados, setCobrosBorrados] = useState([]);
    const [showPapelera, setShowPapelera] = useState(false);
    const [busquedaPapelera, setBusquedaPapelera] = useState('');

    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);

    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 10;
    
    const wrapperRefProd = useRef(null);
    const wrapperRefEstetica = useRef(null);
    const wrapperRefVet = useRef(null);

    const lanzarExito = (mensaje) => {
        setMensajeExito(mensaje);
        setShowTicketConfirm(true);
    };

    useEffect(() => {
        cargarCaja();
        cargarServicios();
        cargarPapeleraCaja();
        const handleClickOutside = (event) => {
            if (wrapperRefProd.current && !wrapperRefProd.current.contains(event.target)) setMostrarProd(false);
            if (wrapperRefEstetica.current && !wrapperRefEstetica.current.contains(event.target)) setMostrarEstetica(false);
            if (wrapperRefVet.current && !wrapperRefVet.current.contains(event.target)) setMostrarVet(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const cargarCaja = async () => {
        try {
            const res = await api.get('/caja');
            const activos = Array.isArray(res.data) ? res.data.filter(v => v.fecha_borrado === null) : [];
            setVentas(activos);
        } catch (err) {
            console.error("Error cargando caja:", err);
        }
    };

    const cargarPapeleraCaja = async () => {
        try {
            const res = await api.get('/caja-papelera');
            setCobrosBorrados(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error cargando papelera caja:", err);
        }
    };

    const cargarServicios = async () => {
        try {
            const res = await api.get('/servicios');
            const activos = Array.isArray(res.data) ? res.data.filter(s => s.activo === 1) : [];
            setServiciosBD(activos);
        } catch (err) {
            console.error("Error cargando servicios:", err);
        }
    };

    const listaVet = serviciosBD.filter(s => s.categoria === 'veterinaria');
    const listaEstetica = serviciosBD.filter(s => s.categoria === 'estetica');

    const ultimoIndice = paginaActual * registrosPorPagina;
    const primerIndice = ultimoIndice - registrosPorPagina;
    const ventasPaginadas = ventas.slice(primerIndice, ultimoIndice);
    const totalPaginas = Math.ceil(ventas.length / registrosPorPagina);

    const cambiarPagina = (numero) => {
        if (numero >= 1 && numero <= totalPaginas) setPaginaActual(numero);
    };

    const generarTicketPDF = (datosCarrito, total, metodo) => {
        const doc = new jsPDF({ unit: 'mm', format: [80, 150 + (datosCarrito.length * 10)] });
        const center = 40;
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("MALFI VETERINARIA", center, 10, { align: "center" });
        doc.setFontSize(8); doc.text("San Miguel de Tucumán", center, 15, { align: "center" });
        doc.text("---------------------------------------------------------", center, 23, { align: "center" });
        doc.setFontSize(9); doc.text(`Fecha: ${new Date().toLocaleString('es-AR')}`, 5, 28);
        doc.text(`Cajero: ${user?.nombre || 'Luciana'}`, 5, 33);
        doc.text(`Metodo: ${metodo.toUpperCase()}`, 5, 38);
        doc.text("---------------------------------------------------------", center, 42, { align: "center" });
        let y = 53;
        datosCarrito.forEach(item => {
            doc.text(`${item.cantidad} x ${item.nombre.substring(0, 22)}`, 5, y);
            doc.text(`$${Number(item.subtotal).toLocaleString()}`, 75, y, { align: "right" });
            y += 6;
        });
        doc.text("---------------------------------------------------------", center, y, { align: "center" });
        y += 7; doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 5, y); doc.text(`$${Number(total).toLocaleString()}`, 75, y, { align: "right" });
        doc.save(`Ticket_Malfi_${Date.now()}.pdf`);
    };

    const exportarExcel = () => {
        const dataParaExcel = ventas.map(v => ({ Fecha: v.fecha_formateada, Concepto: v.descripcion.replace(/\n/g, " | "), Medio: v.metodo_pago.toUpperCase(), Monto: Number(v.monto) }));
        const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
        XLSX.writeFile(workbook, `Reporte_Caja_Malfi_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Reporte de Caja - Malfi Veterinaria", 14, 15);
        autoTable(doc, {
            startY: 20, head: [['Fecha', 'Concepto', 'Medio', 'Monto']],
            body: ventas.map(v => [v.fecha_formateada, v.descripcion.substring(0, 50), v.metodo_pago, `$${v.monto}`]),
            headStyles: { fillColor: [102, 51, 153] }
        });
        doc.save("Reporte_Caja_Malfi.pdf");
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            await api.delete(`/caja/papelera/${idToPermanentDelete}`); 
            lanzarExito("Operación eliminada definitivamente");
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
            cargarPapeleraCaja();
        } catch (err) {
            console.error("Error al eliminar permanentemente:", err);
        }
    };

    const obtenerPapeleraFiltrada = () => {
        return cobrosBorrados.filter(v => 
            (v.descripcion || '').toLowerCase().includes(busquedaPapelera.toLowerCase())
        );
    };

    const restaurarMovimiento = async (id) => {
        try {
            await api.put(`/caja/restaurar/${id}`);
            cargarCaja();
            cargarPapeleraCaja();
            lanzarExito("Venta restaurada a la caja");
        } catch (err) { 
            alert("Error al restaurar"); 
        }
    };

    const handleEliminar = (id, e) => { e.stopPropagation(); setVentaToDelete(id); setShowDeleteConfirm(true); };

    const confirmarEliminacion = async () => {
        try {
            await api.delete(`/caja/${ventaToDelete}`);
            cargarCaja();
            cargarPapeleraCaja();
            lanzarExito("Cobro enviado a la papelera");
        } catch (err) { alert("Error al anular venta"); }
        finally { setShowDeleteConfirm(false); setVentaToDelete(null); }
    };

    const prepararEdicion = (v, e) => {
        e.stopPropagation();
        setDatosEdicion(v);
        setMetodoPago(v.metodo_pago);
        const lineas = v.descripcion ? v.descripcion.split('\n') : [];
        const itemsParseados = lineas.map((linea, index) => {
            const match = linea.match(/(\d+)x\s+(.+?)\s*\(\$\s*([\d.,]+)/);
            if (match) {
                return {
                    idUnico: `edit-${Date.now()}-${index}`,
                    nombre: match[2].trim(),
                    precio: parseFloat(match[3].replace(',', '')),
                    cantidad: parseInt(match[1]),
                    subtotal: parseFloat(match[3].replace(',', '')) * parseInt(match[1]),
                    original: true
                };
            }
            return null;
        }).filter(Boolean);
        setCarrito(itemsParseados.length > 0 ? itemsParseados : [{ idUnico: 'edit-1', nombre: v.descripcion || 'Operación', precio: Number(v.monto), cantidad: 1, subtotal: Number(v.monto), original: true }]);
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (carrito.length === 0) return alert("El carrito está vacío");
        const totalActual = totalVentaCarrito;
        const itemsActuales = [...carrito];
        const metodoActual = metodoPago;
        const descripcionFinal = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.subtotal})`).join('\n');
        try {
            const res = await api({
                url: datosEdicion ? `/caja/${datosEdicion.id}` : '/caja',
                method: datosEdicion ? 'PUT' : 'POST',
                data: { tipo_operacion: 'ingreso', categoria: 'Venta Múltiple', descripcion: descripcionFinal, monto: totalActual, metodo_pago: metodoActual, usuario_id: user?.id, detalles: itemsActuales }
            });
            if (res.status === 200 || res.status === 201) { 
                setLastSaleData({ carrito: itemsActuales, total: totalActual, metodo: metodoActual });
                setShowModal(false); 
                setCarrito([]); 
                cargarCaja(); 
                lanzarExito("Operación procesada con éxito");
            }
        } catch (err) { alert("Error al guardar la venta."); }
    };

    const obtenerProductos = async (termino = '') => {
        setBusquedaProd(termino);
        try {
            const res = await api.get(`/productos/buscar?q=${encodeURIComponent(termino)}`);
            setSugerenciasProd(Array.isArray(res.data) ? res.data : []);
            setMostrarProd(true);
        } catch (err) { setSugerenciasProd([]); }
    };

    const agregarAlCarrito = (item, tipo = 'producto') => {
        const idUnico = tipo !== 'producto' ? `${tipo}-${item.id}` : `prod-${item.id}`;
        const existe = carrito.find(i => i.idUnico === idUnico);
        if (existe) {
            actualizarCantidad(idUnico, 1);
        } else {
            setCarrito([...carrito, { 
                idUnico, producto_id: tipo === 'producto' ? item.id : null, 
                nombre: item.nombre, precio: Number(tipo === 'producto' ? item.precio_venta : item.precio), 
                cantidad: 1, subtotal: Number(tipo === 'producto' ? item.precio_venta : item.precio), 
                stock_max: tipo === 'producto' ? item.stock : 999, original: false
            }]);
        }
    };

    const actualizarCantidad = (idUnico, cambio) => {
        setCarrito(carrito.map(item => {
            if (item.idUnico === idUnico) {
                const nuevaCant = item.cantidad + cambio;
                if (nuevaCant > item.stock_max || nuevaCant < 1) return item;
                return { ...item, cantidad: nuevaCant, subtotal: nuevaCant * Number(item.precio) };
            }
            return item;
        }));
    };

    const totalVentaCarrito = carrito.reduce((acc, i) => acc + Number(i.subtotal), 0);
    
    // --- CORRECCIÓN LÓGICA TOTALES ---
    const hoy = new Date();
    const hoyISO = hoy.toISOString().split('T')[0]; // "YYYY-MM-DD"
    const hoyLocal = hoy.toLocaleDateString('es-AR'); // "DD/MM/YYYY"

    const ventasHoy = ventas.filter(v => {
        // Comparamos contra v.fecha (ISO) o v.fecha_formateada (Local)
        const fechaVentaISO = v.fecha ? v.fecha.split('T')[0] : "";
        const fechaVentaLocal = v.fecha_formateada ? v.fecha_formateada.split(' ')[0] : "";
        return (fechaVentaISO === hoyISO || fechaVentaLocal === hoyLocal) && v.tipo_operacion === 'ingreso';
    });

    const recaudacionTotal = ventasHoy.reduce((acc, v) => acc + parseFloat(v.monto || 0), 0);
    const totalEfectivo = ventasHoy.filter(v => v.metodo_pago === 'efectivo').reduce((acc, v) => acc + parseFloat(v.monto || 0), 0);
    const totalTransferencia = ventasHoy.filter(v => v.metodo_pago === 'transferencia').reduce((acc, v) => acc + parseFloat(v.monto || 0), 0);
    const totalTarjeta = ventasHoy.filter(v => v.metodo_pago === 'tarjeta').reduce((acc, v) => acc + parseFloat(v.monto || 0), 0);
    // ---------------------------------

    return (
        <div className="container-fluid min-vh-100 p-4 text-dark position-relative" style={{ backgroundImage: `url('https://i.pinimg.com/736x/ef/1f/af/ef1faf0a74cd6ef7768e445731e194eb.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.1)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}><FontAwesomeIcon icon={faCashRegister} className="me-2"/> Caja de Malfi</h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        {(user?.rol === 'admin' || user?.rol === 'dueno') && (
                            <button className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm" onClick={() => window.location.href = '/configuracion'}><FontAwesomeIcon icon={faTools} className="me-2" /> Precios</button>
                        )}
                        <button className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={() => {cargarPapeleraCaja(); setShowPapelera(true);}}><FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera ({cobrosBorrados.length})</button>
                        <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setCarrito([]); setShowModal(true); }}><FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Operación</button>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    {[ 
                        { label: 'TOTAL HOY', val: recaudacionTotal, color: 'border-primary', text: 'text-primary' }, 
                        { label: 'EFECTIVO', val: totalEfectivo, color: 'border-success', text: 'text-success' }, 
                        { label: 'TRANSF.', val: totalTransferencia, color: 'border-info', text: 'text-info' }, 
                        { label: 'TARJETAS', val: totalTarjeta, color: 'border-warning', text: 'text-warning' } 
                    ].map((item, idx) => (
                        <div className="col-md-3" key={idx}>
                            <div className={`card border-0 shadow-sm p-3 rounded-4 border-start border-5 ${item.color} h-100`} style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)' }}>
                                <small className="text-muted fw-bold">{item.label}</small>
                                <h3 className={`fw-bold mb-0 ${item.text}`}>$ {item.val.toLocaleString('es-AR')}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)' }}>
                    <table className="table table-hover mb-0 text-dark">
                        <thead className="bg-light"><tr><th className="ps-4 py-3">Fecha</th><th>Concepto</th><th>Medio</th><th className="text-end">Monto</th><th className="text-center">Acciones</th></tr></thead>
                        <tbody>
                            {ventasPaginadas.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-5 text-muted">No hay operaciones registradas</td></tr>
                            ) : (
                                ventasPaginadas.map(v => (
                                    <tr key={v.id} onClick={() => setVentaSeleccionada(v)} style={{ cursor: 'pointer' }}>
                                        <td className="ps-4 small text-muted">{v.fecha_formateada}</td>
                                        <td className="fw-bold small">{v.descripcion.substring(0, 50)}...</td>
                                        <td><span className="badge bg-light text-dark border">{v.metodo_pago.toUpperCase()}</span></td>
                                        <td className="text-end fw-bold text-success">$ {Number(v.monto).toLocaleString('es-AR')}</td>
                                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <button className="btn btn-sm text-primary me-2" onClick={(e) => prepararEdicion(v, e)}><FontAwesomeIcon icon={faEdit} /></button>
                                            <button className="btn btn-sm text-danger" onClick={(e) => handleEliminar(v.id, e)}><FontAwesomeIcon icon={faTrash} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="d-flex justify-content-center py-3 bg-light border-top text-dark">
                        <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === 1} onClick={() => cambiarPagina(paginaActual - 1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                        <span className="mx-3 fw-bold">Página {paginaActual}</span>
                        <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === totalPaginas} onClick={() => cambiarPagina(paginaActual + 1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                    </div>
                </div>
            </div>

            {/* MODAL PAPELERA */}
            {showPapelera && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 2100 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
                            <div className="text-center p-4 text-white" style={{ backgroundColor: '#dc3545' }}>
                                <h4 className="fw-bold m-0 text-uppercase"><FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Cobros Anulados</h4>
                            </div>
                            <div className="modal-body p-4 bg-white text-dark">
                                <div className="mb-4 d-flex justify-content-center text-dark">
                                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-light border w-50">
                                        <span className="input-group-text bg-transparent border-0 ps-3 text-muted"><FontAwesomeIcon icon={faSearch} /></span>
                                        <input 
                                            type="text" 
                                            className="form-control border-0 py-2 bg-light text-dark" 
                                            placeholder="Buscar en papelera..." 
                                            value={busquedaPapelera} 
                                            onChange={(e) => setBusquedaPapelera(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                    <table className="table align-middle text-dark">
                                        <thead className="bg-light sticky-top">
                                            <tr className="text-muted small text-uppercase">
                                                <th>Concepto</th><th>Monto</th><th className="text-center">Borrado por</th><th>Fecha</th><th className="text-center">Restaurar</th><th className="text-center">Eliminar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {obtenerPapeleraFiltrada().length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-5 text-muted fw-bold">No hay registros en la papelera.</td></tr>
                                            ) : (
                                                obtenerPapeleraFiltrada().map(v => (
                                                    <tr key={v.id}>
                                                        <td><div className="fw-bold small text-truncate" style={{maxWidth: '200px'}}>{v.descripcion}</div></td>
                                                        <td className="text-success fw-bold">$ {Number(v.monto).toLocaleString('es-AR')}</td>
                                                        <td className="text-center"><span className="badge bg-light text-dark border px-3 py-2" style={{borderRadius:'8px'}}>{v.borrado_por_nombre || 'Luciana'}</span></td>
                                                        <td className="small text-muted">{new Date(v.fecha_borrado).toLocaleString('es-AR')}</td>
                                                        <td className="text-center"><button className="btn btn-success rounded-circle shadow-sm" onClick={() => restaurarMovimiento(v.id)} style={{width:'40px', height:'40px'}}><FontAwesomeIcon icon={faTrashRestore} /></button></td>
                                                        <td className="text-center"><button className="btn btn-danger rounded-circle shadow-sm" onClick={() => { setIdToPermanentDelete(v.id); setShowConfirmPermanent(true); }} style={{width:'40px', height:'40px'}}><FontAwesomeIcon icon={faTrash} /></button></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-center mt-4">
                                    <button className="btn text-white px-5 py-2 fw-bold shadow" style={{ backgroundColor: '#2C3E50', borderRadius: '25px' }} onClick={() => setShowPapelera(false)}>CERRAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ÉXITO */}
            {showTicketConfirm && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 4000 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div className="modal-content border-0 rounded-5 text-center p-5 position-relative shadow-lg" style={{ overflow: 'visible', marginTop: '40px' }}>
                            <div className="position-absolute start-50 translate-middle bg-white rounded-circle shadow d-flex align-items-center justify-content-center" 
                                 style={{ top: '0', width: '100px', height: '100px' }}>
                                <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '80px', color: '#2ecc71' }} />
                            </div>
                            <div className="mt-4 pt-2 text-dark">
                                <h2 className="fw-bold mb-3 text-dark text-uppercase">¡Éxito!</h2>
                                <p className="text-muted fs-5 mb-4">{mensajeExito}</p>
                                <div className="d-flex flex-column gap-2">
                                    {lastSaleData && <button className="btn btn-outline-success rounded-pill py-2 fw-bold" onClick={() => generarTicketPDF(lastSaleData.carrito, lastSaleData.total, lastSaleData.metodo)}><FontAwesomeIcon icon={faPrint} className="me-2"/> IMPRIMIR TICKET</button>}
                                    <button className="btn w-100 rounded-pill py-3 fw-bold text-white shadow-sm" style={{ backgroundColor: '#2C3E50' }} onClick={() => setShowTicketConfirm(false)}>Entendido</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal show={showConfirmPermanent} onClose={() => { setShowConfirmPermanent(false); setIdToPermanentDelete(null); }} onConfirm={handleConfirmarEliminarPermanente} title="¿Eliminar permanentemente?" message="Esta acción no se puede deshacer. El registro se borrará por completo de la base de datos." confirmText="Sí, eliminar para siempre" confirmColor="danger" />
            <ConfirmModal show={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmarEliminacion} title="¿Anular cobro?" message="El cobro se moverá a la papelera de anulados." confirmText="Sí, anular" confirmColor="danger" />

            {ventaSeleccionada && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 3000}}>
                    <div className="modal-dialog modal-dialog-centered text-dark">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                            <h4 className="fw-bold text-primary mb-3 text-uppercase">Detalle de Operación</h4>
                            <div className="bg-light p-3 rounded-3 mb-4 text-dark" style={{whiteSpace: 'pre-wrap'}}>{ventaSeleccionada.descripcion}</div>
                            <button className="btn btn-secondary w-100 rounded-pill fw-bold" onClick={() => setVentaSeleccionada(null)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '1100px' }}>
                        <div className="modal-content border-0 rounded-5 shadow-2xl overflow-hidden text-dark" style={{ height: '88vh' }}>
                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white text-dark">
                                <h5 className="fw-bold mb-0 text-primary">{datosEdicion ? <><FontAwesomeIcon icon={faEdit} className="me-2"/> Modificar Operación</> : <><FontAwesomeIcon icon={faCartPlus} className="me-2" /> Nueva Operación</>}</h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="row g-0 h-100 overflow-hidden">
                                <div className="col-md-8 bg-white d-flex flex-column h-100 border-end">
                                    <div className="p-4 flex-grow-1 overflow-auto">
                                        <h6 className="fw-bold text-muted text-uppercase small mb-3">Ítems en esta operación</h6>
                                        {carrito.length === 0 ? (<div className="text-center py-5 opacity-50"><FontAwesomeIcon icon={faShoppingBag} size="4x" className="mb-3 text-light" /><p>El carrito está vacío.</p></div>) : (
                                            <div className="table-responsive text-dark">
                                                <table className="table align-middle text-dark">
                                                    <thead><tr className="text-dark"><th>Concepto</th><th className="text-center">Cant.</th><th className="text-end">Subtotal</th><th></th></tr></thead>
                                                    <tbody>
                                                        {carrito.map(item => (
                                                            <tr key={item.idUnico}>
                                                                <td className="text-dark"><div className="fw-bold">{item.nombre}</div></td>
                                                                <td className="text-center"><div className="btn-group btn-group-sm rounded-pill border overflow-hidden"><button className="btn btn-white" onClick={() => actualizarCantidad(item.idUnico, -1)}>-</button><span className="btn btn-white px-3 fw-bold">{item.cantidad}</span><button className="btn btn-white" onClick={() => actualizarCantidad(item.idUnico, 1)}>+</button></div></td>
                                                                <td className="text-end fw-bold text-dark">$ {item.subtotal.toLocaleString()}</td>
                                                                <td className="text-end"><button className="btn btn-link text-danger p-0" onClick={() => setCarrito(carrito.filter(i => i.idUnico !== item.idUnico))}><FontAwesomeIcon icon={faTrash}/></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4 bg-light border-top">
                                        <div className="row g-3">
                                            <div className="col-md-6 position-relative" ref={wrapperRefProd}>
                                                <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border"><span className="input-group-text bg-white border-0"><FontAwesomeIcon icon={faSearch} /></span><input type="text" className="form-control border-0 py-2 text-dark" placeholder="Agregar Producto..." value={busquedaProd} onChange={(e) => obtenerProductos(e.target.value)} onFocus={() => setMostrarProd(true)} /></div>
                                                {mostrarProd && sugerenciasProd.length > 0 && (
                                                    <div className="position-absolute shadow-lg border rounded-3 bg-white overflow-auto text-dark" style={{ bottom: '100%', marginBottom: '10px', zIndex: 9999, width: '100%', maxHeight: '300px' }}>
                                                        {sugerenciasProd.map(p => (<button key={p.id} disabled={p.stock <= 0} className="list-group-item list-group-item-action d-flex justify-content-between p-2 small border-0" onClick={() => { agregarAlCarrito(p); setMostrarProd(false); setBusquedaProd(''); }}><div><strong>{p.nombre}</strong><br/><small>Stock: {p.stock}</small></div><span>$ {p.precio_venta}</span></button>))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-3 position-relative" ref={wrapperRefVet}>
                                                <button className="btn btn-danger w-100 rounded-pill shadow-sm" onClick={() => setMostrarVet(!mostrarVet)}>VETERINARIA <FontAwesomeIcon icon={faChevronDown}/></button>
                                                {mostrarVet && (
                                                    <div className="position-absolute shadow-lg border rounded-3 bg-white text-dark" style={{ bottom: '100%', marginBottom: '10px', zIndex: 9999, width: '220px', maxHeight: '280px', overflowY: 'auto' }}>
                                                        {listaVet.map(s => (<button key={s.id} className="list-group-item list-group-item-action p-2 small border-0 text-dark" onClick={() => { agregarAlCarrito(s, 'vet'); setMostrarVet(false); }}>{s.nombre}</button>))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 p-4 d-flex flex-column bg-light h-100 border-start">
                                    <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white text-center">
                                        <h6 className="fw-bold text-muted mb-3">TOTAL A COBRAR</h6>
                                        <h2 className="fw-bold text-primary mb-0">$ {totalVentaCarrito.toLocaleString('es-AR')}</h2>
                                    </div>
                                    <div className="mb-4 text-dark">
                                        <label className="fw-bold small text-muted text-uppercase mb-2">Método de Pago</label>
                                        <div className="d-flex flex-column gap-2 text-dark">
                                            {['efectivo', 'transferencia', 'tarjeta'].map(met => (<button key={met} className={`btn rounded-pill py-2 text-capitalize fw-bold ${metodoPago === met ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetodoPago(met)}>{met}</button>))}
                                        </div>
                                    </div>
                                    <button className="btn btn-success w-100 py-3 rounded-pill fw-bold shadow-lg" disabled={carrito.length === 0} onClick={handleGuardar}>CONFIRMAR Y COBRAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CajaPage;