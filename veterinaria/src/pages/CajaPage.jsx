import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCashRegister, faPlus, faSearch, faStethoscope, faScissors, 
    faHandHoldingUsd, faBoxOpen, faChevronDown, faBowlFood, 
    faPills, faShoppingBag, faTags, faTrash, faCartPlus, faBan, 
    faPlusCircle, faMinusCircle, faExclamationCircle, faMicroscope, 
    faSyringe, faUserMd, faFileInvoiceDollar, faStar, faCalendarDay,
    faMoneyBillWave, faCreditCard, faExchangeAlt, faTimes, faArrowLeft, 
    faInfoCircle, faEdit, faFileExcel, faFilePdf, faCheckCircle, faPrint, faSignature, faPaw 
} from '@fortawesome/free-solid-svg-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const CajaPage = ({ user }) => {
    const [ventas, setVentas] = useState([]); 
    const [showModal, setShowModal] = useState(false);
    const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);

    // Estados para el modal de ticket con estilo
    const [showTicketConfirm, setShowTicketConfirm] = useState(false);
    const [lastSaleData, setLastSaleData] = useState(null);

    // Estados para el modal de confirmación de eliminación
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [ventaToDelete, setVentaToDelete] = useState(null);

    const [busquedaProd, setBusquedaProd] = useState('');
    const [busquedaEstetica, setBusquedaEstetica] = useState('');
    const [busquedaVet, setBusquedaVet] = useState('');
    const [sugerenciasProd, setSugerenciasProd] = useState([]);
    const [mostrarProd, setMostrarProd] = useState(false);
    const [mostrarEstetica, setMostrarEstetica] = useState(false);
    const [mostrarVet, setMostrarVet] = useState(false);

    const [carrito, setCarrito] = useState([]);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [errorStock, setErrorStock] = useState(null);
    
    const wrapperRefProd = useRef(null);
    const wrapperRefEstetica = useRef(null);
    const wrapperRefVet = useRef(null);

    const serviciosEstetica = [
        { id: 'pelu_c', nombre: 'Baño y Corte', icon: faScissors },
        { id: 'baño_s', nombre: 'Solo Baño', icon: faPlusCircle },
        { id: 'uñas', nombre: 'Corte de Uñas', icon: faScissors },
        { id: 'spa', nombre: 'Spa Relajante', icon: faStar }
    ];

    const serviciosVet = [
        { id: 'cons', nombre: 'Consulta Médica', icon: faStethoscope },
        { id: 'vac', nombre: 'Vacunación', icon: faSyringe },
        { id: 'analisis', nombre: 'Análisis Clínico', icon: faMicroscope },
        { id: 'cirugia', nombre: 'Cirugía / Intervención', icon: faUserMd }
    ];

    useEffect(() => {
        cargarCaja();
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
            const res = await fetch('http://localhost:3001/api/caja');
            const data = await res.json();
            setVentas(Array.isArray(data) ? data : []);
        } catch (err) { console.error("Error cargando caja:", err); }
    };

    // ==========================================
    // 📄 FUNCIÓN: GENERAR TICKET DE VENTA
    // ==========================================
    const generarTicketPDF = (datosCarrito, total, metodo) => {
        const doc = new jsPDF({
            unit: 'mm',
            format: [80, 150 + (datosCarrito.length * 10)]
        });
        const center = 40;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("MALFI VETERINARIA", center, 10, { align: "center" });
        doc.setFontSize(8);
        doc.text("San Miguel de Tucumán", center, 15, { align: "center" });
        doc.text("---------------------------------------------------------", center, 23, { align: "center" });
        doc.setFontSize(9);
        doc.text(`Fecha: ${new Date().toLocaleString('es-AR')}`, 5, 28);
        doc.text(`Cajero: ${user?.nombre || 'General'}`, 5, 33);
        doc.text(`Metodo: ${metodo.toUpperCase()}`, 5, 38);
        doc.text("---------------------------------------------------------", center, 42, { align: "center" });
        let y = 53;
        datosCarrito.forEach(item => {
            doc.text(`${item.cantidad} x ${item.nombre.substring(0, 22)}`, 5, y);
            doc.text(`$${Number(item.subtotal).toLocaleString()}`, 75, y, { align: "right" });
            y += 6;
        });
        doc.text("---------------------------------------------------------", center, y, { align: "center" });
        y += 7;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 5, y);
        doc.text(`$${Number(total).toLocaleString()}`, 75, y, { align: "right" });
        doc.save(`Ticket_Malfi_${Date.now()}.pdf`);
    };

    // ==========================================
    // 💸 FUNCIÓN: GENERAR RECIBO DE SUELDO
    // ==========================================
    const generarReciboSueldoPDF = (datosVenta, total) => {
        const doc = new jsPDF({ unit: 'mm', format: 'a5' });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("RECIBO DE PAGO - MALFI VETERINARIA", 10, 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 25);
        doc.text(`Pagado por: ${user?.nombre || 'Administración'}`, 10, 30);
        doc.line(10, 35, 140, 35);
        doc.setFont("helvetica", "bold");
        doc.text("CONCEPTO DEL PAGO:", 10, 45);
        doc.setFont("helvetica", "normal");
        const concepto = datosVenta.map(i => `- ${i.nombre} (${i.cantidad} unidad/es)`).join('\n');
        doc.text(concepto, 10, 52);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL PAGADO: $ ${Number(total).toLocaleString()}`, 10, 80);
        doc.line(20, 110, 60, 110);
        doc.setFontSize(8);
        doc.text("Firma Empleado", 30, 115);
        doc.line(90, 110, 130, 110);
        doc.text("Sello Veterinaria", 100, 115);
        doc.save(`Recibo_Sueldo_Malfi_${Date.now()}.pdf`);
    };

    const exportarExcel = () => {
        const dataParaExcel = ventas.map(v => ({
            Fecha: v.fecha_formateada,
            Concepto: v.descripcion.replace(/\n/g, " | "),
            Medio: v.metodo_pago.toUpperCase(),
            Monto: Number(v.monto)
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataParaExcel);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
        XLSX.writeFile(workbook, `Reporte_Caja_Malfi_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Reporte de Caja - Malfi Veterinaria", 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [['Fecha', 'Concepto', 'Medio', 'Monto']],
            body: ventas.map(v => [v.fecha_formateada, v.descripcion.substring(0, 50), v.metodo_pago, `$${v.monto}`]),
            headStyles: { fillColor: [102, 51, 153] }
        });
        doc.save("Reporte_Caja_Malfi.pdf");
    };

    const handleEliminar = (id, e) => {
        e.stopPropagation();
        setVentaToDelete(id);
        setShowDeleteConfirm(true);
    };

    const confirmarEliminacion = async () => {
        if (!ventaToDelete) return;
        try {
            const res = await fetch(`http://localhost:3001/api/caja/${ventaToDelete}`, { method: 'DELETE' });
            if (res.ok) {
                cargarCaja();
            } else {
                alert("No se pudo anular la venta");
            }
        } catch (err) {
            console.error("Error al eliminar:", err);
            alert("Error al anular venta");
        } finally {
            setShowDeleteConfirm(false);
            setVentaToDelete(null);
        }
    };

    const prepararEdicion = (v, e) => {
        e.stopPropagation();
        setDatosEdicion(v);
        setMetodoPago(v.metodo_pago);
        setCarrito([{ idUnico: 'edit-1', nombre: v.descripcion, precio: v.monto, cantidad: 1, subtotal: v.monto, manual: true }]);
        setShowModal(true);
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (carrito.length === 0) {
            alert("El carrito está vacío");
            return;
        }
        const totalActual = totalVentaCarrito;
        const itemsActuales = [...carrito];
        const metodoActual = metodoPago;
        const descripcionFinal = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.subtotal})`).join('\n');

        try {
            const res = await fetch(datosEdicion ? `http://localhost:3001/api/caja/${datosEdicion.id}` : 'http://localhost:3001/api/caja', {
                method: datosEdicion ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tipo_operacion: 'ingreso', 
                    categoria: 'Venta Múltiple', 
                    descripcion: descripcionFinal,
                    monto: totalActual, 
                    metodo_pago: metodoActual, 
                    usuario_id: user?.id,
                    detalles: itemsActuales 
                })
            });

            if (res.ok) { 
                setLastSaleData({ carrito: itemsActuales, total: totalActual, metodo: metodoActual });
                setShowModal(false); 
                setCarrito([]); 
                cargarCaja(); 
                setShowTicketConfirm(true); 
            }
        } catch (err) { 
            alert("Error al guardar"); 
        }
    };

    const obtenerProductos = async (termino = '') => {
        setBusquedaProd(termino);
        try {
            const res = await fetch(`http://localhost:3001/api/productos/buscar?q=${termino}`);
            const data = await res.json();
            setSugerenciasProd(data);
            setMostrarProd(true);
        } catch (err) { console.error(err); }
    };

    const agregarAlCarrito = (item, tipo = 'producto') => {
        const idUnico = tipo !== 'producto' ? `${tipo}-${item.id}-${Date.now()}` : `prod-${item.id}`;
        const existe = carrito.find(i => i.idUnico === idUnico);
        if (existe && tipo === 'producto') {
            actualizarCantidad(idUnico, 1);
        } else {
            if (tipo === 'producto' && item.stock <= 0) return;
            setCarrito([...carrito, { 
                idUnico, 
                producto_id: tipo === 'producto' ? item.id : null, 
                nombre: item.nombre, 
                precio: Number(tipo === 'producto' ? item.precio_venta : 0), 
                cantidad: 1, 
                subtotal: Number(tipo === 'producto' ? item.precio_venta : 0), 
                stock_max: tipo === 'producto' ? item.stock : 999, 
                manual: tipo !== 'producto'
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

    const cambiarPrecioManual = (idUnico, valor) => {
        const precio = Number(valor) || 0;
        setCarrito(carrito.map(item => 
            item.idUnico === idUnico ? { ...item, precio, subtotal: precio * item.cantidad } : item
        ));
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
        <div className="container-fluid min-vh-100 p-4 text-dark position-relative" style={{ 
            backgroundImage: `url('https://i.pinimg.com/736x/ef/1f/af/ef1faf0a74cd6ef7768e445731e194eb.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            {/* Overlay sutil para mejorar el contraste sin tapar al gato */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.1)', zIndex: 0 }} />

            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        <FontAwesomeIcon icon={faCashRegister} className="me-2"/> Caja de Malfi
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel} title="Excel"><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF} title="PDF"><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-nueva-mascota rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setCarrito([]); setShowModal(true); }}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Operación
                        </button>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    {/* Tarjetas de resumen con Glassmorphism */}
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

                {/* Contenedor de la Tabla con Glassmorphism */}
                <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                    <table className="table table-hover mb-0" style={{ backgroundColor: 'transparent' }}>
                        <thead style={{ background: 'rgba(102, 51, 153, 0.1)' }}>
                            <tr><th className="ps-4">Fecha</th><th>Concepto</th><th>Medio</th><th className="text-end">Monto</th><th className="text-center">Acciones</th></tr>
                        </thead>
                        <tbody style={{ backgroundColor: 'transparent' }}>
                            {ventas.map(v => (
                                <tr key={v.id} onClick={() => setVentaSeleccionada(v)} style={{ cursor: 'pointer', backgroundColor: 'transparent' }}>
                                    <td className="ps-4 small text-muted">{v.fecha_formateada}</td>
                                    <td className="fw-bold small text-truncate" style={{maxWidth: '300px'}}>{v.descripcion}</td>
                                    <td><span className="badge bg-light text-dark border">{v.metodo_pago.toUpperCase()}</span></td>
                                    <td className="text-end fw-bold text-success">$ {Number(v.monto).toLocaleString('es-AR')}</td>
                                    <td className="text-center">
                                        <button className="btn btn-sm text-primary me-2" onClick={(e) => prepararEdicion(v, e)}><FontAwesomeIcon icon={faEdit} /></button>
                                        <button className="btn btn-sm text-danger" onClick={(e) => handleEliminar(v.id, e)}><FontAwesomeIcon icon={faTrash} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALES - No se modificó la lógica, solo se asegura que el z-index sea alto para que el gato no los tape */}
            {/* MODAL DETALLE DE VENTA */}
            {ventaSeleccionada && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 3000}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                            <h4 className="fw-bold text-primary mb-3">Detalle de Operación</h4>
                            <div className="bg-light p-3 rounded-3 mb-4" style={{whiteSpace: 'pre-wrap'}}>{ventaSeleccionada.descripcion}</div>
                            <button className="btn btn-secondary w-100 rounded-pill fw-bold" onClick={() => setVentaSeleccionada(null)}>VOLVER ATRÁS</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR VENTA */}
            {showModal && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)', zIndex: 2000}}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden text-dark">
                            <button type="button" className="btn-close position-absolute top-0 end-0 m-3" style={{zIndex:3001}} onClick={() => setShowModal(false)}></button>
                            <div className="row g-0">
                                <div className="col-md-6 p-4 bg-white" style={{maxHeight: '85vh', overflowY: 'auto'}}>
                                    <h4 className="fw-bold mb-4">{datosEdicion ? '📝 Editar Venta' : '🛒 Armar Venta'}</h4>
                                    <div className="mb-4 position-relative" ref={wrapperRefProd}>
                                        <label className="fw-bold small mb-2 text-primary">PRODUCTOS (STOCK)</label>
                                        <div className="input-group shadow-sm border-primary" onClick={() => obtenerProductos(busquedaProd)}>
                                            <span className="input-group-text bg-white border-primary text-primary"><FontAwesomeIcon icon={faBoxOpen} /></span>
                                            <input type="text" className="form-control border-primary shadow-none" placeholder="Buscar producto..." value={busquedaProd} onChange={(e) => obtenerProductos(e.target.value)} />
                                        </div>
                                        {mostrarProd && sugerenciasProd.length > 0 && (
                                            <div className="position-absolute w-100 shadow-lg border rounded-3 bg-white overflow-auto" style={{ zIndex: 1100, maxHeight: '200px' }}>
                                                {sugerenciasProd.map(p => (
                                                    <button key={p.id} disabled={p.stock <= 0} className="list-group-item list-group-item-action d-flex justify-content-between py-2 text-start" onClick={() => agregarAlCarrito(p)}>
                                                        <div><strong>{p.nombre}</strong><br/><small>Stock: {p.stock}</small></div>
                                                        <span className="badge bg-success">$ {p.precio_venta}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-4 position-relative" ref={wrapperRefVet}>
                                        <label className="fw-bold small mb-2 text-danger">VETERINARIA</label>
                                        <div className="input-group shadow-sm border-danger" onClick={() => setMostrarVet(!mostrarVet)}>
                                            <span className="input-group-text bg-white border-danger text-danger"><FontAwesomeIcon icon={faUserMd} /></span>
                                            <input type="text" className="form-control border-danger shadow-none" placeholder="Servicios..." value={busquedaVet} onChange={(e) => setBusquedaVet(e.target.value)} />
                                        </div>
                                        {mostrarVet && (
                                            <div className="position-absolute w-100 shadow-lg border rounded-3 bg-white overflow-auto" style={{ zIndex: 1100 }}>
                                                {serviciosVet.filter(s => s.nombre.toLowerCase().includes(busquedaVet.toLowerCase())).map(s => (
                                                    <button key={s.id} className="list-group-item list-group-item-action py-3" onClick={() => agregarAlCarrito(s, 'vet')}>{s.nombre}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mb-4 position-relative" ref={wrapperRefEstetica}>
                                        <label className="fw-bold small mb-2 text-info">ESTÉTICA</label>
                                        <div className="input-group shadow-sm border-info" onClick={() => setMostrarEstetica(!mostrarEstetica)}>
                                            <span className="input-group-text bg-white border-info text-info"><FontAwesomeIcon icon={faScissors} /></span>
                                            <input type="text" className="form-control border-info shadow-none" placeholder="Peluquería..." value={busquedaEstetica} onChange={(e) => setBusquedaEstetica(e.target.value)} />
                                        </div>
                                        {mostrarEstetica && (
                                            <div className="position-absolute w-100 shadow-lg border rounded-3 bg-white overflow-auto" style={{ zIndex: 1100 }}>
                                                {serviciosEstetica.filter(s => s.nombre.toLowerCase().includes(busquedaEstetica.toLowerCase())).map(s => (
                                                    <button key={s.id} className="list-group-item list-group-item-action py-3" onClick={() => agregarAlCarrito(s, 'estetica')}>{s.nombre}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-6 p-4 bg-light border-start">
                                    <h5 className="fw-bold mb-3 border-bottom pb-2">Resumen y Pago</h5>
                                    <div className="overflow-auto" style={{maxHeight: '320px'}}>
                                        {carrito.map(item => (
                                            <div key={item.idUnico} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                                <div className="small fw-bold" style={{width: '120px'}}>{item.nombre}</div>
                                                <div className="d-flex align-items-center">
                                                    <button type="button" className="btn btn-link text-danger p-0 shadow-none" onClick={() => actualizarCantidad(item.idUnico, -1)}><FontAwesomeIcon icon={faMinusCircle}/></button>
                                                    <span className="mx-2 fw-bold">{item.cantidad}</span>
                                                    <button type="button" className="btn btn-link text-success p-0 shadow-none" onClick={() => actualizarCantidad(item.idUnico, 1)}><FontAwesomeIcon icon={faPlusCircle}/></button>
                                                </div>
                                                {item.manual ? <input type="number" className="form-control form-control-sm text-end" style={{width: '80px'}} value={item.precio || ''} onChange={(e) => cambiarPrecioManual(item.idUnico, e.target.value)} placeholder="$ 0" /> : <span className="fw-bold text-success">$ {Number(item.subtotal).toLocaleString()}</span>}
                                                <button className="btn btn-sm text-muted" onClick={() => setCarrito(carrito.filter(i => i.idUnico !== item.idUnico))}><FontAwesomeIcon icon={faTrash} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-4 bg-white rounded-4 shadow-sm border-top border-5 border-primary">
                                        <div className="d-flex justify-content-between align-items-center mb-3"><span className="fw-bold text-muted small">TOTAL:</span><h2 className="fw-bold text-primary mb-0">$ {Number(totalVentaCarrito).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h2></div>
                                        <select className="form-select mb-4 rounded-pill shadow-sm" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option></select>
                                        <div className="d-flex gap-2"><button className="btn btn-light rounded-pill flex-grow-1 border fw-bold" onClick={() => setShowModal(false)}><FontAwesomeIcon icon={faArrowLeft} /> VOLVER</button><button className="btn btn-success rounded-pill flex-grow-1 fw-bold shadow py-2" onClick={handleGuardar}>{datosEdicion ? 'GUARDAR' : 'COBRAR'}</button></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE ÉXITO ESTÉTICO (RECIBO Y TICKET) */}
            {showTicketConfirm && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 5000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-5 shadow-lg overflow-hidden">
                            <div className="p-5 text-center bg-white">
                                <div className="mb-4">
                                    <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-4 mb-3">
                                        <FontAwesomeIcon icon={faCheckCircle} size="4x" className="text-success" />
                                    </div>
                                    <h2 className="fw-bold" style={{ color: '#663399' }}>¡Venta Exitosa!</h2>
                                    <p className="text-muted fs-5">La operación se registró correctamente.</p>
                                </div>
                                <div className="bg-light p-4 rounded-4 mb-4 border border-dashed" style={{ borderStyle: 'dashed' }}>
                                    <p className="mb-1 fw-bold text-muted small text-uppercase">Monto de la Operación</p>
                                    <h1 className="fw-black text-primary mb-0">$ {lastSaleData?.total.toLocaleString('es-AR')}</h1>
                                </div>
                                <div className="d-grid gap-3">
                                    <button className="btn btn-primary btn-lg rounded-pill fw-bold shadow py-3" style={{ backgroundColor: '#663399', border: 'none' }} onClick={() => { generarTicketPDF(lastSaleData.carrito, lastSaleData.total, lastSaleData.metodo); setShowTicketConfirm(false); }}><FontAwesomeIcon icon={faPrint} className="me-2" /> GENERAR TICKET CLIENTE</button>
                                    <button className="btn btn-info btn-lg rounded-pill fw-bold shadow py-3 text-white" onClick={() => { generarReciboSueldoPDF(lastSaleData.carrito, lastSaleData.total); setShowTicketConfirm(false); }}><FontAwesomeIcon icon={faSignature} className="me-2" /> RECIBO DE PAGO (PERSONAL)</button>
                                    <button className="btn btn-link text-muted fw-bold text-decoration-none" onClick={() => setShowTicketConfirm(false)}>Cerrar sin imprimir</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN */}
            {showDeleteConfirm && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 4000 }} onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-dialog modal-dialog-centered modal-md" onClick={e => e.stopPropagation()}>
                        <div className="modal-content border-0 rounded-4 shadow-lg">
                            <div className="modal-header border-0 pt-4 pb-2 px-4 d-flex justify-content-between align-items-center"><h5 className="modal-title fw-bold text-dark">Confirmar acción</h5><button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button></div>
                            <div className="modal-body text-center px-5 py-4"><p className="lead fw-bold mb-2">¿Estás seguro?</p><p className="text-danger fw-medium small mb-4">Anular venta • Esta acción no se puede deshacer</p><div className="d-grid gap-3 d-sm-flex justify-content-sm-center"><button className="btn btn-outline-secondary btn-lg rounded-pill px-5 fw-bold" onClick={() => setShowDeleteConfirm(false)}>Cancelar</button><button className="btn btn-danger btn-lg rounded-pill px-5 fw-bold shadow" onClick={confirmarEliminacion}>Confirmar</button></div></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CajaPage;