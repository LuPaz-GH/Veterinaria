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

    // Lista completa sincronizada con EsteticaPage.jsx (Opción B)
    const opcionesServiciosEstetica = [
        "Baño y Corte Completo",
        "Solo Baño",
        "Corte de Uñas",
        "Limpieza de Oídos y Glándulas",
        "Deslanado (Shedding)",
        "Baño Medicado / Antiparasitario",
        "Corte de Raza (Show Grooming)",
        "Hidratación de Manto",
        "Recorte Sanitario",
        "Spa Relajante"
    ];

    // Convertimos a formato compatible con agregarAlCarrito
    const serviciosEstetica = opcionesServiciosEstetica.map(nombre => ({
        id: nombre.toLowerCase().replace(/[^a-z0-9]/gi, '_'), // id limpio y único
        nombre,
        icon: faScissors  // ícono por defecto (puedes cambiarlo por servicio si quieres)
    }));

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
            const res = await api.get('/caja');
            setVentas(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Error cargando caja:", err);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
    };

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
            const res = await api.delete(`/caja/${ventaToDelete}`);
            if (res.status === 200 || res.status === 204) {
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

        for (const item of carrito) {
            if (item.producto_id && item.cantidad > item.stock_max) {
                alert(`No hay suficiente stock de "${item.nombre}". Stock disponible: ${item.stock_max}`);
                return;
            }
        }

        try {
            for (const item of carrito) {
                if (item.producto_id) {
                    const res = await api.put(`/productos/${item.producto_id}/stock`, { cantidad: -item.cantidad });
                    if (res.status !== 200) {
                        const err = res.data;
                        throw new Error(err.detalle || 'Error al actualizar stock');
                    }
                }
            }
        } catch (err) {
            console.error('Error al restar stock:', err);
            setErrorStock(err.message);
            alert(`Error al actualizar stock: ${err.message}\nLa venta NO se registró.`);
            return;
        }

        const totalActual = totalVentaCarrito;
        const itemsActuales = [...carrito];
        const metodoActual = metodoPago;
        const descripcionFinal = carrito.map(i => `${i.cantidad}x ${i.nombre} ($${i.subtotal})`).join('\n');

        try {
            const res = await api({
                url: datosEdicion ? `/caja/${datosEdicion.id}` : '/caja',
                method: datosEdicion ? 'PUT' : 'POST',
                data: { 
                    tipo_operacion: 'ingreso', 
                    categoria: 'Venta Múltiple', 
                    descripcion: descripcionFinal,
                    monto: totalActual, 
                    metodo_pago: metodoActual, 
                    usuario_id: user?.id,
                    detalles: itemsActuales 
                }
            });

            if (res.status === 200 || res.status === 201) { 
                setLastSaleData({ carrito: itemsActuales, total: totalActual, metodo: metodoActual });
                setShowModal(false); 
                setCarrito([]); 
                cargarCaja(); 
                setShowTicketConfirm(true); 
                setErrorStock(null);
            } else {
                throw new Error('Error al registrar la venta');
            }
        } catch (err) { 
            console.error("Error al guardar venta:", err);
            alert("Error al guardar la venta. El stock ya fue modificado, contacta al administrador.");
        }
    };

    const obtenerProductos = async (termino = '') => {
        setBusquedaProd(termino);
        try {
            const res = await api.get(`/productos/buscar?q=${encodeURIComponent(termino)}`);
            setSugerenciasProd(Array.isArray(res.data) ? res.data : []);
            setMostrarProd(true);
        } catch (err) {
            console.error('[ERROR] Falló productos:', err);
            setSugerenciasProd([]);
            setMostrarProd(true);
        }
    };

    const agregarAlCarrito = (item, tipo = 'producto') => {
        if (tipo === 'producto' && item.stock <= 0) {
            alert(`El producto "${item.nombre}" no tiene stock disponible.`);
            return;
        }
        const idUnico = tipo !== 'producto' ? `${tipo}-${item.id}-${Date.now()}` : `prod-${item.id}`;
        const existe = carrito.find(i => i.idUnico === idUnico);
        if (existe && tipo === 'producto') {
            const nuevaCant = existe.cantidad + 1;
            if (nuevaCant > item.stock) {
                alert(`No hay suficiente stock de "${item.nombre}". Máximo: ${item.stock}`);
                return;
            }
            actualizarCantidad(idUnico, 1);
        } else {
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
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.1)', zIndex: 0 }} />

            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        <FontAwesomeIcon icon={faCashRegister} className="me-2"/> Caja de Malfi
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-nueva-mascota rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setCarrito([]); setShowModal(true); }}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Operación
                        </button>
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
                    <table className="table table-hover mb-0">
                        <thead style={{ background: 'rgba(102, 51, 153, 0.1)' }}>
                            <tr><th className="ps-4">Fecha</th><th>Concepto</th><th>Medio</th><th className="text-end">Monto</th><th className="text-center">Acciones</th></tr>
                        </thead>
                        <tbody>
                            {ventas.map(v => (
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
                </div>
            </div>

            {/* MODALES */}
            {ventaSeleccionada && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.7)', zIndex: 3000}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                            <h4 className="fw-bold text-primary mb-3">Detalle</h4>
                            <div className="bg-light p-3 rounded-3 mb-4" style={{whiteSpace: 'pre-wrap'}}>{ventaSeleccionada.descripcion}</div>
                            <button className="btn btn-secondary w-100 rounded-pill fw-bold" onClick={() => setVentaSeleccionada(null)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ARMAR VENTA - DISEÑO OPTIMIZADO */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered" style={{ maxWidth: '950px' }}>
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden text-dark" style={{ height: '85vh' }}>
                            
                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-white">
                                <h5 className="fw-bold mb-0 text-primary">
                                    {datosEdicion ? '📝 Editar Venta' : <><FontAwesomeIcon icon={faCartPlus} className="me-2" /> Armar Venta</>}
                                </h5>
                                <button type="button" className="btn-close shadow-none" onClick={() => setShowModal(false)}></button>
                            </div>

                            <div className="row g-0 h-100 overflow-hidden">
                                <div className="col-md-7 p-4 bg-white overflow-auto h-100">
                                    {/* BÚSQUEDA PRODUCTOS */}
                                    <div className="mb-4 position-relative" ref={wrapperRefProd}>
                                        <label className="fw-bold small mb-2 text-muted">PRODUCTOS EN STOCK</label>
                                        <div className="input-group input-group-sm mb-1">
                                            <span className="input-group-text bg-light border-end-0 text-primary"><FontAwesomeIcon icon={faSearch} /></span>
                                            <input 
                                                type="text" className="form-control bg-light border-start-0 shadow-none" 
                                                placeholder="Escribe para buscar..." value={busquedaProd} 
                                                onChange={(e) => obtenerProductos(e.target.value)}
                                                onFocus={() => { if (busquedaProd.trim() === '') obtenerProductos(''); setMostrarProd(true); }}
                                            />
                                        </div>
                                        {mostrarProd && (
                                            <div className="position-absolute w-100 shadow-lg border-0 rounded-3 bg-white overflow-auto" style={{ zIndex: 1100, maxHeight: '250px', marginTop: '5px' }}>
                                                {sugerenciasProd.map(p => (
                                                    <button key={p.id} disabled={p.stock <= 0} className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2 px-3 border-0 ${p.stock <= 0 ? 'opacity-50 bg-light' : ''}`} onClick={() => { agregarAlCarrito(p); setMostrarProd(false); setBusquedaProd(''); }}>
                                                        <div className="text-start"><div className="fw-bold small">{p.nombre}</div><small className="text-muted">Stock: {p.stock}</small></div>
                                                        <span className="badge rounded-pill bg-primary-subtle text-primary">$ {p.precio_venta}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* SERVICIOS GRID */}
                                    <div className="row g-3">
                                        <div className="col-6" ref={wrapperRefVet}>
                                            <label className="fw-bold small mb-2 text-muted">VETERINARIA</label>
                                            <button className="btn btn-outline-danger btn-sm w-100 d-flex justify-content-between align-items-center" onClick={() => setMostrarVet(!mostrarVet)}>
                                                <span><FontAwesomeIcon icon={faUserMd} className="me-2"/> Servicios</span><FontAwesomeIcon icon={faChevronDown} />
                                            </button>
                                            {mostrarVet && (
                                                <div className="position-absolute shadow-lg border rounded-3 bg-white overflow-auto" style={{ zIndex: 1100, width: '220px' }}>
                                                    {serviciosVet.map(s => <button key={s.id} className="list-group-item list-group-item-action py-2 px-3 small border-0" onClick={() => { agregarAlCarrito(s, 'vet'); setMostrarVet(false); }}>{s.nombre}</button>)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-6" ref={wrapperRefEstetica}>
                                            <label className="fw-bold small mb-2 text-muted">ESTÉTICA</label>
                                            <button className="btn btn-outline-info btn-sm w-100 d-flex justify-content-between align-items-center" onClick={() => setMostrarEstetica(!mostrarEstetica)}>
                                                <span><FontAwesomeIcon icon={faScissors} className="me-2"/> Peluquería</span><FontAwesomeIcon icon={faChevronDown} />
                                            </button>
                                            {mostrarEstetica && (
                                                <div className="position-absolute shadow-lg border rounded-3 bg-white overflow-auto" style={{ zIndex: 1100, width: '220px' }}>
                                                    {serviciosEstetica.map(s => <button key={s.id} className="list-group-item list-group-item-action py-2 px-3 small border-0" onClick={() => { agregarAlCarrito(s, 'estetica'); setMostrarEstetica(false); }}>{s.nombre}</button>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-md-5 p-4 bg-light h-100 d-flex flex-column border-start">
                                    <h6 className="fw-bold mb-3 border-bottom pb-2">Resumen de Pago</h6>
                                    <div className="flex-grow-1 overflow-auto mb-3">
                                        {carrito.map(item => (
                                            <div key={item.idUnico} className="card border-0 shadow-sm mb-2 p-2 rounded-3">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div style={{ flex: 1 }}>
                                                        <div className="fw-bold small text-truncate" style={{ maxWidth: '120px' }}>{item.nombre}</div>
                                                        {item.manual ? <input type="number" className="form-control form-control-sm border-0 bg-light p-1 mt-1" style={{ width: '80px', fontSize: '11px' }} onChange={(e) => cambiarPrecioManual(item.idUnico, e.target.value)} /> : <div className="text-muted" style={{fontSize: '10px'}}>$ {item.precio} c/u</div>}
                                                    </div>
                                                    <div className="d-flex align-items-center gap-1">
                                                        <button className="btn btn-sm btn-light p-1" onClick={() => actualizarCantidad(item.idUnico, -1)}><FontAwesomeIcon icon={faMinusCircle}/></button>
                                                        <span className="fw-bold small mx-1">{item.cantidad}</span>
                                                        <button className="btn btn-sm btn-light p-1" onClick={() => actualizarCantidad(item.idUnico, 1)}><FontAwesomeIcon icon={faPlusCircle}/></button>
                                                        <button className="btn btn-sm text-danger" onClick={() => setCarrito(carrito.filter(i => i.idUnico !== item.idUnico))}><FontAwesomeIcon icon={faTrash}/></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white p-3 rounded-4 shadow-sm">
                                        <div className="d-flex justify-content-between mb-3"><span className="fw-bold text-muted small">TOTAL:</span><h4 className="fw-bold text-primary mb-0">$ {totalVentaCarrito.toLocaleString('es-AR')}</h4></div>
                                        <select className="form-select form-select-sm mb-3 rounded-pill" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                                            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option>
                                        </select>
                                        <button className="btn btn-success w-100 rounded-pill py-2 fw-bold shadow-sm" disabled={carrito.length === 0} onClick={handleGuardar}>COBRAR</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showTicketConfirm && (
                <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.8)', zIndex: 4000}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 p-4 text-center">
                            <FontAwesomeIcon icon={faCheckCircle} className="text-success mb-3" size="4x" />
                            <h3 className="fw-bold mb-4">Venta Registrada</h3>
                            <div className="d-flex gap-2">
                                <button className="btn btn-primary w-100 rounded-pill fw-bold" onClick={() => { generarTicketPDF(lastSaleData.carrito, lastSaleData.total, lastSaleData.metodo); setShowTicketConfirm(false); }}>IMPRIMIR TICKET</button>
                                <button className="btn btn-outline-secondary w-100 rounded-pill fw-bold" onClick={() => setShowTicketConfirm(false)}>CERRAR</button>
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
                            <p className="fw-bold">¿Anular esta operación?</p>
                            <div className="d-flex gap-2">
                                <button className="btn btn-danger w-100 rounded-pill" onClick={confirmarEliminacion}>SÍ, ANULAR</button>
                                <button className="btn btn-light w-100 rounded-pill" onClick={() => setShowDeleteConfirm(false)}>NO</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CajaPage;