import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCalendarCheck, faPlus, faPencilAlt, faTrash, faSearch, 
    faStethoscope, faClock, faCalendarDay, faFilePdf, faFileExcel, 
    faPaw, faTimes, faInfoCircle, faUser, faNotesMedical, faTag, faWeightHanging, faClipboardList, faPrescriptionBottleMedical,
    faCheckCircle, faCalendarAlt, faPrint, faSpinner, faTrashRestore,
    faChevronLeft, faChevronRight, faHistory, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import api from '../services/api';

// Librerías de exportación
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TurnosPage = ({ user }) => {
    const [turnos, setTurnos] = useState([]);
    const [turnosEliminados, setTurnosEliminados] = useState([]);
    const [busquedaPapelera, setBusquedaPapelera] = useState(''); // ← NUEVO: Buscador papelera
    const [mascotas, setMascotas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    
    const [showPapelera, setShowPapelera] = useState(false);
    const [filtroFecha, setFiltroFecha] = useState('hoy'); 
    const [fechaPersonalizada, setFechaPersonalizada] = useState('');
    
    // ESTADOS DE PAGINACIÓN
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const limite = 12;

    const [showModal, setShowModal] = useState(false);
    const [showAtencion, setShowAtencion] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    // ESTADOS PARA BORRADO PERMANENTE
    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);

    const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

    const mostrarAviso = (mensaje, tipo = 'success') => {
        setNotificacion({ show: true, mensaje, tipo });
        setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 5000);
    };

    const [nuevoTurno, setNuevoTurno] = useState({
        mascota_id: '', dueno_id: '', fecha: '', tipo: 'consulta', motivo: ''
    });

    const [datosAtencion, setDatosAtencion] = useState({
        peso: '', unidad: 'kg', diagnostico: '', tratamiento: ''
    });

    const cargarDatos = async () => {
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
            setTotalPaginas(resT.data.totalPaginas || 1);
            setMascotas(Array.isArray(resM.data) ? resM.data : []);
        } catch (err) { 
            mostrarAviso("Error al conectar con el servidor", "error");
        } finally {
            setLoading(false);
        }
    };

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/turnos/papelera');
            setTurnosEliminados(res.data || []);
        } catch (err) {
            console.error("Error al cargar papelera");
        }
    };

    const restaurarTurno = async (id) => {
        try {
            await api.put(`/turnos/restaurar/${id}`);
            mostrarAviso("✅ Turno restaurado con éxito");
            cargarPapelera();
            cargarDatos();
        } catch (err) {
            mostrarAviso("❌ Error al restaurar el turno", "error");
        }
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            await api.delete(`/turnos/papelera/${idToPermanentDelete}`);
            mostrarAviso("🗑️ Registro eliminado definitivamente");
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
            cargarPapelera();
        } catch (err) {
            mostrarAviso("❌ Error al eliminar el registro", "error");
        }
    };

    useEffect(() => { 
        cargarDatos(); 
    }, [pagina, filtroFecha, fechaPersonalizada]);

    useEffect(() => {
        if (showPapelera) cargarPapelera();
    }, [showPapelera]);

    const handleCambioFiltro = (nuevoValor) => {
        setFiltroFecha(nuevoValor);
        setPagina(1);
        if (nuevoValor !== 'personalizado') setFechaPersonalizada('');
    };

    const obtenerTurnosProcesados = () => {
        return turnos.filter(t => {
            const coincideBusqueda = (t.mascota_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                                     (t.dueno_nombre || '').toLowerCase().includes(busqueda.toLowerCase());
            return coincideBusqueda;
        }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    };

    // FILTRO PARA EL BUSCADOR DE LA PAPELERA
    const obtenerPapeleraFiltrada = () => {
        return turnosEliminados.filter(t => 
            (t.mascota_nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase()) ||
            (t.dueno_nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase())
        );
    };

    const turnosAgrupados = (lista) => {
        const grupos = {};
        lista.forEach(t => {
            const fechaSolo = t.fecha.split('T')[0];
            if (!grupos[fechaSolo]) grupos[fechaSolo] = [];
            grupos[fechaSolo].push(t);
        });
        return grupos;
    };

    const turnosParaMostrar = turnosAgrupados(obtenerTurnosProcesados());

    const exportarExcel = () => {
        const dataParaExcel = obtenerTurnosProcesados().map(t => ({
            Fecha: new Date(t.fecha).toLocaleDateString(),
            Hora: new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            Mascota: t.mascota_nombre,
            Dueño: t.dueno_nombre,
            Tipo: t.tipo.toUpperCase(),
            Motivo: t.motivo || ''
        }));
        const ws = XLSX.utils.json_to_sheet(dataParaExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        XLSX.writeFile(wb, `Agenda_Turnos_${filtroFecha}.xlsx`);
    };

    const exportarPDFGeneral = () => {
        const doc = new jsPDF();
        doc.text(`Reporte de Agenda - ${filtroFecha.toUpperCase()}`, 14, 15);
        const columns = ["Fecha", "Hora", "Mascota", "Dueño", "Tipo"];
        const rows = obtenerTurnosProcesados().map(t => [
            new Date(t.fecha).toLocaleDateString(),
            new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            t.mascota_nombre,
            t.dueno_nombre,
            t.tipo.toUpperCase()
        ]);
        autoTable(doc, { head: [columns], body: rows, startY: 20, theme: 'striped' });
        doc.save(`Agenda_Turnos_${filtroFecha}.pdf`);
    };

    const formatearFechaTitulo = (fechaStr) => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        let pref = (fecha.getTime() === hoy.getTime()) ? "HOY - " : "";
        return `${pref}${dias[fecha.getDay()]} ${fecha.getDate()}/${fecha.getMonth() + 1}`;
    };

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
        if (!idToDelete) return;
        try {
            await api.delete(`/turnos/${idToDelete}`);
            setShowConfirm(false); setIdToDelete(null);
            await cargarDatos(); 
            mostrarAviso("✅ Turno movido a la papelera", "success");
        } catch (err) { mostrarAviso("❌ Error al mover a la papelera", "error"); }
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
            mascota_id: t.mascota_id, dueno_id: t.dueno_id,
            fecha: t.fecha.substring(0, 16), tipo: t.tipo, motivo: t.motivo || ''
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
                    <div className="d-flex gap-2 align-items-center">
                        <button className="btn btn-danger rounded-pill px-3 fw-bold shadow-sm" onClick={exportarPDFGeneral}>
                            <FontAwesomeIcon icon={faFilePdf} className="me-1" /> PDF
                        </button>
                        <button className="btn btn-success rounded-pill px-3 fw-bold shadow-sm" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} className="me-1" /> EXCEL
                        </button>
                        
                        <button 
                            className="btn rounded-pill px-4 fw-bold shadow-lg text-white" 
                            onClick={() => setShowPapelera(true)}
                            style={{
                                backgroundColor: '#e74c3c', 
                                border: '2px solid rgba(255,255,255,0.4)',
                                transition: 'all 0.3s ease',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e74c3c'}
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            <span>Papelera</span>
                        </button>
                        
                        <button className="btn btn-primary rounded-pill px-4 fw-bold shadow" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
                        </button>
                    </div>
                </header>

                <div className="mb-5 d-flex gap-3 align-items-center flex-wrap">
                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white w-auto" style={{minWidth: '350px'}}>
                        <span className="input-group-text bg-transparent border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-success" /></span>
                        <input type="text" className="form-control border-0 py-2" placeholder="Buscar..." value={busqueda} onChange={(e) => {setBusqueda(e.target.value); setPagina(1);}} />
                    </div>
                    <select value={filtroFecha} onChange={(e) => handleCambioFiltro(e.target.value)} className="form-select rounded-pill w-auto shadow-sm">
                        <option value="hoy">Hoy</option>
                        <option value="semana">Esta semana</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>

                {loading ? <div className="text-center text-white py-5"><FontAwesomeIcon icon={faSpinner} spin size="3x" /></div> : (
                    Object.keys(turnosParaMostrar).length === 0 ? (
                        <div className="text-center text-white py-5"><h3>No hay turnos registrados</h3></div>
                    ) : (
                        <>
                            {Object.keys(turnosParaMostrar).map(fecha => (
                                <div key={fecha} className="mb-5">
                                    <div className="d-flex align-items-center mb-4">
                                        <h4 className="text-white fw-bold m-0 p-2 px-4 rounded-pill shadow-sm" style={{ background: 'rgba(106, 17, 203, 0.9)', backdropFilter: 'blur(5px)' }}>
                                            <FontAwesomeIcon icon={faCalendarDay} className="me-2" /> {formatearFechaTitulo(fecha)}
                                        </h4>
                                        <div className="flex-grow-1 ms-3 border-bottom border-white border-2 opacity-25"></div>
                                    </div>
                                    <div className="row g-4">
                                        {turnosParaMostrar[fecha].map(t => (
                                            <div className="col-md-6 col-lg-3" key={t.id}>
                                                <div className="card border-0 shadow-lg p-3 rounded-4" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
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
                            ))}

                            {/* CONTROLES DE PAGINACIÓN */}
                            {totalPaginas > 1 && (
                                <div className="d-flex justify-content-center align-items-center gap-3 mt-4 mb-5">
                                    <button className="btn btn-light rounded-circle shadow-sm" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}>
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </button>
                                    <div className="bg-white px-4 py-2 rounded-pill shadow-sm fw-bold">Página {pagina} de {totalPaginas}</div>
                                    <button className="btn btn-light rounded-circle shadow-sm" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}>
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </button>
                                </div>
                            )}
                        </>
                    )
                )}
            </div>

            {/* MODAL PAPELERA (DISEÑO ACTUALIZADO CON BUSCADOR Y BOTÓN ELIMINAR) */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0" style={{ borderRadius: '40px', overflow: 'hidden' }}>
                            <div className="text-center p-4 text-white position-relative" style={{ backgroundColor: '#D82F43' }}>
                                <h3 className="fw-bold m-0 text-uppercase"><FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Reciclaje</h3>
                            </div>
                            <div className="modal-body p-4 bg-white">
                                {/* BUSCADOR DENTRO DE LA PAPELERA */}
                                <div className="mb-4 d-flex justify-content-center">
                                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-light border w-50">
                                        <span className="input-group-text bg-transparent border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                                        <input 
                                            type="text" 
                                            className="form-control border-0 py-2 bg-light" 
                                            placeholder="Buscar en papelera..." 
                                            value={busquedaPapelera} 
                                            onChange={(e) => setBusquedaPapelera(e.target.value)} 
                                        />
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <table className="table table-hover align-middle">
                                        <thead className="bg-light sticky-top">
                                            <tr>
                                                <th className="ps-3">Nombre</th>
                                                <th>Tipo</th>
                                                <th className="text-center">Borrado por</th>
                                                <th>Fecha</th>
                                                <th className="text-center">Restaurar</th>
                                                <th className="text-center">Eliminar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {obtenerPapeleraFiltrada().length === 0 ? (
                                                <tr><td colSpan="6" className="text-center py-5 text-muted">No se encontraron registros eliminados</td></tr>
                                            ) : (
                                                obtenerPapeleraFiltrada().map(t => (
                                                    <tr key={t.id}>
                                                        <td className="ps-3">
                                                            <div className="fw-bold">{t.mascota_nombre}</div>
                                                            <small className="text-muted">Dueño: {t.dueno_nombre}</small>
                                                        </td>
                                                        <td><span className="badge rounded-pill bg-primary px-3 py-2 text-uppercase">Turno</span></td>
                                                        <td className="text-center">
                                                            <span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '8px' }}>
                                                                {t.responsable_borrado || 'Luciana'}
                                                            </span>
                                                        </td>
                                                        <td className="small">{new Date(t.fecha_borrado).toLocaleString('es-AR')}</td>
                                                        <td className="text-center">
                                                            <button className="btn btn-success rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }} onClick={() => restaurarTurno(t.id)}>
                                                                <FontAwesomeIcon icon={faTrashRestore} />
                                                            </button>
                                                        </td>
                                                        <td className="text-center">
                                                            <button className="btn btn-danger rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }} onClick={() => { setIdToPermanentDelete(t.id); setShowConfirmPermanent(true); }}>
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer justify-content-center border-0 pb-4 bg-white">
                                <button className="btn text-white px-5 py-2 fw-bold shadow" style={{ backgroundColor: '#2C3E50', borderRadius: '25px' }} onClick={() => { setShowPapelera(false); setBusquedaPapelera(''); }}>CERRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES EXTRAS */}
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
                                                    <option value="kg">kg</option><option value="gr">gr</option>
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

            {/* MODAL MOVER A PAPELERA */}
            <ConfirmModal 
                show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleConfirmarEliminar} 
                title="¿Mover a la papelera?" message="El turno se moverá a la papelera y se podrá restaurar más tarde." 
                confirmText="Sí, mover a papelera" cancelText="Cancelar" confirmColor="danger" 
            />

            {/* MODAL ELIMINAR PERMANENTE */}
            <ConfirmModal 
                show={showConfirmPermanent} 
                onClose={() => setShowConfirmPermanent(false)} 
                onConfirm={handleConfirmarEliminarPermanente} 
                title="¿Eliminar permanentemente?" 
                message="Esta acción no se puede deshacer. El registro se borrará por completo de la base de datos." 
                confirmText="Sí, eliminar para siempre" 
                cancelText="Cancelar" 
                confirmColor="danger" 
            />
        </div>
    );
};

export default TurnosPage;