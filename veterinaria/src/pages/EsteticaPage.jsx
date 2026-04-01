import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faScissors, faPlus, faSearch, faCalendarAlt, faClock, faEdit,
    faTrash, faCheckCircle, faFilePdf, faFileExcel, faPlay, faTimes,
    faPaw, faTag, faExclamationTriangle, faSpinner, faPrint, faSmile, faMeh, faFrown,
    faClipboardList, faUser, faPhone, faCalendarDay, faCircleExclamation,
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight, faHistory, faTrashRestore
} from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const EsteticaPage = () => {
    const [servicios, setServicios] = useState([]);
    const [serviciosEliminados, setServiciosEliminados] = useState([]); // Estado para papelera
    const [mascotas, setMascotas] = useState([]);
    const [loadingMascotas, setLoadingMascotas] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('hoy');
    const [fechaPersonalizada, setFechaPersonalizada] = useState('');
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalTurnos, setTotalTurnos] = useState(0);
    const limite = 20;
    const [showModal, setShowModal] = useState(false);
    const [showPapelera, setShowPapelera] = useState(false); // Control modal papelera
    const [showFinalizar, setShowFinalizar] = useState(false);
    const [turnoAfinalizar, setTurnoAfinalizar] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });
    const [confirmacion, setConfirmacion] = useState({ show: false, id: null, mensaje: '', nombreMascota: '' });
    const [formData, setFormData] = useState({
        mascota_id: '',
        tipo_servicio: 'Baño y Corte Completo',
        fecha: new Date().toISOString().slice(0, 16),
        motivo: 'Turno de estética'
    });
    const [comportamientoData, setComportamientoData] = useState({
        comportamiento: '',
        observaciones: '',
        peso: '',
        unidad: 'kg'
    });
    const [errorHorario, setErrorHorario] = useState('');

    const opcionesServicios = [
        "Baño y Corte Completo", "Solo Baño", "Corte de Uñas", "Limpieza de Oídos y Glándulas",
        "Deslanado (Shedding)", "Baño Medicado / Antiparasitario", "Corte de Raza (Show Grooming)",
        "Hidratación de Manto", "Recorte Sanitario", "Spa Relajante"
    ];

    const mostrarAviso = (mensaje, tipo = 'success') => {
        setNotificacion({ show: true, mensaje, tipo });
        setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 5000);
    };

    const cargarDatos = async () => {
        if (filtroFecha === 'personalizado' && !fechaPersonalizada) {
            setServicios([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let query = `?pagina=${pagina}&limite=${limite}`;
            if (filtroFecha === 'personalizado' && fechaPersonalizada) {
                query += `&fecha=${fechaPersonalizada}`;
            }
            const res = await api.get(`/estetica${query}`);
            console.log('✂️ Respuesta de estética:', res.data);
            setServicios(res.data.data || res.data || []);
            setTotalPaginas(res.data.totalPaginas || Math.ceil((res.data.total || 0) / limite) || 1);
            setTotalTurnos(res.data.total || 0);
        } catch (err) {
            console.error("❌ Error al cargar datos:", err);
            setServicios([]);
        } finally {
            setLoading(false);
        }
    };

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/turnos/papelera');
            const soloEstetica = res.data.filter(t => t.tipo === 'estetica');
            setServiciosEliminados(soloEstetica);
        } catch (err) {
            console.error("Error al cargar papelera");
        }
    };

    const restaurarTurno = async (id) => {
        try {
            await api.put(`/turnos/restaurar/${id}`);
            mostrarAviso("✅ Turno restaurado correctamente", "success");
            cargarPapelera();
            cargarDatos();
        } catch (err) {
            mostrarAviso("❌ Error al restaurar", "error");
        }
    };

    useEffect(() => {
        setPagina(1);
    }, [filtroFecha, fechaPersonalizada, busqueda]);

    useEffect(() => {
        cargarDatos();
    }, [pagina, filtroFecha, fechaPersonalizada]);

    useEffect(() => {
        if (showPapelera) cargarPapelera();
    }, [showPapelera]);

    useEffect(() => {
        if (showModal) {
            setLoadingMascotas(true);
            api.get('/mascotas')
                .then(res => setMascotas(res.data || []))
                .finally(() => setLoadingMascotas(false));
        }
    }, [showModal]);

    const verificarHorarioOcupado = useCallback((fechaHora, idExcluir) => {
        const [fecha, horaCompleta] = fechaHora.split('T');
        const hora = horaCompleta?.substring(0, 5);
        if (!fecha || !hora) return false;
        return servicios.some(turno =>
            turno.fecha === fecha &&
            turno.hora?.startsWith(hora) &&
            turno.id !== idExcluir &&
            turno.realizado < 2
        );
    }, [servicios]);

    const obtenerTurnosFiltradosYOrdenados = () => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diaSem = hoy.getDay();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - (diaSem === 0 ? 6 : diaSem - 1));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59);

        return servicios.filter(s => {
            const fechaT = new Date(s.fecha + 'T00:00:00');
            const coincideBusqueda = (s.mascota || '').toLowerCase().includes(busqueda.toLowerCase()) ||
                (s.dueno || '').toLowerCase().includes(busqueda.toLowerCase());
            if (!coincideBusqueda) return false;
            if (filtroFecha === 'hoy') {
                return fechaT.getTime() === hoy.getTime();
            } else if (filtroFecha === 'semana') {
                return fechaT >= lunes && fechaT <= domingo;
            } else if (filtroFecha === 'personalizado') {
                return fechaPersonalizada && s.fecha === fechaPersonalizada;
            }
            return true;
        }).sort((a, b) => new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora));
    };

    const agruparPorFecha = (turnos) => {
        const grupos = {};
        turnos.forEach(t => {
            if (!grupos[t.fecha]) grupos[t.fecha] = [];
            grupos[t.fecha].push(t);
        });
        return grupos;
    };

    const turnosAMostrar = agruparPorFecha(obtenerTurnosFiltradosYOrdenados());

    const irAPagina = (nuevaPagina) => {
        if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
            setPagina(nuevaPagina);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const paginaAnterior = () => { if (pagina > 1) irAPagina(pagina - 1); };
    const paginaSiguiente = () => { if (pagina < totalPaginas) irAPagina(pagina + 1); };
    const irAPrimeraPagina = () => irAPagina(1);
    const irAUltimaPagina = () => irAPagina(totalPaginas);

    const numerosDePagina = useMemo(() => {
        const paginas = [];
        const maxVisible = 5;
        let inicio = Math.max(1, pagina - Math.floor(maxVisible / 2));
        let fin = Math.min(totalPaginas, inicio + maxVisible - 1);
        if (fin - inicio < maxVisible - 1) inicio = Math.max(1, fin - maxVisible + 1);
        for (let i = inicio; i <= fin; i++) paginas.push(i);
        return paginas;
    }, [pagina, totalPaginas]);

    // Funciones de exportación
    const exportarExcel = () => {
        const data = obtenerTurnosFiltradosYOrdenados().map(s => ({
            Fecha: s.fecha, Hora: s.hora, Mascota: s.mascota, Dueño: s.dueno, Servicio: s.servicio
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Peluquería");
        XLSX.writeFile(wb, "Agenda_Peluqueria.xlsx");
    };

    const exportarPDFGeneral = () => {
        const doc = new jsPDF();
        doc.text("Agenda de Peluquería Malfi", 14, 15);
        autoTable(doc, {
            head: [["Fecha", "Hora", "Mascota", "Dueño", "Servicio"]],
            body: obtenerTurnosFiltradosYOrdenados().map(s => [s.fecha, s.hora, s.mascota, s.dueno, s.servicio]),
            startY: 20
        });
        doc.save("Agenda_Peluqueria.pdf");
    };

    const handleGuardarTurno = async (e) => {
        e.preventDefault();
        if (verificarHorarioOcupado(formData.fecha, datosEdicion?.id)) {
            setErrorHorario('❌ Este horario ya está ocupado. Por favor, elegí otro.');
            mostrarAviso("⚠️ El horario seleccionado ya está ocupado", "error");
            return;
        }
        try {
            const mascotaSel = mascotas.find(m => m.id === parseInt(formData.mascota_id));
            const fechaM = formData.fecha.replace('T', ' ') + ':00';
            let body = {
                fecha: fechaM.split(' ')[0],
                hora: fechaM.split(' ')[1].substring(0, 5),
                tipo: 'estetica',
                motivo: formData.motivo,
                tipo_servicio: formData.tipo_servicio,
                mascota_id: parseInt(formData.mascota_id),
                dueno_id: mascotaSel?.dueno_id
            };
            await api({
                url: datosEdicion ? `/estetica/${datosEdicion.id}` : '/estetica',
                method: datosEdicion ? 'PUT' : 'POST',
                data: body
            });
            setShowModal(false);
            setDatosEdicion(null);
            setErrorHorario('');
            cargarDatos();
            mostrarAviso("✅ Turno guardado correctamente", "success");
        } catch (err) {
            console.error('Error al guardar:', err);
            mostrarAviso("❌ Error al guardar el turno", "error");
        }
    };

    const handleFechaChange = (e) => {
        const fechaSel = e.target.value;
        const horaActual = formData.fecha ? formData.fecha.split('T')[1]?.substring(0, 5) || '09:00' : '09:00';
        const nuevaFecha = `${fechaSel}T${horaActual}`;
        setFormData({ ...formData, fecha: nuevaFecha });
        const ocupado = verificarHorarioOcupado(nuevaFecha, datosEdicion?.id);
        setErrorHorario(ocupado ? '⚠️ Este horario ya está ocupado' : '');
    };

    const handleHoraChange = (e) => {
        const horaSel = e.target.value;
        const fechaActual = formData.fecha ? formData.fecha.split('T')[0] : new Date().toISOString().split('T')[0];
        const nuevaFecha = `${fechaActual}T${horaSel}`;
        setFormData({ ...formData, fecha: nuevaFecha });
        const ocupado = verificarHorarioOcupado(nuevaFecha, datosEdicion?.id);
        setErrorHorario(ocupado ? '⚠️ Este horario ya está ocupado' : '');
    };

    const confirmarFinalizacion = async (e) => {
        e.preventDefault();
        const pesoFinal = comportamientoData.peso ? `${comportamientoData.peso} ${comportamientoData.unidad}` : 'No registrado';
        try {
            await api.put(`/estetica/${turnoAfinalizar.id}`, {
                realizado: 2,
                comportamiento: comportamientoData.comportamiento,
                observaciones: comportamientoData.observaciones,
                peso: pesoFinal
            });
            setShowFinalizar(false);
            setComportamientoData({ comportamiento: '', observaciones: '', peso: '', unidad: 'kg' });
            cargarDatos();
            mostrarAviso("✅ Trabajo finalizado con éxito", "success");
        } catch (err) {
            console.error("Error al finalizar:", err);
            mostrarAviso("❌ Error al finalizar el trabajo", "error");
        }
    };

    const exportarTicketEstetica = (s) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 180] });
        
        doc.setFillColor(128, 0, 128);
        doc.rect(0, 0, 80, 35, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(255);
        doc.text("PELUQUERIA CANINA", 40, 18, { align: "center" });
        doc.setFontSize(9);
        doc.text("MALFI ESTÉTICA", 40, 27, { align: "center" });

        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.text("COMPROBANTE DE TURNO", 40, 48, { align: "center" });
        
        doc.setDrawColor(200);
        doc.line(8, 53, 72, 53);

        let y = 65;
        doc.setFontSize(10);

        doc.setFont("helvetica", "bold");
        doc.text("Paciente:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(s.mascota || s.mascota_nombre || ''), 32, y);
        y += 9;

        doc.setFont("helvetica", "bold");
        doc.text("Dueño:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(s.dueno || s.dueno_nombre || ''), 32, y);
        y += 9;

        doc.setFont("helvetica", "bold");
        doc.text("Servicio:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(s.servicio || s.tipo_servicio || ''), 32, y);
        y += 9;

        doc.setFont("helvetica", "bold");
        doc.text("Fecha:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(s.fecha ? new Date(s.fecha).toLocaleDateString('es-AR') : 'No registrada', 32, y);
        y += 9;

        doc.setFont("helvetica", "bold");
        doc.text("Hora:", 10, y);
        doc.setFont("helvetica", "normal");
        doc.text(s.hora ? s.hora + " hs" : 'No registrada', 32, y);
        y += 9;

        doc.setDrawColor(200);
        doc.line(10, y + 5, 70, y + 5);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("-----------------------------------------------", 40, y + 15, { align: "center" });
        
        doc.setFontSize(9);
        doc.text("¡Gracias por elegir Malfi!", 40, y + 25, { align: "center" });

        doc.save(`Ticket_${s.mascota || s.mascota_nombre || 'Turno'}.pdf`);
    };

    const formatearFechaTitulo = (fechaStr) => {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const partes = fechaStr.split('-');
        const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        let pref = fecha.getTime() === hoy.getTime() ? "HOY - " : "";
        return `${pref}${dias[fecha.getDay()]} ${fecha.getDate()}/${fecha.getMonth() + 1}`;
    };

    const abrirModalNuevoTurno = () => {
        setDatosEdicion(null);
        setFormData({
            mascota_id: '',
            tipo_servicio: 'Baño y Corte Completo',
            fecha: new Date().toISOString().slice(0, 16),
            motivo: 'Turno de estética'
        });
        setErrorHorario('');
        setShowModal(true);
    };

    const abrirModalEditarTurno = (turno) => {
        setDatosEdicion(turno);
        setFormData({
            mascota_id: turno.mascota_id,
            tipo_servicio: turno.servicio,
            fecha: `${turno.fecha}T${turno.hora}`,
            motivo: turno.motivo || ''
        });
        setErrorHorario('');
        setShowModal(true);
    };

    return (
        <div className="min-vh-100 p-4" style={{
            backgroundImage: `url('https://i.pinimg.com/1200x/48/08/50/4808507b12218fd6f32b23798e190c89.jpg')`,
            backgroundSize: 'cover',
            backgroundAttachment: 'fixed'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

                {/* NOTIFICACIÓN MEJORADA */}
                {notificacion.show && (
                    <div className="position-fixed top-4 start-50 translate-middle-x shadow-lg rounded-4 overflow-hidden"
                         style={{ 
                            zIndex: 4000, 
                            minWidth: '380px',
                            background: 'linear-gradient(135deg, #10b981, #34d399)',
                            animation: 'slideDown 0.4s ease'
                         }}>
                        <div className="d-flex align-items-center px-4 py-3 text-white">
                            <div className="me-3">
                                <FontAwesomeIcon icon={faCheckCircle} size="2x" />
                            </div>
                            <div className="flex-grow-1 fw-semibold fs-5">
                                {notificacion.mensaje}
                            </div>
                            <button 
                                type="button" 
                                className="btn-close btn-close-white"
                                onClick={() => setNotificacion({ show: false, mensaje: '', tipo: 'success' })}
                            ></button>
                        </div>
                    </div>
                )}

                <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Peluquería Malfi</h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 fw-bold shadow-sm" onClick={exportarPDFGeneral} title="Reporte PDF"><FontAwesomeIcon icon={faFilePdf} className="me-1" /> PDF</button>
                        <button className="btn btn-success rounded-pill px-3 fw-bold shadow-sm" onClick={exportarExcel} title="Reporte Excel"><FontAwesomeIcon icon={faFileExcel} className="me-1" /> EXCEL</button>
                        <button 
                            className="btn rounded-pill px-4 fw-bold shadow-lg text-white" 
                            onClick={() => setShowPapelera(true)}
                            style={{ backgroundColor: '#e74c3c', border: '2px solid rgba(255,255,255,0.4)', transition: 'all 0.3s ease' }}
                        >
                            <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera
                        </button>
                        <button onClick={abrirModalNuevoTurno} className="btn btn-primary rounded-pill px-4 shadow">+ Nuevo Turno</button>
                    </div>
                </header>

                <div className="mb-4 d-flex gap-3 align-items-center flex-wrap">
                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white w-25">
                        <span className="input-group-text bg-white border-0 text-warning"><FontAwesomeIcon icon={faSearch} /></span>
                        <input
                            type="text"
                            className="form-control border-0 py-2"
                            placeholder="Buscar..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <select
                        value={filtroFecha}
                        onChange={e => setFiltroFecha(e.target.value)}
                        className="form-select rounded-pill w-auto shadow-sm"
                    >
                        <option value="hoy">Hoy</option>
                        <option value="semana">Esta semana</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                    {filtroFecha === 'personalizado' && (
                        <input
                            type="date"
                            value={fechaPersonalizada}
                            onChange={e => { setFechaPersonalizada(e.target.value); setPagina(1); }}
                            className="form-control rounded-pill shadow-sm w-auto"
                        />
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="white" />
                        <p className="text-white mt-3">Cargando turnos...</p>
                    </div>
                ) : (filtroFecha === 'personalizado' && !fechaPersonalizada) ? (
                    <div className="text-center text-white py-5">
                        <h3>Elegí una fecha para ver los turnos</h3>
                    </div>
                ) : Object.keys(turnosAMostrar).length === 0 ? (
                    <div className="text-center text-white py-5">
                        <h3>No hay turnos para este período</h3>
                    </div>
                ) : (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <p className="text-white mb-0"><FontAwesomeIcon icon={faClipboardList} className="me-2" /> Mostrando {servicios.length} de {totalTurnos} turnos</p>
                            <p className="text-white mb-0">Página {pagina} de {totalPaginas}</p>
                        </div>

                        {Object.keys(turnosAMostrar).map(fecha => (
                            <div key={fecha} className="mb-5">
                                <h4 className="text-white fw-bold mb-3 p-2 px-4 rounded-pill d-inline-block shadow" style={{ background: '#f39c12' }}>
                                    <FontAwesomeIcon icon={faCalendarDay} className="me-2" /> {formatearFechaTitulo(fecha)}
                                </h4>
                                <div className="row g-4 text-dark">
                                    {turnosAMostrar[fecha].map(s => (
                                        <div className="col-md-6 col-lg-3" key={s.id}>
                                            <div className="card border-0 shadow-lg p-3 rounded-4 transition-card" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h5 className="fw-bold text-dark mb-0">{s.mascota}</h5>
                                                    <span className={`badge ${s.realizado === 1 ? 'bg-info text-white' : 'bg-warning text-dark'}`}>
                                                        {s.realizado === 1 ? 'EN PROCESO' : 'PENDIENTE'}
                                                    </span>
                                                </div>
                                                <hr className="my-2 opacity-25" />
                                                <p className="small mb-1"><FontAwesomeIcon icon={faUser} className="text-muted me-2" /> {s.dueno}</p>
                                                <p className="small mb-1"><FontAwesomeIcon icon={faClock} className="text-muted me-2" /> {s.hora} hs</p>
                                                <p className="fw-bold small mb-3" style={{ color: '#f39c12' }}>{s.servicio}</p>
                                                <div className="d-flex gap-2">
                                                    <button 
                                                        className={`btn btn-sm rounded-pill flex-grow-1 fw-bold ${s.realizado === 0 ? 'btn-primary' : 'btn-success'}`}
                                                        onClick={async () => {
                                                            if(s.realizado === 0) { await api.put(`/estetica/${s.id}`, { realizado: 1 }); cargarDatos(); }
                                                            else { setTurnoAfinalizar(s); setShowFinalizar(true); }
                                                        }}
                                                    >
                                                        {s.realizado === 0 ? 'INICIAR' : 'FINALIZAR'}
                                                    </button>
                                                    <button 
                                                        className="btn btn-light btn-sm rounded-circle border shadow-sm text-danger" 
                                                        onClick={() => exportarTicketEstetica(s)}
                                                        title="Descargar ticket"
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} />
                                                    </button>
                                                    <button className="btn btn-light btn-sm rounded-circle border shadow-sm text-primary" onClick={() => abrirModalEditarTurno(s)}><FontAwesomeIcon icon={faEdit}/></button>
                                                    <button className="btn btn-light btn-sm rounded-circle border shadow-sm text-danger" onClick={() => setConfirmacion({ show: true, id: s.id, nombreMascota: s.mascota })}><FontAwesomeIcon icon={faTrash}/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* PAGINACIÓN MEJORADA - SIEMPRE ABAJO */}
                        {totalPaginas > 1 && (
                            <div className="d-flex justify-content-center align-items-center gap-3 mt-5 mb-5">
                                <button className="btn btn-light rounded-circle shadow-sm px-3 py-2" onClick={irAPrimeraPagina} disabled={pagina === 1}>
                                    <FontAwesomeIcon icon={faAnglesLeft} />
                                </button>
                                <button className="btn btn-light rounded-pill px-4 py-2 shadow-sm" onClick={paginaAnterior} disabled={pagina === 1}>
                                    <FontAwesomeIcon icon={faChevronLeft} className="me-2" /> Anterior
                                </button>

                                <div className="d-flex gap-2 mx-4">
                                    {numerosDePagina.map(num => (
                                        <button 
                                            key={num} 
                                            className={`btn rounded-circle fw-bold shadow-sm ${pagina === num ? 'btn-primary' : 'btn-light'}`} 
                                            style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}
                                            onClick={() => irAPagina(num)}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>

                                <button className="btn btn-light rounded-pill px-4 py-2 shadow-sm" onClick={paginaSiguiente} disabled={pagina === totalPaginas}>
                                    Siguiente <FontAwesomeIcon icon={faChevronRight} className="ms-2" />
                                </button>
                                <button className="btn btn-light rounded-circle shadow-sm px-3 py-2" onClick={irAUltimaPagina} disabled={pagina === totalPaginas}>
                                    <FontAwesomeIcon icon={faAnglesRight} />
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* MODAL PAPELERA */}
                {showPapelera && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
                        <div className="modal-dialog modal-lg modal-dialog-centered">
                            <div className="modal-content border-0 shadow-2xl" style={{ borderRadius: '40px', overflow: 'hidden' }}>
                                <div className="text-center p-4 text-white" style={{ backgroundColor: '#D82F43' }}>
                                    <h3 className="fw-bold m-0 text-uppercase"><FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Estética</h3>
                                </div>
                                <div className="modal-body p-4 bg-white text-dark">
                                    <div className="table-responsive">
                                        <table className="table table-hover align-middle">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th>Nombre</th>
                                                    <th>Tipo</th>
                                                    <th className="text-center">Borrado por</th>
                                                    <th>Fecha</th>
                                                    <th className="text-center">Restaurar</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {serviciosEliminados.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="text-center py-5 text-muted small">La papelera está vacía</td>
                                                    </tr>
                                                ) : (
                                                    serviciosEliminados.map(e => (
                                                        <tr key={e.id}>
                                                            <td>
                                                                <div className="fw-bold">{e.mascota_nombre || e.mascota}</div>
                                                                {e.dueno_nombre && <small className="text-muted">Dueño: {e.dueno_nombre}</small>}
                                                            </td>
                                                            <td>
                                                                <span className="badge rounded-pill bg-primary px-3 py-2 text-uppercase">Turno</span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-light text-dark border px-3 py-2" style={{ borderRadius: '8px' }}>
                                                                    {e.responsable_borrado || e.borrado_por || 'Sistema'}
                                                                </span>
                                                            </td>
                                                            <td className="small">{new Date(e.fecha_borrado).toLocaleString('es-AR')}</td>
                                                            <td className="text-center">
                                                                <button className="btn btn-success rounded-circle shadow-sm" style={{ width: '40px', height: '40px' }} onClick={() => restaurarTurno(e.id)}>
                                                                    <FontAwesomeIcon icon={faTrashRestore} />
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
                                    <button className="btn text-white px-5 py-2 fw-bold shadow" style={{ backgroundColor: '#2C3E50', borderRadius: '25px' }} onClick={() => setShowPapelera(false)}>CERRAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL NUEVO TURNO / EDICIÓN */}
                {showModal && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                        <div className="modal-dialog modal-dialog-centered text-dark">
                            <form className="modal-content rounded-4 p-4 shadow-lg border-0" onSubmit={handleGuardarTurno}>
                                <h4 className="fw-bold mb-4">{datosEdicion ? '✏️ Editar Turno' : '📅 Nuevo Turno'}</h4>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Mascota *</label>
                                    <select className="form-select rounded-pill shadow-sm" value={formData.mascota_id} onChange={e => setFormData({ ...formData, mascota_id: e.target.value })} required>
                                        <option value="">Seleccioná...</option>
                                        {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} (de {m.dueno_nombre})</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Servicio *</label>
                                    <select className="form-select rounded-pill shadow-sm" value={formData.tipo_servicio} onChange={e => setFormData({ ...formData, tipo_servicio: e.target.value })} required>
                                        {opcionesServicios.map(op => <option key={op} value={op}>{op}</option>)}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Fecha y Hora *</label>
                                    <input type="datetime-local" className="form-control rounded-pill shadow-sm" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="button" className="btn btn-light w-100 rounded-pill" onClick={() => setShowModal(false)}>Cerrar</button>
                                    <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold shadow">GUARDAR</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL FINALIZAR TRABAJO */}
                {showFinalizar && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }}>
                        <div className="modal-dialog modal-dialog-centered text-dark">
                            <form className="modal-content rounded-4 shadow-lg border-0" onSubmit={confirmarFinalizacion}>
                                <div className="modal-header bg-success text-white"><h4>Finalizar: {turnoAfinalizar?.mascota}</h4></div>
                                <div className="modal-body p-4 text-center">
                                    <div className="mb-3 bg-light p-3 rounded-3">
                                        <label className="fw-bold mb-2 small d-block">PESO ACTUAL</label>
                                        <div className="input-group">
                                            <input type="number" step="0.01" className="form-control" value={comportamientoData.peso} onChange={e => setComportamientoData({ ...comportamientoData, peso: e.target.value })} />
                                            <select className="form-select" style={{ maxWidth: '80px' }} value={comportamientoData.unidad} onChange={e => setComportamientoData({ ...comportamientoData, unidad: e.target.value })}><option value="kg">kg</option><option value="gr">gr</option></select>
                                        </div>
                                    </div>
                                    <label className="fw-bold mb-3 d-block text-center small text-dark">¿CÓMO SE PORTÓ? *</label>
                                    <div className="d-flex justify-content-around mb-4">
                                        {['Bueno', 'Regular', 'Malo'].map(c => (
                                            <button key={c} type="button" onClick={() => setComportamientoData({ ...comportamientoData, comportamiento: c })} className={`btn rounded-4 p-3 ${comportamientoData.comportamiento === c ? 'btn-success shadow' : 'btn-outline-secondary'}`} style={{ width: '30%' }}>
                                                <FontAwesomeIcon icon={c === 'Bueno' ? faSmile : c === 'Regular' ? faMeh : faFrown} size="2x" /><br />{c}
                                            </button>
                                        ))}
                                    </div>
                                    <textarea className="form-control" rows="3" placeholder="Observaciones obligatorias..." value={comportamientoData.observaciones} onChange={e => setComportamientoData({ ...comportamientoData, observaciones: e.target.value })} required></textarea>
                                </div>
                                <div className="modal-footer border-0">
                                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowFinalizar(false)}>CANCELAR</button>
                                    <button type="submit" className="btn btn-success flex-grow-1 rounded-pill fw-bold" disabled={!comportamientoData.comportamiento || !comportamientoData.observaciones.trim()}>GUARDAR</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL CONFIRMAR ELIMINAR */}
                {confirmacion.show && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000 }}>
                        <div className="modal-dialog modal-dialog-centered text-dark">
                            <div className="modal-content p-4 text-center rounded-4 border-0 shadow-lg">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="4x" className="text-danger mb-3" />
                                <h3 className="fw-bold">¿Mover a la papelera?</h3>
                                <p className="text-muted">Turno de: <strong>{confirmacion.nombreMascota}</strong></p>
                                <div className="d-flex gap-2 mt-3">
                                    <button className="btn btn-light w-100 rounded-pill fw-bold" onClick={() => setConfirmacion({ show: false })}>CANCELAR</button>
                                    <button className="btn btn-danger w-100 rounded-pill fw-bold shadow" onClick={async () => {
                                        await api.delete(`/estetica/${confirmacion.id}`);
                                        setConfirmacion({ show: false });
                                        cargarDatos();
                                        mostrarAviso("🗑️ Turno enviado a la papelera", "success");
                                    }}>ELIMINAR</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .transition-card { transition: all 0.3s ease; }
                .transition-card:hover { transform: translateY(-5px); box-shadow: 0 1rem 3rem rgba(0,0,0,.175)!important; }
                
                @keyframes slideDown {
                    from { transform: translate(-50%, -20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default EsteticaPage;