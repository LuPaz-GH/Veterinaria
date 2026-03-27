import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCalendarCheck, faPlus, faPencilAlt, faTrash, faSearch, 
    faStethoscope, faClock, faCalendarDay, faFilePdf, faFileExcel, 
    faPaw, faTimes, faInfoCircle, faUser, faNotesMedical, faTag, faWeightHanging, faClipboardList, faPrescriptionBottleMedical,
    faCheckCircle, faCalendarAlt, faPrint, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import api from '../services/api';

// Librerías de exportación
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TurnosPage = ({ user }) => {
    const [turnos, setTurnos] = useState([]);
    const [mascotas, setMascotas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    
    // Inicia en 'hoy' para enfoque directo
    const [filtroFecha, setFiltroFecha] = useState('hoy'); 
    const [fechaPersonalizada, setFechaPersonalizada] = useState('');
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const limite = 200; 

    const [showModal, setShowModal] = useState(false);
    const [showAtencion, setShowAtencion] = useState(false);
    const [showDetalle, setShowDetalle] = useState(false); 
    const [showSuccess, setShowSuccess] = useState(false);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

    const mostrarAviso = (mensaje, tipo = 'success') => {
        setNotificacion({ show: true, mensaje, tipo });
        setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 5000);
    };

    const [nuevoTurno, setNuevoTurno] = useState({
        mascota_id: '', 
        dueno_id: '', 
        fecha: '', 
        tipo: 'consulta', 
        motivo: ''
    });

    const [datosAtencion, setDatosAtencion] = useState({
        peso: '', unidad: 'kg', diagnostico: '', tratamiento: ''
    });

    const cargarDatos = async () => {
        // CORRECCIÓN: Si es personalizado y no hay fecha, limpiar y salir
        if (filtroFecha === 'personalizado' && !fechaPersonalizada) {
            setTurnos([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const hoy = new Date();
            const diaSem = hoy.getDay();
            const lunes = new Date(hoy);
            lunes.setDate(hoy.getDate() - (diaSem === 0 ? 6 : diaSem - 1));
            lunes.setHours(0,0,0,0);
            const domingo = new Date(lunes);
            domingo.setDate(lunes.getDate() + 6);
            domingo.setHours(23,59,59);

            let query = `?pagina=${pagina}&limite=${limite}&soloPendientes=true`;

            if (filtroFecha === 'hoy') {
                query += `&fecha=${hoy.toISOString().split('T')[0]}`;
            } else if (filtroFecha === 'semana') {
                query += `&fechaDesde=${lunes.toISOString().split('T')[0]}&fechaHasta=${domingo.toISOString().split('T')[0]}`;
            } else if (filtroFecha === 'personalizado' && fechaPersonalizada) {
                query += `&fecha=${fechaPersonalizada}`;
            }

            const ts = Date.now();
            const [resT, resM] = await Promise.all([
                api.get(`/turnos${query}&t=${ts}`),
                api.get(`/mascotas?t=${ts}`)
            ]);

            setTurnos(resT.data.data || []);
            setTotalPaginas(Math.ceil(resT.data.total / limite) || 1);
            setMascotas(Array.isArray(resM.data) ? resM.data : []);
        } catch (err) { 
            console.error("Error cargando datos:", err);
            mostrarAviso("Error al conectar con el servidor", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleCambioFiltro = (nuevoValor) => {
        setFiltroFecha(nuevoValor);
        setPagina(1);
        if (nuevoValor !== 'personalizado') setFechaPersonalizada('');
    };

    useEffect(() => { 
        cargarDatos(); 
    }, [pagina, filtroFecha, fechaPersonalizada]);

    // --- FILTRADO ESTRICTO Y ORDENAMIENTO ---
    const obtenerTurnosProcesados = () => {
        const hoy = new Date();
        hoy.setHours(0,0,0,0);
        const diaSem = hoy.getDay();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (diaSem === 0 ? 6 : diaSem - 1));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23,59,59);

        return turnos.filter(t => {
            const fechaT = new Date(t.fecha);
            const coincideBusqueda = (t.mascota_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                                     (t.dueno_nombre || '').toLowerCase().includes(busqueda.toLowerCase());
            
            if (!coincideBusqueda) return false;

            if (filtroFecha === 'hoy') {
                return fechaT.toISOString().split('T')[0] === hoy.toISOString().split('T')[0];
            } else if (filtroFecha === 'semana') {
                return fechaT >= lunes && fechaT <= domingo;
            } else if (filtroFecha === 'personalizado') {
                // Solo mostrar si coincide con la fecha elegida
                return fechaPersonalizada && t.fecha.split('T')[0] === fechaPersonalizada;
            }
            return true;
        }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    };

    const agruparPorFecha = (lista) => {
        const grupos = {};
        lista.forEach(t => {
            const fechaSolo = t.fecha.split('T')[0];
            if (!grupos[fechaSolo]) grupos[fechaSolo] = [];
            grupos[fechaSolo].push(t);
        });
        return grupos;
    };

    const turnosAgrupados = agruparPorFecha(obtenerTurnosProcesados());

    const formatearFechaTitulo = (fechaStr) => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        let pref = (fecha.getTime() === hoy.getTime()) ? "HOY - " : "";
        return `${pref}${dias[fecha.getDay()]} ${fecha.getDate()}/${fecha.getMonth() + 1}`;
    };

    // --- EXPORTAR TICKET ---
    const exportarTicketTurno = (t) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
        const img = new Image();
        img.src = '/logo.png'; 

        const generarPDF = (logo = null) => {
            doc.setFillColor(106, 17, 203); 
            doc.rect(0, 0, 80, 32, 'F');
            if (logo) doc.addImage(logo, 'PNG', 25, 2, 30, 18);
            doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
            doc.text("MALFI VETERINARIA", 40, 26, { align: "center" });
            doc.setTextColor(40); doc.setFontSize(11);
            doc.text("COMPROBANTE DE TURNO", 40, 42, { align: "center" });
            doc.setDrawColor(200); doc.line(10, 45, 70, 45);
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold"); doc.text("Paciente:", 10, 55);
            doc.setFont("helvetica", "normal"); doc.text(String(t.mascota_nombre), 32, 55);
            doc.setFont("helvetica", "bold"); doc.text("Dueño:", 10, 63);
            doc.setFont("helvetica", "normal"); doc.text(String(t.dueno_nombre), 32, 63);
            doc.setFont("helvetica", "bold"); doc.text("Teléfono:", 10, 71);
            doc.setFont("helvetica", "normal"); doc.text(String(t.dueno_telefono || 'No reg.'), 32, 71);
            doc.setFont("helvetica", "bold"); doc.text("Fecha:", 10, 79);
            doc.setFont("helvetica", "normal"); doc.text(new Date(t.fecha).toLocaleDateString('es-AR'), 32, 79);
            doc.setFont("helvetica", "bold"); doc.text("Hora:", 10, 87);
            doc.setFont("helvetica", "normal"); doc.text(new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " hs", 32, 87);
            doc.setFont("helvetica", "bold"); doc.text("Tipo:", 10, 95);
            doc.setFont("helvetica", "normal"); doc.text(t.tipo.toUpperCase(), 32, 95);
            doc.setTextColor(120); doc.setFontSize(8);
            doc.text("-----------------------------------------------", 40, 130, { align: "center" });
            doc.setFont("helvetica", "bold");
            doc.text("¡Gracias por confiar en Malfi!", 40, 135, { align: "center" });
            doc.save(`Turno_${t.mascota_nombre}.pdf`);
        };
        img.onload = () => generarPDF(img);
        img.onerror = () => generarPDF(null);
    };

    const guardarTurno = async (e) => {
        e.preventDefault();
        try {
            const url = datosEdicion ? `/turnos/${datosEdicion.id}` : '/turnos';
            await api({ url, method: datosEdicion ? 'PUT' : 'POST', data: nuevoTurno });
            setShowModal(false); setDatosEdicion(null);
            cargarDatos();
            mostrarAviso("Turno guardado");
        } catch (err) { mostrarAviso("Error al guardar", "error"); }
    };

    const handleConfirmarEliminar = async () => {
        try {
            await api.delete(`/turnos/${idToDelete}`);
            setShowConfirm(false); setIdToDelete(null);
            cargarDatos();
            mostrarAviso("Turno eliminado");
        } catch (err) { mostrarAviso("Error", "error"); }
    };

    const finalizarAtencion = async (e) => {
        e.preventDefault();
        const pesoFinal = `${datosAtencion.peso} ${datosAtencion.unidad}`;
        try {
            await api.post(`/turnos/${turnoSeleccionado.id}/atender`, { 
                ...datosAtencion, peso: pesoFinal, veterinario_id: user.id, mascota_id: turnoSeleccionado.mascota_id 
            });
            setShowAtencion(false);
            setDatosAtencion({ peso: '', unidad: 'kg', diagnostico: '', tratamiento: '' });
            cargarDatos();
            setShowSuccess(true);
        } catch (err) { mostrarAviso("Error al guardar atención", "error"); }
    };

    const prepararEdicion = (t) => {
        setDatosEdicion(t);
        setNuevoTurno({
            mascota_id: t.mascota_id,
            dueno_id: t.dueno_id,
            fecha: t.fecha.substring(0, 16),
            tipo: t.tipo,
            motivo: t.motivo || ''
        });
        setShowModal(true);
    };

    return (
        <div className="min-vh-100 p-4 p-md-5" style={{ backgroundImage: `url('https://i.pinimg.com/1200x/0f/72/c3/0f72c33debe887dd051042d7642024b0.jpg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
            <div className="position-relative z-1">
                <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        <FontAwesomeIcon icon={faCalendarCheck} className="me-3" /> Agenda Veterinaria
                    </h1>
                    <button className="btn btn-primary rounded-pill px-4 fw-bold shadow" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>
                        <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
                    </button>
                </header>

                <div className="mb-5 d-flex gap-3 align-items-center flex-wrap">
                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white w-auto" style={{minWidth: '350px'}}>
                        <span className="input-group-text bg-transparent border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-success" /></span>
                        <input type="text" className="form-control border-0 py-2" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                    <select value={filtroFecha} onChange={(e) => handleCambioFiltro(e.target.value)} className="form-select rounded-pill w-auto shadow-sm">
                        <option value="hoy">Hoy</option>
                        <option value="semana">Esta semana</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                    {/* CALENDARIO RECUPERADO */}
                    {filtroFecha === 'personalizado' && (
                        <input type="date" value={fechaPersonalizada} onChange={(e) => { setFechaPersonalizada(e.target.value); setPagina(1); }} className="form-control rounded-pill shadow-sm w-auto" />
                    )}
                </div>

                {loading ? <div className="text-center text-white py-5"><FontAwesomeIcon icon={faSpinner} spin size="3x" /></div> : (
                    (filtroFecha === 'personalizado' && !fechaPersonalizada) ? (
                        <div className="text-center text-white py-5"><h3>Elegí una fecha para ver los turnos</h3></div>
                    ) : Object.keys(turnosAgrupados).length === 0 ? (
                        <div className="text-center text-white py-5"><h3>No hay turnos registrados</h3></div>
                    ) : (
                        Object.keys(turnosAgrupados).map(fecha => (
                            <div key={fecha} className="mb-5">
                                <div className="d-flex align-items-center mb-4">
                                    <h4 className="text-white fw-bold m-0 p-2 px-4 rounded-pill shadow-sm" style={{ background: 'rgba(106, 17, 203, 0.9)', backdropFilter: 'blur(5px)' }}>
                                        <FontAwesomeIcon icon={faCalendarDay} className="me-2" /> {formatearFechaTitulo(fecha)}
                                    </h4>
                                    <div className="flex-grow-1 ms-3 border-bottom border-white border-2 opacity-25"></div>
                                </div>
                                <div className="row g-4">
                                    {turnosAgrupados[fecha].map(t => (
                                        <div className="col-md-6 col-lg-3" key={t.id}>
                                            <div className="card border-0 shadow-lg p-3 rounded-4 transition-card" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h5 className="fw-bold text-primary mb-0">{t.mascota_nombre}</h5>
                                                    <span className="badge bg-info text-dark shadow-sm">{t.tipo.toUpperCase()}</span>
                                                </div>
                                                <hr className="my-2 opacity-25" />
                                                <p className="small mb-1"><FontAwesomeIcon icon={faUser} className="me-2 text-muted" /> {t.dueno_nombre}</p>
                                                <p className="small mb-3"><FontAwesomeIcon icon={faClock} className="me-2 text-muted" /> {new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</p>
                                                <div className="d-flex gap-2">
                                                    {t.estado === 'pendiente' && <button className="btn btn-success btn-sm rounded-pill flex-grow-1 fw-bold shadow-sm" onClick={() => { setTurnoSeleccionado(t); setShowAtencion(true); }}>ATENDER</button>}
                                                    <button className="btn btn-outline-danger btn-sm rounded-circle border shadow-sm" onClick={() => exportarTicketTurno(t)}><FontAwesomeIcon icon={faPrint} /></button>
                                                    <button className="btn btn-white btn-sm rounded-circle border shadow-sm" onClick={() => prepararEdicion(t)}><FontAwesomeIcon icon={faPencilAlt} className="text-primary" /></button>
                                                    <button className="btn btn-white btn-sm rounded-circle border shadow-sm" onClick={() => { setIdToDelete(t.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} className="text-danger" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* MODALES ... */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <form className="modal-content rounded-4 p-4 shadow-lg border-0" onSubmit={guardarTurno}>
                            <h4 className="fw-bold mb-4 text-primary">{datosEdicion ? '📝 Editar Turno' : '📅 Nuevo Turno'}</h4>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Mascota *</label>
                                <select className="form-select rounded-pill" value={nuevoTurno.mascota_id} onChange={(e) => {
                                    const m = mascotas.find(mas => mas.id == e.target.value);
                                    if(m) setNuevoTurno({...nuevoTurno, mascota_id: e.target.value, dueno_id: m.dueno_id});
                                }} required>
                                    <option value="">Seleccioná...</option>
                                    {mascotas.map(m => (<option key={m.id} value={m.id}>{m.nombre} (Dueño: {m.dueno_nombre})</option>))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Fecha y Hora *</label>
                                <input type="datetime-local" className="form-control rounded-pill" value={nuevoTurno.fecha} onChange={(e) => setNuevoTurno({...nuevoTurno, fecha: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Tipo *</label>
                                <select className="form-select rounded-pill" value={nuevoTurno.tipo} onChange={(e) => setNuevoTurno({...nuevoTurno, tipo: e.target.value})} required>
                                    <option value="consulta">Consulta Médica</option>
                                    <option value="vacunacion">Vacunación</option>
                                    <option value="cirugia">Cirugía</option>
                                </select>
                            </div>
                            <div className="d-flex gap-2 mt-4">
                                <button type="button" className="btn btn-light w-100 rounded-pill" onClick={() => setShowModal(false)}>Cerrar</button>
                                <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold shadow">GUARDAR</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAtencion && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <form className="modal-content rounded-4 overflow-hidden border-0" onSubmit={finalizarAtencion}>
                            <div className="modal-header bg-success text-white p-4">
                                <h4 className="fw-bold mb-0">Atender: {turnoSeleccionado?.mascota_nombre}</h4>
                            </div>
                            <div className="modal-body p-4 bg-light">
                                <div className="row g-4">
                                    <div className="col-md-5">
                                        <div className="bg-white p-3 rounded-4 shadow-sm h-100">
                                            <label className="fw-bold mb-2 small text-success">PESO *</label>
                                            <div className="input-group">
                                                <input type="number" step="0.01" className="form-control" value={datosAtencion.peso} onChange={(e) => setDatosAtencion({...datosAtencion, peso: e.target.value})} required />
                                                <select className="form-select" style={{ maxWidth: '80px' }} value={datosAtencion.unidad} onChange={(e) => setDatosAtencion({...datosAtencion, unidad: e.target.value})}>
                                                    <option value="kg">kg</option>
                                                    <option value="gr">gr</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-7">
                                        <div className="bg-white p-3 rounded-4 shadow-sm">
                                            <label className="fw-bold mb-2 small text-success">DIAGNÓSTICO *</label>
                                            <textarea className="form-control border-0 bg-light" rows="3" value={datosAtencion.diagnostico} onChange={(e) => setDatosAtencion({...datosAtencion, diagnostico: e.target.value})} required></textarea>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="bg-white p-3 rounded-4 shadow-sm">
                                            <label className="fw-bold mb-2 small text-success">TRATAMIENTO *</label>
                                            <textarea className="form-control border-0 bg-light" rows="3" value={datosAtencion.tratamiento} onChange={(e) => setDatosAtencion({...datosAtencion, tratamiento: e.target.value})} required></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer p-4 border-0">
                                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowAtencion(false)}>CANCELAR</button>
                                <button type="submit" className="btn btn-success flex-grow-1 rounded-pill fw-bold" disabled={!datosAtencion.peso || !datosAtencion.diagnostico.trim() || !datosAtencion.tratamiento.trim()}>GUARDAR ATENCIÓN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div className="modal-content border-0 rounded-5 text-center p-5 position-relative">
                            <div className="position-absolute start-50 translate-middle bg-white rounded-circle shadow p-2" style={{ top: '0' }}><FontAwesomeIcon icon={faCheckCircle} size="4x" color="#2ecc71" /></div>
                            <div className="mt-4"><h2 className="fw-bold mb-3">¡Éxito!</h2><p className="text-muted fs-5">Atención guardada correctamente.</p><button className="btn w-100 rounded-pill py-3 fw-bold text-white mt-2" style={{ backgroundColor: '#7D3C4A' }} onClick={() => setShowSuccess(false)}>Hecho</button></div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleConfirmarEliminar} title="¿Eliminar Turno?" message="Esta acción es definitiva." />
        </div>
    );
};

export default TurnosPage;