import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faScissors, faPlus, faSearch, faCalendarAlt, faClock, faEdit,
    faTrash, faCheckCircle, faFilePdf, faFileExcel, faPlay, faTimes,
    faPaw, faTag, faExclamationTriangle, faSpinner, faPrint, faSmile, faMeh, faFrown,
    faClipboardList, faUser, faPhone, faCalendarDay, faCircleExclamation,
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const EsteticaPage = () => {
    const [servicios, setServicios] = useState([]);
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

    useEffect(() => {
        setPagina(1);
    }, [filtroFecha, fechaPersonalizada, busqueda]);

    useEffect(() => {
        cargarDatos();
    }, [pagina, filtroFecha, fechaPersonalizada]);

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
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
        doc.setFillColor(106, 17, 203);
        doc.rect(0, 0, 80, 32, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255);
        doc.text("PELUQUERIA CANINA", 40, 26, { align: "center" });
        doc.setTextColor(40);
        doc.setFontSize(11);
        doc.text("COMPROBANTE DE TURNO", 40, 42, { align: "center" });
        doc.setDrawColor(200);
        doc.line(10, 45, 70, 45);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Paciente:", 10, 55);
        doc.setFont("helvetica", "normal");
        doc.text(String(s.mascota), 32, 55);
        doc.setFont("helvetica", "bold");
        doc.text("Dueño:", 10, 63);
        doc.setFont("helvetica", "normal");
        doc.text(String(s.dueno), 32, 63);
        doc.setFontSize(8);
        doc.text("-----------------------------------------------", 40, 130, { align: "center" });
        doc.save(`Ticket_${s.mascota}.pdf`);
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
                {notificacion.show && (
                    <div className={`alert alert-${notificacion.tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg`}
                        style={{ zIndex: 3000, minWidth: '300px' }} role="alert">
                        <FontAwesomeIcon icon={notificacion.tipo === 'success' ? faCheckCircle : faCircleExclamation} className="me-2" />
                        {notificacion.mensaje}
                        <button type="button" className="btn-close" onClick={() => setNotificacion({ ...notificacion, show: false })}></button>
                    </div>
                )}

                <header className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Peluquería Malfi</h1>
                    <button onClick={abrirModalNuevoTurno} className="btn btn-primary rounded-pill px-4 shadow">+ Nuevo Turno</button>
                </header>

                <div className="mb-4 d-flex gap-3 align-items-center flex-wrap">
                    <input
                        type="text"
                        className="form-control rounded-pill shadow-sm w-25"
                        placeholder="Buscar..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
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
                            <p className="text-white mb-0">
                                <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                                Mostrando {servicios.length} de {totalTurnos} turnos
                            </p>
                            <p className="text-white mb-0">
                                Página {pagina} de {totalPaginas}
                            </p>
                        </div>

                        {Object.keys(turnosAMostrar).map(fecha => (
                            <div key={fecha} className="mb-5">
                                <h4 className="text-white fw-bold mb-3 p-2 px-4 rounded-pill d-inline-block"
                                    style={{ background: 'rgba(106, 17, 203, 0.9)' }}>
                                    <FontAwesomeIcon icon={faCalendarDay} className="me-2" /> {formatearFechaTitulo(fecha)}
                                </h4>
                                <div className="row g-4">
                                    {turnosAMostrar[fecha].map(s => (
                                        <div className="col-md-6 col-lg-3" key={s.id}>
                                            <div className="card border-0 shadow-lg p-3 rounded-4 transition-card"
                                                style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                                                <div className="d-flex justify-content-between mb-2">
                                                    <h5 className="fw-bold text-primary mb-0">{s.mascota}</h5>
                                                    <span className={`badge ${s.realizado === 1 ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                                        {s.realizado === 1 ? 'EN PROCESO' : 'PENDIENTE'}
                                                    </span>
                                                </div>
                                                <p className="small mb-1">
                                                    <FontAwesomeIcon icon={faUser} /> {s.dueno}
                                                </p>
                                                <p className="small mb-1">
                                                    <FontAwesomeIcon icon={faClock} /> {s.hora} hs
                                                </p>
                                                <p className="text-purple fw-bold my-2 small">{s.servicio}</p>
                                                <div className="d-flex gap-2">
                                                    {s.realizado === 0 ? (
                                                        <button
                                                            onClick={async () => {
                                                                await api.put(`/estetica/${s.id}`, { realizado: 1 });
                                                                cargarDatos();
                                                            }}
                                                            className="btn btn-primary btn-sm rounded-pill flex-grow-1 fw-bold"
                                                        >
                                                            INICIAR
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setTurnoAfinalizar(s);
                                                                setShowFinalizar(true);
                                                            }}
                                                            className="btn btn-success btn-sm rounded-pill flex-grow-1 fw-bold"
                                                        >
                                                            FINALIZAR
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-outline-danger btn-sm rounded-circle border"
                                                        onClick={() => exportarTicketEstetica(s)}
                                                        title="Ticket"
                                                    >
                                                        <FontAwesomeIcon icon={faPrint} />
                                                    </button>
                                                    <button
                                                        className="btn btn-white btn-sm rounded-circle border"
                                                        onClick={() => abrirModalEditarTurno(s)}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} className="text-primary" />
                                                    </button>
                                                    <button
                                                        className="btn btn-white btn-sm rounded-circle border"
                                                        onClick={() => {
                                                            setConfirmacion({ show: true, id: s.id, nombreMascota: s.mascota });
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="text-danger" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {totalPaginas > 1 && (
                            <div className="d-flex justify-content-center align-items-center gap-2 mt-4 mb-5">
                                <button
                                    className="btn btn-outline-light btn-sm rounded-circle"
                                    onClick={irAPrimeraPagina}
                                    disabled={pagina === 1}
                                    title="Primera página"
                                >
                                    <FontAwesomeIcon icon={faAnglesLeft} />
                                </button>
                                <button
                                    className="btn btn-outline-light btn-sm rounded-pill px-3"
                                    onClick={paginaAnterior}
                                    disabled={pagina === 1}
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="me-1" /> Anterior
                                </button>
                                <div className="d-flex gap-1">
                                    {numerosDePagina.map(num => (
                                        <button
                                            key={num}
                                            className={`btn btn-sm rounded-circle ${pagina === num ? 'btn-primary' : 'btn-outline-light'}`}
                                            onClick={() => irAPagina(num)}
                                            style={{ width: '40px', height: '40px' }}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    className="btn btn-outline-light btn-sm rounded-pill px-3"
                                    onClick={paginaSiguiente}
                                    disabled={pagina === totalPaginas}
                                >
                                    Siguiente <FontAwesomeIcon icon={faChevronRight} className="ms-1" />
                                </button>
                                <button
                                    className="btn btn-outline-light btn-sm rounded-circle"
                                    onClick={irAUltimaPagina}
                                    disabled={pagina === totalPaginas}
                                    title="Última página"
                                >
                                    <FontAwesomeIcon icon={faAnglesRight} />
                                </button>
                            </div>
                        )}
                    </>
                )}

                {showFinalizar && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <form className="modal-content rounded-4 shadow-lg border-0" onSubmit={confirmarFinalizacion}>
                                <div className="modal-header bg-success text-white">
                                    <h4>Finalizar: {turnoAfinalizar?.mascota}</h4>
                                    <button type="button" className="btn-close btn-close-white" onClick={() => setShowFinalizar(false)}></button>
                                </div>
                                <div className="modal-body p-4 text-center">
                                    <div className="mb-3 bg-light p-3 rounded-3">
                                        <label className="fw-bold mb-2 small d-block">PESO ACTUAL</label>
                                        <div className="input-group">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={comportamientoData.peso}
                                                onChange={e => setComportamientoData({ ...comportamientoData, peso: e.target.value })}
                                            />
                                            <select
                                                className="form-select"
                                                style={{ maxWidth: '80px' }}
                                                value={comportamientoData.unidad}
                                                onChange={e => setComportamientoData({ ...comportamientoData, unidad: e.target.value })}
                                            >
                                                <option value="kg">kg</option>
                                                <option value="gr">gr</option>
                                            </select>
                                        </div>
                                    </div>
                                    <label className="fw-bold mb-3 d-block text-center small">¿CÓMO SE PORTÓ? *</label>
                                    <div className="d-flex justify-content-around mb-4">
                                        <button
                                            type="button"
                                            onClick={() => setComportamientoData({ ...comportamientoData, comportamiento: 'Bueno' })}
                                            className={`btn rounded-4 p-3 ${comportamientoData.comportamiento === 'Bueno' ? 'btn-success shadow' : 'btn-outline-success'}`}
                                            style={{ width: '30%' }}
                                        >
                                            <FontAwesomeIcon icon={faSmile} size="2x" /><br />Bueno
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setComportamientoData({ ...comportamientoData, comportamiento: 'Regular' })}
                                            className={`btn rounded-4 p-3 ${comportamientoData.comportamiento === 'Regular' ? 'btn-warning shadow' : 'btn-outline-warning'}`}
                                            style={{ width: '30%' }}
                                        >
                                            <FontAwesomeIcon icon={faMeh} size="2x" /><br />Regular
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setComportamientoData({ ...comportamientoData, comportamiento: 'Malo' })}
                                            className={`btn rounded-4 p-3 ${comportamientoData.comportamiento === 'Malo' ? 'btn-danger shadow' : 'btn-outline-danger'}`}
                                            style={{ width: '30%' }}
                                        >
                                            <FontAwesomeIcon icon={faFrown} size="2x" /><br />Malo
                                        </button>
                                    </div>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Observaciones obligatorias..."
                                        value={comportamientoData.observaciones}
                                        onChange={e => setComportamientoData({ ...comportamientoData, observaciones: e.target.value })}
                                        required
                                    ></textarea>
                                </div>
                                <div className="modal-footer border-0">
                                    <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => setShowFinalizar(false)}>
                                        CANCELAR
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-success flex-grow-1 rounded-pill fw-bold"
                                        disabled={!comportamientoData.comportamiento || !comportamientoData.observaciones.trim()}
                                    >
                                        GUARDAR
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showModal && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <form className="modal-content rounded-4 p-4 shadow-lg border-0" onSubmit={handleGuardarTurno}>
                                <h4 className="fw-bold mb-4">{datosEdicion ? '✏️ Editar Turno' : '📅 Nuevo Turno'}</h4>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Mascota *</label>
                                    <select
                                        value={formData.mascota_id}
                                        onChange={e => setFormData({ ...formData, mascota_id: e.target.value })}
                                        className="form-select rounded-pill"
                                        required
                                    >
                                        <option value="">Seleccioná...</option>
                                        {mascotas.map(m => (
                                            <option key={m.id} value={m.id}>{m.nombre} (de {m.dueno_nombre})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Servicio *</label>
                                    <select
                                        value={formData.tipo_servicio}
                                        onChange={e => setFormData({ ...formData, tipo_servicio: e.target.value })}
                                        className="form-select rounded-pill"
                                        required
                                    >
                                        {opcionesServicios.map(op => (
                                            <option key={op} value={op}>{op}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Fecha y Hora *</label>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small text-muted">Fecha</label>
                                            <input
                                                type="date"
                                                className={`form-control rounded-pill ${errorHorario ? 'is-invalid' : ''}`}
                                                value={formData.fecha ? formData.fecha.split('T')[0] : new Date().toISOString().split('T')[0]}
                                                onChange={handleFechaChange}
                                                required
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small text-muted">Hora</label>
                                            <input
                                                type="time"
                                                className={`form-control rounded-pill ${errorHorario ? 'is-invalid' : ''}`}
                                                value={formData.fecha ? formData.fecha.split('T')[1]?.substring(0, 5) || '09:00' : '09:00'}
                                                onChange={handleHoraChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {errorHorario && (
                                        <div className="invalid-feedback d-block mt-1 small text-danger">
                                            <FontAwesomeIcon icon={faCircleExclamation} className="me-1" /> {errorHorario}
                                        </div>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label small fw-bold">Motivo / Notas</label>
                                    <textarea
                                        className="form-control rounded-3"
                                        rows="2"
                                        value={formData.motivo}
                                        onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                                        placeholder="Ej: Baño completo, corte de uñas..."
                                    />
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); setErrorHorario(''); }}
                                        className="btn btn-light w-100 rounded-pill"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary w-100 rounded-pill fw-bold shadow"
                                        disabled={!!errorHorario || loadingMascotas}
                                    >
                                        {loadingMascotas ? <FontAwesomeIcon icon={faSpinner} spin /> : (datosEdicion ? 'ACTUALIZAR' : 'GUARDAR')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {confirmacion.show && (
                    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 3000 }}>
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content p-4 text-center rounded-4 border-0">
                                <FontAwesomeIcon icon={faExclamationTriangle} size="3x" className="text-danger mb-3" />
                                <h3 className="fw-bold">¿Eliminar turno?</h3>
                                <p className="text-muted">{confirmacion.nombreMascota}</p>
                                <div className="d-flex gap-2 mt-3">
                                    <button
                                        className="btn btn-light w-100 rounded-pill fw-bold"
                                        onClick={() => setConfirmacion({ show: false })}
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        className="btn btn-danger w-100 rounded-pill fw-bold"
                                        onClick={async () => {
                                            await api.delete(`/estetica/${confirmacion.id}`);
                                            setConfirmacion({ show: false });
                                            cargarDatos();
                                            mostrarAviso("🗑️ Turno eliminado", "success");
                                        }}
                                    >
                                        ELIMINAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EsteticaPage;