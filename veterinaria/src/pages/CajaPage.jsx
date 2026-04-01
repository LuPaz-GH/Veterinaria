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
    faTools, faChevronLeft, faChevronRight, faTrashRestore
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../services/api';

const CajaPage = ({ user }) => {
    const [ventas, setVentas] = useState([]); 
    const [showModal, setShowModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);

    const [showTicketConfirm, setShowTicketConfirm] = useState(false);
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

    // --- ESTADOS PARA PAGINACIÓN ---
    const [paginaActual, setPaginaActual] = useState(1);
    const registrosPorPagina = 10;
    
    const wrapperRefProd = useRef(null);
    const wrapperRefEstetica = useRef(null);
    const wrapperRefVet = useRef(null);

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

    const handleEliminar = (id, e) => { e.stopPropagation(); setVentaToDelete(id); setShowDeleteConfirm(true); };

    const confirmarEliminacion = async () => {
        try {
            await api.delete(`/caja/${ventaToDelete}`);
            cargarCaja();
            cargarPapeleraCaja();
        } catch (err) { alert("Error al anular venta"); }
        finally { setShowDeleteConfirm(false); setVentaToDelete(null); }
    };

    const restaurarMovimiento = async (id) => {
        try {
            await api.put(`/caja/restaurar/${id}`);
            cargarCaja();
            cargarPapeleraCaja();
            setShowTicketConfirm(true);   // ← Cambiado: ahora muestra el modal bonito
        } catch (err) { 
            alert("Error al restaurar"); 
        }
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
                setShowTicketConfirm(true);
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
    const hoy = new Date();
    const hoyStr = `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}/${hoy.getFullYear()}`; 
    const ventasHoy = ventas.filter(v => (v.fecha_formateada || "").split(' ')[0] === hoyStr && v.tipo_operacion === 'ingreso');
    const recaudacionTotal = ventasHoy.reduce((acc, v) => acc + Number(v.monto), 0);
    const totalEfectivo = ventasHoy.filter(v => v.metodo_pago === 'efectivo').reduce((acc, v) => acc + Number(v.monto), 0);
    const totalTransferencia = ventasHoy.filter(v => v.metodo_pago === 'transferencia').reduce((acc, v) => acc + Number(v.monto), 0);
    const totalTarjeta = ventasHoy.filter(v => v.metodo_pago === 'tarjeta').reduce((acc, v) => acc + Number(v.monto), 0);

    return (
        <div className="container-fluid min-vh-100 p-4 text-dark position-relative" style={{ backgroundImage: `url('https://i.pinimg.com/736x/ef/1f/af/ef1faf0a74cd6ef7768e445731e194eb.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.1)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}><FontAwesomeIcon icon={faCashRegister} className="me-2"/> Caja de Malfi</h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        {(user?.rol === 'admin' || user?.rol === 'dueno') && (
                            <button className="btn btn-warning rounded-pill px-4 fw-bold shadow-sm" onClick={() => window.location.href = '/configuracion'}><FontAwesomeIcon icon={faTools} className="me-2" /> Precios</button>
                        )}
                        <button className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowPapelera(true)}><FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera ({cobrosBorrados.length})</button>
                        <button className="btn btn-nueva-mascota rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setCarrito([]); setShowModal(true); }}><FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Operación</button>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    {[ { label: 'TOTAL HOY', val: recaudacionTotal, color: 'border-primary', text: 'text-primary' }, { label: 'EFECTIVO', val: totalEfectivo, color: 'border-success', text: 'text-success' }, { label: 'TRANSF.', val: totalTransferencia, color: 'border-info', text: 'text-info' }, { label: 'TARJETAS', val: totalTarjeta, color: 'border-warning', text: 'text-warning' } ].map((item, idx) => (
                        <div className="col-md-3" key={idx}>
                            <div className={`card border-0 shadow-sm p-3 rounded-4 border-start border-5 ${item.color} h-100`} style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(8px)' }}>
                                <small className="text-muted fw-bold">{item.label}</small>
                                <h3 className={`fw-bold mb-0 ${item.text}`}>$ {item.val.toLocaleString('es-AR')}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)' }}>
                    <table className="table table-hover mb-0">
                        <thead style={{ background: 'rgba(102, 51, 153, 0.1)' }}><tr><th className="ps-4">Fecha</th><th>Concepto</th><th>Medio</th><th className="text-end">Monto</th><th className="text-center">Acciones</th></tr></thead>
                        <tbody>
                            {ventasPaginadas.map(v => (
                                <tr key={v.id} onClick={() => setVentaSeleccionada(v)} style={{ cursor: 'pointer' }}>
                                    <td className="ps-4 small text-muted">{v.fecha_formateada}</td>
                                    <td className="fw-bold small text-truncate" style={{maxWidth: '300px'}}>{v.descripcion}</td>
                                    <td><span className="badge bg-light text-dark border">{v.metodo_pago.toUpperCase()}</span></td>
                                    <td className="text-end fw-bold text-success">$ {Number(v.monto).toLocaleString('es-AR')}</td>
                                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                        <button className="btn btn-sm text-primary me-2" onClick={(e) => prepararEdicion(v, e)}><FontAwesomeIcon icon={faEdit} /></button>
                                        <button className="btn btn-sm text-danger" onClick={(e) => handleEliminar(v.id, e)}><FontAwesomeIcon icon={faTrash} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="d-flex justify-content-between align-items-center p-3 bg-light border-top">
                        <div className="small text-muted fw-bold">Página {paginaActual} de {totalPaginas || 1}</div>
                        <div className="btn-group shadow-sm">
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === 1} onClick={() => setPaginaActual(paginaActual - 1)}><FontAwesomeIcon icon={faChevronLeft} /></button>
                            <button className="btn btn-sm btn-white border px-3" disabled={paginaActual === totalPaginas || totalPaginas === 0} onClick={() => setPaginaActual(paginaActual + 1)}><FontAwesomeIcon icon={faChevronRight} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL PAPELERA DISEÑO IMAGEN CURVA ROJO */}
            {showPapelera && (
                <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 2100 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
                            <div className="modal-header text-white px-4 py-3" style={{ backgroundColor: '#dc3545' }}>
                                <h5 className="modal-title fw-bold"><FontAwesomeIcon icon={faTrashRestore} className="me-2" /> Papelera de Cobros Anulados</h5>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowPapelera(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead className="bg-light">
                                            <tr className="text-muted small text-uppercase">
                                                <th>Concepto</th>
                                                <th>Monto</th>
                                                <th>Borrado por</th>
                                                <th>Fecha</th>
                                                <th className="text-center">Restaurar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cobrosBorrados.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center py-5 text-muted fw-bold">No hay cobros anulados para mostrar.</td></tr>
                                            ) : (
                                                cobrosBorrados.map(v => (
                                                    <tr key={v.id}>
                                                        <td><div className="fw-bold small text-truncate" style={{maxWidth: '200px'}}>{v.descripcion}</div></td>
                                                        <td className="text-success fw-bold">$ {Number(v.monto).toLocaleString('es-AR')}</td>
                                                        <td><span className="badge bg-light text-dark border px-2 py-1">{v.borrado_por_nombre || user?.nombre}</span></td>
                                                        <td className="small text-muted">{new Date(v.fecha_borrado || v.fecha).toLocaleString('es-AR')}</td>
                                                        <td className="text-center">
                                                            <button 
                                                                className="btn btn-success rounded-circle shadow-sm d-inline-flex align-items-center justify-content-center" 
                                                                onClick={() => restaurarMovimiento(v.id)} 
                                                                style={{width:'35px', height:'35px'}}
                                                                title="Restaurar cobro"
                                                            >
                                                                <FontAwesomeIcon icon={faTrashRestore} size="sm" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-3 bg-light">
                                <button className="btn btn-dark px-4 rounded-pill fw-bold shadow-sm" onClick={() => setShowPapelera(false)}>CERRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES RESTANTES SE MANTIENEN IGUAL */}
            {ventaSeleccionada && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 3000}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                            <h4 className="fw-bold text-primary mb-3">Detalle de Operación</h4>
                            <div className="bg-light p-3 rounded-3 mb-4" style={{whiteSpace: 'pre-wrap'}}>{ventaSeleccionada.descripcion}</div>
                            <button className="btn btn-secondary w-100 rounded-pill fw-bold" onClick={() => setVentaSeleccionada(null)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '1100px' }}>
                        <div className="modal-content border-0 rounded-5 shadow-2xl overflow-hidden text-dark" style={{ height: '88vh' }}>
                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white">
                                <h5 className="fw-bold mb-0 text-primary">{datosEdicion ? <><FontAwesomeIcon icon={faEdit} className="me-2"/> Modificar Operación #{datosEdicion.id}</> : <><FontAwesomeIcon icon={faCartPlus} className="me-2" /> Nueva Operación</>}</h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="row g-0 h-100 overflow-hidden">
                                <div className="col-md-8 bg-white d-flex flex-column h-100 border-end">
                                    <div className="p-4 flex-grow-1 overflow-auto">
                                        <h6 className="fw-bold text-muted text-uppercase small mb-3">Ítems en esta operación</h6>
                                        {carrito.length === 0 ? (<div className="text-center py-5 opacity-50"><FontAwesomeIcon icon={faShoppingBag} size="4x" className="mb-3 text-light" /><p>El carrito está vacío.</p></div>) : (
                                            <div className="table-responsive">
                                                <table className="table align-middle">
                                                    <thead className="small text-muted"><tr><th>Concepto</th><th className="text-center">Cant.</th><th className="text-end">Subtotal</th><th></th></tr></thead>
                                                    <tbody>
                                                        {carrito.map(item => (
                                                            <tr key={item.idUnico} className={item.original ? "bg-light-subtle" : "bg-success-subtle"}>
                                                                <td><div className="fw-bold">{item.nombre}</div><div className="text-muted" style={{fontSize: '11px'}}>Precio unitario: <strong>$ {Number(item.precio).toLocaleString()}</strong></div></td>
                                                                <td className="text-center"><div className="btn-group btn-group-sm shadow-sm rounded-pill overflow-hidden"><button className="btn btn-white border" onClick={() => actualizarCantidad(item.idUnico, -1)}><FontAwesomeIcon icon={faMinusCircle}/></button><span className="btn btn-white border-top border-bottom px-3 fw-bold">{item.cantidad}</span><button className="btn btn-white border" onClick={() => actualizarCantidad(item.idUnico, 1)}><FontAwesomeIcon icon={faPlusCircle}/></button></div></td>
                                                                <td className="text-end fw-bold">$ {Number(item.subtotal).toLocaleString()}</td>
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
                                                <label className="fw-bold small text-muted mb-1 text-uppercase">Agregar Producto</label>
                                                <div className="input-group input-group-sm shadow-sm"><span className="input-group-text bg-white border-end-0"><FontAwesomeIcon icon={faSearch} /></span><input type="text" className="form-control border-start-0" placeholder="Buscar en stock..." value={busquedaProd} onChange={(e) => obtenerProductos(e.target.value)} onFocus={() => setMostrarProd(true)} /></div>
                                                {mostrarProd && (
                                                    <div className="position-absolute w-100 shadow-lg border rounded-3 bg-white overflow-auto" style={{ bottom: '100%', zIndex: 3000, maxHeight: '200px', marginBottom: '10px' }}>
                                                        {sugerenciasProd.map(p => (<button key={p.id} disabled={p.stock <= 0} className="list-group-item list-group-item-action d-flex justify-content-between p-2" onClick={() => { agregarAlCarrito(p); setMostrarProd(false); setBusquedaProd(''); }}><div className="text-start small fw-bold">{p.nombre} <small className="d-block text-muted">Stock: {p.stock}</small></div><span className="badge bg-primary-subtle text-primary">$ {p.precio_venta}</span></button>))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-3 position-relative" ref={wrapperRefVet}>
                                                <label className="fw-bold small text-muted mb-1 text-uppercase">Veterinaria</label>
                                                <button className="btn btn-danger btn-sm w-100 rounded-pill fw-bold shadow-sm" onClick={() => setMostrarVet(!mostrarVet)}>SERVICIOS <FontAwesomeIcon icon={faChevronDown} className="ms-1"/></button>
                                                {mostrarVet && (
                                                    <div className="position-absolute shadow-lg border rounded-3 bg-white" style={{ bottom: '100%', zIndex: 3500, width: '100%', marginBottom: '10px' }}>
                                                        {listaVet.map(s => (<button key={s.id} className="list-group-item list-group-item-action p-2 small border-0 text-start" onClick={() => { agregarAlCarrito(s, 'vet'); setMostrarVet(false); }}><div className="d-flex justify-content-between w-100"><span>{s.nombre}</span><span className="text-danger fw-bold">$ {Number(s.precio).toLocaleString()}</span></div></button>))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-3 position-relative" ref={wrapperRefEstetica}>
                                                <label className="fw-bold small text-muted mb-1 text-uppercase">Estética</label>
                                                <button className="btn btn-info btn-sm w-100 rounded-pill fw-bold shadow-sm text-white" onClick={() => setMostrarEstetica(!mostrarEstetica)}>ESTÉTICA <FontAwesomeIcon icon={faChevronDown} className="ms-1"/></button>
                                                {mostrarEstetica && (
                                                    <div className="position-absolute shadow-lg border rounded-3 bg-white" style={{ bottom: '100%', zIndex: 3500, width: '100%', marginBottom: '10px' }}>
                                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                            {listaEstetica.map(s => (<button key={s.id} className="list-group-item list-group-item-action p-2 small border-0 text-start" onClick={() => { agregarAlCarrito(s, 'estetica'); setMostrarEstetica(false); }}><div className="d-flex justify-content-between w-100"><span>{s.nombre}</span><span className="text-info fw-bold">$ {Number(s.precio).toLocaleString()}</span></div></button>))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 p-4 d-flex flex-column" style={{ background: '#f8f9fa' }}>
                                    <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                                        <h6 className="fw-bold text-center text-muted mb-4">TOTAL DE LA OPERACIÓN</h6>
                                        <div className="text-center"><h2 className="fw-bold text-primary mb-0">$ {totalVentaCarrito.toLocaleString('es-AR')}</h2><div className="badge bg-primary-subtle text-primary rounded-pill px-3 mt-2">PESOS ARGENTINOS</div></div>
                                    </div>
                                    <div className="mb-auto">
                                        <label className="form-label fw-bold text-muted small">MÉTODO DE PAGO</label>
                                        <div className="d-flex flex-column gap-2">
                                            {['efectivo', 'transferencia', 'tarjeta'].map(met => (<button key={met} className={`btn rounded-pill py-2 text-capitalize fw-bold ${metodoPago === met ? 'btn-primary shadow' : 'btn-outline-secondary'}`} onClick={() => setMetodoPago(met)}><FontAwesomeIcon icon={met === 'efectivo' ? faMoneyBillWave : met === 'transferencia' ? faExchangeAlt : faCreditCard} className="me-2" />{met}</button>))}
                                        </div>
                                    </div>
                                    <button className={`btn w-100 py-3 rounded-pill fw-bold shadow-lg ${datosEdicion ? 'btn-primary' : 'btn-success'}`} disabled={carrito.length === 0} onClick={handleGuardar}><FontAwesomeIcon icon={faCheckCircle} className="me-2" />{datosEdicion ? 'ACTUALIZAR VENTA' : 'CONFIRMAR Y COBRAR'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL MEJORADO - VENTA RESTAURADA */}
            {showTicketConfirm && (
                <div className="modal d-block" style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.75)', 
                    zIndex: 4000, 
                    backdropFilter: 'blur(8px)' 
                }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-xl overflow-hidden" 
                             style={{ 
                                 maxWidth: '380px', 
                                 background: 'white',
                                 boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.4)'
                             }}>
                            
                            {/* Parte superior con degradado verde */}
                            <div className="pt-5 pb-4 text-center" style={{ 
                                background: 'linear-gradient(135deg, #10b981, #34d399)',
                                color: 'white'
                            }}>
                                <div className="mx-auto mb-3 d-flex align-items-center justify-content-center" 
                                     style={{ 
                                         width: '90px', 
                                         height: '90px', 
                                         background: 'rgba(255,255,255,0.25)', 
                                         borderRadius: '9999px' 
                                     }}>
                                    <FontAwesomeIcon icon={faCheckCircle} size="4x" />
                                </div>
                                <h3 className="fw-bold mb-1">¡Venta Restaurada!</h3>
                                <p className="mb-0 opacity-90">La operación ha vuelto a la caja correctamente</p>
                            </div>

                            {/* Contenido principal */}
                            <div className="p-5 text-center">
                                <div className="mb-4">
                                    <p className="text-muted fs-5 mb-0">
                                        La venta se ha restaurado con éxito y ya aparece nuevamente en la lista principal.
                                    </p>
                                </div>

                                <div className="d-flex gap-3">
                                    <button 
                                        className="btn flex-fill py-3 rounded-3 fw-semibold shadow-sm border"
                                        style={{ backgroundColor: '#f8f9fa', color: '#495057' }}
                                        onClick={() => setShowTicketConfirm(false)}
                                    >
                                        Cerrar
                                    </button>
                                    
                                    <button 
                                        className="btn flex-fill py-3 rounded-3 fw-bold shadow-sm text-white"
                                        style={{ 
                                            background: 'linear-gradient(135deg, #10b981, #34d399)',
                                            border: 'none'
                                        }}
                                        onClick={() => setShowTicketConfirm(false)}
                                    >
                                        ¡Entendido!
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 3500}}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content border-0 rounded-4 p-4 text-center">
                            <FontAwesomeIcon icon={faExclamationCircle} className="text-danger mb-3" size="3x" />
                            <h5 className="fw-bold">¿Anular Operación?</h5>
                            <div className="d-flex gap-2">
                                <button className="btn btn-danger w-100 rounded-pill fw-bold" onClick={confirmarEliminacion}>ANULAR</button>
                                <button className="btn btn-light w-100 rounded-pill border fw-bold" onClick={() => setShowDeleteConfirm(false)}>SALIR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CajaPage;