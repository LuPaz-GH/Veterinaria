import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCalendarCheck, faPlus, faPencilAlt, faTrash, faSearch, 
    faStethoscope, faClock, faCalendarDay, faFilePdf, faFileExcel, 
    faPaw, faTimes, faInfoCircle, faUser, faNotesMedical, faTag, faWeightHanging, faClipboardList, faPrescriptionBottleMedical,
    faCheckCircle // Nuevo icono para el éxito
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import api from '../services/api';  // ← IMPORTAMOS AXIOS CON TOKEN AUTOMÁTICO

// Librerías de exportación
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const TurnosPage = ({ user }) => {
    const [turnos, setTurnos] = useState([]);
    const [mascotas, setMascotas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showAtencion, setShowAtencion] = useState(false);
    const [showDetalle, setShowDetalle] = useState(false); 
    const [showSuccess, setShowSuccess] = useState(false); // NUEVO ESTADO PARA EL MODAL DE ÉXITO
    const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isNuevaMascota, setIsNuevaMascota] = useState(false);

    // Estado para la notificación flotante profesional
    const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });

    const mostrarAviso = (mensaje, tipo = 'success') => {
        setNotificacion({ show: true, mensaje, tipo });
        setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 5000);
    };

    const [nuevoTurno, setNuevoTurno] = useState({
        mascota_id: '', dueno_id: '', fecha: '', tipo: 'consulta', motivo: '',
        nueva_mascota_nombre: '', nueva_mascota_especie: 'Perro', nueva_mascota_raza: '',
        nuevo_dueno_nombre: '', nuevo_dueno_telefono: ''
    });

    const [datosAtencion, setDatosAtencion] = useState({
        peso: '', unidad: 'kg', diagnostico: '', tratamiento: ''
    });

    const cargarDatos = async () => {
        try {
            const ts = Date.now();
            const [resT, resM] = await Promise.all([
                api.get(`/turnos?t=${ts}`),
                api.get(`/mascotas?t=${ts}`)
            ]);
            setTurnos(Array.isArray(resT.data) ? resT.data : []);
            setMascotas(Array.isArray(resM.data) ? resM.data : []);
        } catch (err) { 
            console.error("Error al cargar datos:", err);
            if (err.response?.status === 401) {
                mostrarAviso("Sesión expirada. Por favor, inicia sesión nuevamente.", "error");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            } else {
                mostrarAviso("No se pudieron cargar los turnos o mascotas. Revisa la conexión.", "error");
            }
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    // --- REPORTES ---
    const exportarExcel = () => {
        if (turnosFiltrados.length === 0) {
            mostrarAviso("No hay turnos para exportar", "error");
            return;
        }
        const ws = XLSX.utils.json_to_sheet(turnosFiltrados.map(t => ({
            Fecha: new Date(t.fecha).toLocaleString('es-AR'),
            Mascota: t.mascota_nombre, Dueño: t.dueno_nombre,
            Tipo: t.tipo.toUpperCase(), Estado: t.estado.toUpperCase()
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Turnos");
        XLSX.writeFile(wb, "Agenda_Turnos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        if (turnosFiltrados.length === 0) {
            mostrarAviso("No hay turnos para exportar", "error");
            return;
        }
        const doc = new jsPDF();
        doc.text("Malfi Veterinaria - Agenda de Turnos", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Fecha', 'Mascota', 'Dueño', 'Tipo', 'Estado']],
            body: turnosFiltrados.map(t => [new Date(t.fecha).toLocaleString(), t.mascota_nombre, t.dueno_nombre, t.tipo, t.estado]),
            headStyles: { fillColor: [102, 51, 153] }
        });
        doc.save("Agenda_Turnos_Malfi.pdf");
    };

    // --- GUARDAR / EDITAR TURNO ---
    const guardarTurno = async (e) => {
        e.preventDefault();
        let body = { ...nuevoTurno };

        if (isNuevaMascota) {
            body = {
                ...body,
                es_nueva_mascota: true,
                mascota_nombre: nuevoTurno.nueva_mascota_nombre?.trim() || '',
                especie: nuevoTurno.nueva_mascota_especie,
                raza: nuevoTurno.nueva_mascota_raza?.trim() || null,
                dueno_nombre: nuevoTurno.nuevo_dueno_nombre?.trim() || '',
                dueno_telefono: nuevoTurno.nuevo_dueno_telefono?.trim() || null,
                mascota_id: null,
                dueno_id: null
            };
        } else {
            delete body.nueva_mascota_nombre;
            delete body.nueva_mascota_especie;
            delete body.nueva_mascota_raza;
            delete body.nuevo_dueno_nombre;
            delete body.nuevo_dueno_telefono;
        }

        if (!body.fecha) {
            mostrarAviso("La fecha y hora son obligatorias", "error");
            return;
        }
        if (isNuevaMascota && (!body.mascota_nombre || !body.dueno_nombre)) {
            mostrarAviso("Nombre de mascota y nombre del dueño son obligatorios", "error");
            return;
        }

        try {
            const url = datosEdicion 
                ? `/turnos/${datosEdicion.id}` 
                : '/turnos';

            const method = datosEdicion ? 'PUT' : 'POST';

            await api({
                url,
                method,
                data: body
            });

            setShowModal(false);
            setIsNuevaMascota(false);
            setDatosEdicion(null);
            setNuevoTurno({
                mascota_id: '', dueno_id: '', fecha: '', tipo: 'consulta', motivo: '',
                nueva_mascota_nombre: '', nueva_mascota_especie: 'Perro', nueva_mascota_raza: '',
                nuevo_dueno_nombre: '', nuevo_dueno_telefono: ''
            });

            await cargarDatos();
            
        } catch (err) {
            console.error("Error al guardar turno:", err);

            const errorMsg = (err.response?.data?.error || err.message || '').toLowerCase();

            if (
                err.response?.status === 409 ||
                errorMsg.includes('ocupado') ||
                errorMsg.includes('horario ya está') ||
                errorMsg.includes('horario_ocu')
            ) {
                mostrarAviso(
                    "¡Uy! 😅 Ese horario ya está ocupado...\n\n" +
                    "Alguien reservó justo antes que vos.\n" +
                    "Elegí otro día u otra hora, ¡seguro hay uno perfecto para tu mascota! 🐶🐱",
                    "error"
                );
            } else {
                mostrarAviso(
                    "¡Algo salió mal! 😓\n\n" +
                    "Hubo un problema al conectar con el servidor.\n" +
                    "Intentá de nuevo en unos segundos.\n\n" +
                    "Si sigue fallando, contáctanos por favor.",
                    "error"
                );
            }
        }
    };

    const handleConfirmarEliminar = async () => {
        try {
            await api.delete(`/turnos/${idToDelete}`);
            setShowConfirm(false);
            setIdToDelete(null);
            await cargarDatos();
        } catch (err) {
            console.error("Error al eliminar turno:", err);
            mostrarAviso("No se pudo eliminar el turno", "error");
        }
    };

    const finalizarAtencion = async (e) => {
        e.preventDefault();

        if (!turnoSeleccionado?.id || !turnoSeleccionado?.mascota_id || !user?.id) {
            mostrarAviso("Faltan datos del turno o del veterinario. Recarga la página.", "error");
            return;
        }

        if (!datosAtencion.peso || !datosAtencion.diagnostico?.trim() || !datosAtencion.tratamiento?.trim()) {
            mostrarAviso("Completa todos los campos: peso, diagnóstico y tratamiento.", "error");
            return;
        }

        const pesoFinal = `${datosAtencion.peso?.trim() || '0'} ${datosAtencion.unidad || 'kg'}`;

        try {
            await api.post(`/turnos/${turnoSeleccionado.id}/atender`, { 
                ...datosAtencion, 
                peso: pesoFinal,
                veterinario_id: user.id, 
                mascota_id: turnoSeleccionado.mascota_id 
            });

            setShowAtencion(false);
            setDatosAtencion({ peso: '', unidad: 'kg', diagnostico: '', tratamiento: '' });
            await cargarDatos();
            setShowSuccess(true); // MOSTRAMOS EL NUEVO MODAL DE ÉXITO
        } catch (err) {
            console.error("Error al finalizar atención:", err);
            mostrarAviso("Error de conexión con el servidor:\n" + (err.response?.data?.message || err.message), "error");
        }
    };

    const prepararEdicion = (t) => {
        setDatosEdicion(t);
        setIsNuevaMascota(false);
        setNuevoTurno({
            mascota_id: t.mascota_id,
            dueno_id: t.dueno_id,
            fecha: t.fecha.substring(0, 16),
            tipo: t.tipo,
            motivo: t.motivo || ''
        });
        setShowModal(true);
    };

    // Evitamos crash si turnos no es array
    const turnosFiltrados = Array.isArray(turnos) 
        ? turnos.filter(t => 
            (t.mascota_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (t.dueno_nombre || '').toLowerCase().includes(busqueda.toLowerCase())
          )
        : [];

    const gruposPorFecha = turnosFiltrados.reduce((grupos, turno) => {
        const d = new Date(turno.fecha);
        const fechaKey = isNaN(d) ? "Fecha no definida" : d.toLocaleDateString('es-AR');
        if (!grupos[fechaKey]) grupos[fechaKey] = [];
        grupos[fechaKey].push(turno);
        return grupos;
    }, {});

    const hoyStr = new Date().toLocaleDateString('es-AR');
    const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a, b) => {
        if (a === hoyStr) return -1;
        if (b === hoyStr) return 1;
        const convertirFecha = (f) => {
            const p = f.split('/');
            return new Date(`${p[2]}-${p[1]}-${p[0]}`);
        };
        const dateA = convertirFecha(a);
        const dateB = convertirFecha(b);
        const hoyDate = new Date();
        hoyDate.setHours(0, 0, 0, 0);
        const esFuturoA = dateA > hoyDate;
        const esFuturoB = dateB > hoyDate;
        if (esFuturoA && !esFuturoB) return -1;
        if (!esFuturoA && esFuturoB) return 1;
        return esFuturoA ? dateA - dateB : dateB - dateA;
    });

    return (
        <div 
            className="min-vh-100 p-4 p-md-5 position-relative" 
            style={{ 
                backgroundImage: `url('https://i.pinimg.com/1200x/0f/72/c3/0f72c33debe887dd051042d7642024b0.jpg')`, 
                backgroundSize: 'cover', 
                backgroundAttachment: 'fixed', 
                backgroundPosition: 'center' 
            }}
        >
            <div className="position-relative z-1">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        <FontAwesomeIcon icon={faCalendarCheck} className="me-3" /> Agenda Veterinaria
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF} title="PDF"><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel} title="Excel"><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setIsNuevaMascota(false); setShowModal(true); }}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
                        </button>
                    </div>
                </div>

                <div className="mb-5 d-flex justify-content-center">
                    <div className="input-group input-group-md shadow rounded-pill overflow-hidden" style={{ maxWidth: '500px', backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(5px)' }}>
                        <span className="input-group-text bg-transparent border-0 ps-3 pe-2"><FontAwesomeIcon icon={faSearch} className="text-success" /></span>
                        <input type="text" className="form-control border-0 py-2 bg-transparent" placeholder="Buscar por mascota o dueño..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        {busqueda && <button className="btn border-0 text-muted pe-3" onClick={() => setBusqueda('')}><FontAwesomeIcon icon={faTimes} /></button>}
                    </div>
                </div>

                {Object.keys(gruposPorFecha).length === 0 ? (
                    <div className="text-center text-white py-5">
                        <FontAwesomeIcon icon={faCalendarCheck} size="4x" className="mb-3 opacity-75" />
                        <h5 className="opacity-75">No hay turnos registrados</h5>
                    </div>
                ) : (
                    fechasOrdenadas.map(fecha => (
                        <div key={fecha} className="mb-5">
                            <h4 className="text-white mb-4 d-flex align-items-center" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                                <FontAwesomeIcon icon={faCalendarDay} className="me-2 text-warning" /> {fecha}
                            </h4>
                            <div className="row g-4">
                                {gruposPorFecha[fecha].map(t => (
                                    <div className="col-md-6 col-lg-4" key={t.id}>
                                        <div 
                                            className={`card border-0 shadow-lg p-4 rounded-4 transition-card ${t.estado === 'realizado' ? 'opacity-75' : ''}`}
                                            style={{ 
                                                cursor: 'pointer', 
                                                backgroundColor: 'rgba(255, 255, 255, 0.75)', 
                                                backdropFilter: 'blur(10px)',
                                                border: '1px solid rgba(255, 255, 255, 0.3)'
                                            }}
                                            onClick={() => { setTurnoSeleccionado(t); setShowDetalle(true); }}
                                        >
                                            <div className="d-flex justify-content-between mb-2">
                                                <h5 className="fw-bold mb-0 text-primary">{t.mascota_nombre}</h5>
                                                <span className="small text-muted fw-bold"><FontAwesomeIcon icon={faClock} /> {new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="mb-1 small">Dueño: <strong>{t.dueno_nombre}</strong></p>
                                            <p className="mb-3 small">Tipo: <span className="badge bg-primary bg-opacity-75 text-white">{t.tipo.toUpperCase()}</span></p>
                                            <div className="d-flex gap-2">
                                                {t.estado === 'pendiente' && (user.rol === 'veterinario' || user.rol === 'admin') && (
                                                    <button className="btn btn-success btn-sm rounded-pill flex-grow-1 fw-bold shadow-sm" onClick={(e) => { e.stopPropagation(); setTurnoSeleccionado(t); setShowAtencion(true); }}>ATENDER</button>
                                                )}
                                                <button className="btn btn-white btn-sm rounded-circle shadow-sm text-primary border" onClick={(e) => { e.stopPropagation(); prepararEdicion(t); }}><FontAwesomeIcon icon={faPencilAlt} /></button>
                                                <button className="btn btn-white btn-sm rounded-circle shadow-sm text-danger border" onClick={(e) => { e.stopPropagation(); setIdToDelete(t.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* MODAL DE NOTIFICACIÓN PROFESIONAL */}
            {notificacion.show && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '2.5rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                        position: 'relative',
                        borderTop: `8px solid ${notificacion.tipo === 'success' ? '#28a745' : '#dc3545'}`,
                        textAlign: 'center',
                        animation: 'popIn 0.3s ease-out'
                    }}>
                        <h2 style={{
                            margin: '0 0 1.5rem 0',
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            color: notificacion.tipo === 'success' ? '#28a745' : '#dc3545'
                        }}>
                            {notificacion.tipo === 'success' ? '¡Éxito!' : 'Atención'}
                        </h2>

                        <p style={{
                            whiteSpace: 'pre-line',
                            margin: '0 0 2rem 0',
                            fontSize: '1.15rem',
                            lineHeight: '1.6',
                            color: '#333'
                        }}>
                            {notificacion.mensaje}
                        </p>

                        <button
                            onClick={() => setNotificacion({ show: false, mensaje: '', tipo: 'success' })}
                            style={{
                                padding: '0.9rem 2.8rem',
                                background: notificacion.tipo === 'success' ? '#28a745' : '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50px',
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                                transition: 'all 0.25s'
                            }}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL DETALLE */}
            {showDetalle && turnoSeleccionado && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1060, backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden" style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                            <div className="modal-header border-0 text-white p-4" style={{ background: 'linear-gradient(135deg, #663399 0%, #8e44ad 100%)' }}>
                                <h5 className="modal-title fw-bold">
                                    <FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Ficha del Turno
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetalle(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <div className="text-center mb-4">
                                    <div className="bg-white rounded-circle d-inline-flex p-4 shadow-sm border border-5 border-primary border-opacity-10">
                                        <FontAwesomeIcon icon={faPaw} size="3x" className="text-primary" />
                                    </div>
                                </div>
                                <div className="list-group border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
                                        <FontAwesomeIcon icon={faPaw} className="text-muted" style={{width:'20px'}} />
                                        <div>
                                            <small className="text-muted d-block fw-bold text-uppercase">Paciente</small>
                                            <span className="fs-5 fw-bold text-primary">{turnoSeleccionado.mascota_nombre}</span>
                                        </div>
                                    </div>
                                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
                                        <FontAwesomeIcon icon={faUser} className="text-muted" style={{width:'20px'}} />
                                        <div>
                                            <small className="text-muted d-block fw-bold text-uppercase">Dueño</small>
                                            <span className="fs-5">{turnoSeleccionado.dueno_nombre}</span>
                                        </div>
                                    </div>
                                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0 border-bottom">
                                        <FontAwesomeIcon icon={faTag} className="text-muted" style={{width:'20px'}} />
                                        <div>
                                            <small className="text-muted d-block fw-bold text-uppercase">Tipo de Servicio</small>
                                            <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill mt-1">{turnoSeleccionado.tipo.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="list-group-item d-flex align-items-center gap-3 py-3 border-0">
                                        <FontAwesomeIcon icon={faClock} className="text-muted" style={{width:'20px'}} />
                                        <div>
                                            <small className="text-muted d-block fw-bold text-uppercase">Horario Programado</small>
                                            <span className="fs-6">{new Date(turnoSeleccionado.fecha).toLocaleDateString()} - {new Date(turnoSeleccionado.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-white rounded-4 shadow-sm border-start border-5 border-warning">
                                    <small className="text-muted d-block fw-bold text-uppercase mb-2"><FontAwesomeIcon icon={faNotesMedical} className="me-2 text-warning" /> Motivo de la visita</small>
                                    <p className="mb-0 text-dark" style={{ whiteSpace: 'pre-line' }}>{turnoSeleccionado.motivo || "Sin observaciones adicionales registradas."}</p>
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-4">
                                <button className="btn btn-secondary w-100 rounded-pill fw-bold py-2 shadow-sm" onClick={() => setShowDetalle(false)}>CERRAR FICHA</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO / EDITAR TURNO */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <form className="modal-content rounded-4 border-0 shadow-lg p-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)' }} onSubmit={guardarTurno}>
                            <h4 className="fw-bold mb-4">{datosEdicion ? '📝 Editar Turno' : '📅 Nuevo Turno'}</h4>
                            <div className="mb-3">
                                <label className="form-label fw-bold small">Mascota</label>
                                <select className="form-select rounded-3 shadow-sm" value={isNuevaMascota ? 'nueva' : nuevoTurno.mascota_id} onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'nueva') {
                                        setIsNuevaMascota(true);
                                        setNuevoTurno({...nuevoTurno, mascota_id: ''});
                                    } else {
                                        setIsNuevaMascota(false);
                                        const m = mascotas.find(mas => mas.id == val);
                                        if(m) setNuevoTurno({...nuevoTurno, mascota_id: val, dueno_id: m.dueno_id});
                                    }
                                }} required>
                                    <option value="">Selecciona mascota...</option>
                                    <option value="nueva" className="fw-bold text-primary">+ Nueva mascota y dueño</option>
                                    {mascotas.map(m => ( <option key={m.id} value={m.id}>{m.nombre} (Dueño: {m.dueno_nombre})</option> ))}
                                </select>
                            </div>
                            {isNuevaMascota && (
                                <div className="p-3 rounded-3 mb-3 shadow-sm border" style={{ backgroundColor: 'rgba(0, 123, 255, 0.05)' }}>
                                    <h6 className="fw-bold text-primary mb-3"><FontAwesomeIcon icon={faPaw} /> Datos del nuevo paciente</h6>
                                    <div className="row g-2 mb-2">
                                        <div className="col-6"><input type="text" className="form-control shadow-sm" placeholder="Nombre Mascota *" value={nuevoTurno.nueva_mascota_nombre || ''} onChange={e => setNuevoTurno({...nuevoTurno, nueva_mascota_nombre: e.target.value})} required /></div>
                                        <div className="col-6"><select className="form-select shadow-sm" value={nuevoTurno.nueva_mascota_especie} onChange={e => setNuevoTurno({...nuevoTurno, nueva_mascota_especie: e.target.value})}><option value="Perro">Perro</option><option value="Gato">Gato</option></select></div>
                                    </div>
                                    <input type="text" className="form-control mb-2 shadow-sm" placeholder="Raza" value={nuevoTurno.nueva_mascota_raza || ''} onChange={e => setNuevoTurno({...nuevoTurno, nueva_mascota_raza: e.target.value})} />
                                    <input type="text" className="form-control mb-2 shadow-sm" placeholder="Nombre del Dueño *" value={nuevoTurno.nuevo_dueno_nombre || ''} onChange={e => setNuevoTurno({...nuevoTurno, nuevo_dueno_nombre: e.target.value})} required />
                                    <input type="text" className="form-control shadow-sm" placeholder="Teléfono Dueño" value={nuevoTurno.nuevo_dueno_telefono || ''} onChange={e => setNuevoTurno({...nuevoTurno, nuevo_dueno_telefono: e.target.value})} />
                                </div>
                            )}
                            <div className="mb-3">
                                <label className="form-label fw-bold small">Fecha y Hora</label>
                                <input type="datetime-local" className="form-control rounded-3 shadow-sm" value={nuevoTurno.fecha} onChange={(e) => setNuevoTurno({...nuevoTurno, fecha: e.target.value})} required />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-bold small">Tipo de Atención</label>
                                <select className="form-select rounded-3 shadow-sm" value={nuevoTurno.tipo} onChange={(e) => setNuevoTurno({...nuevoTurno, tipo: e.target.value})}>
                                    <option value="consulta">Consulta Médica</option>
                                    <option value="vacunacion">Vacunación</option>
                                    <option value="cirugia">Cirugía</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="form-label fw-bold small">Motivo</label>
                                <textarea className="form-control rounded-3 shadow-sm" rows="2" value={nuevoTurno.motivo} onChange={(e) => setNuevoTurno({...nuevoTurno, motivo: e.target.value})}></textarea>
                            </div>
                            <div className="d-flex gap-2 mt-4">
                                <button type="button" className="btn btn-light w-100 rounded-pill py-2 shadow-sm" onClick={() => { setShowModal(false); setIsNuevaMascota(false); setDatosEdicion(null); }}>Cerrar</button>
                                <button type="submit" className="btn btn-success w-100 rounded-pill fw-bold shadow py-2" disabled={!nuevoTurno.fecha}>{datosEdicion ? 'ACTUALIZAR TURNO' : 'GUARDAR TURNO'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ATENCIÓN MÉDICA */}
            {showAtencion && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(3px)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <form className="modal-content rounded-4 border-0 shadow-lg overflow-hidden" onSubmit={finalizarAtencion}>
                            <div className="modal-header border-0 text-white p-4" style={{ background: 'linear-gradient(135deg, #198754 0%, #157347 100%)' }}>
                                <div>
                                    <h4 className="modal-title fw-bold mb-1">
                                        <FontAwesomeIcon icon={faStethoscope} className="me-2" /> 
                                        Atención Médica en Curso
                                    </h4>
                                    <p className="mb-0 opacity-75 small">Paciente: <strong>{turnoSeleccionado?.mascota_nombre}</strong> (Dueño: {turnoSeleccionado?.dueno_nombre})</p>
                                </div>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowAtencion(false)}></button>
                            </div>

                            <div className="modal-body p-4 bg-light bg-opacity-50">
                                <div className="row g-4">
                                    <div className="col-md-5">
                                        <div className="bg-white p-3 rounded-4 shadow-sm border h-100">
                                            <label className="form-label fw-bold text-success small mb-3">
                                                <FontAwesomeIcon icon={faWeightHanging} className="me-2" /> 
                                                Registro de Peso
                                            </label>
                                            <div className="input-group input-group-lg">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    className="form-control border-end-0 rounded-start-4" 
                                                    placeholder="0.00"
                                                    value={datosAtencion.peso} 
                                                    onChange={(e) => setDatosAtencion({...datosAtencion, peso: e.target.value})} 
                                                    required 
                                                />
                                                <select 
                                                    className="form-select rounded-end-4 flex-grow-0" 
                                                    style={{width: '90px', backgroundColor: '#f8f9fa'}}
                                                    value={datosAtencion.unidad}
                                                    onChange={(e) => setDatosAtencion({...datosAtencion, unidad: e.target.value})}
                                                >
                                                    <option value="kg">kg</option>
                                                    <option value="gr">gr</option>
                                                </select>
                                            </div>
                                            <small className="text-muted d-block mt-2">Ingrese el peso actual del paciente.</small>
                                        </div>
                                    </div>

                                    <div className="col-md-7">
                                        <div className="bg-white p-3 rounded-4 shadow-sm border mb-3">
                                            <label className="form-label fw-bold text-success small mb-2">
                                                <FontAwesomeIcon icon={faClipboardList} className="me-2" /> 
                                                Diagnóstico Médico
                                            </label>
                                            <textarea 
                                                className="form-control border-0 bg-light rounded-3" 
                                                rows="3" 
                                                placeholder="Describa el estado y hallazgos..."
                                                value={datosAtencion.diagnostico} 
                                                onChange={(e) => setDatosAtencion({...datosAtencion, diagnostico: e.target.value})} 
                                                required 
                                                style={{ resize: 'none' }}
                                            />
                                        </div>
                                        <div className="bg-white p-3 rounded-4 shadow-sm border">
                                            <label className="form-label fw-bold text-success small mb-2">
                                                <FontAwesomeIcon icon={faPrescriptionBottleMedical} className="me-2" /> 
                                                Tratamiento y Receta
                                            </label>
                                            <textarea 
                                                className="form-control border-0 bg-light rounded-3" 
                                                rows="3" 
                                                placeholder="Medicación, dosis y recomendaciones..."
                                                value={datosAtencion.tratamiento} 
                                                onChange={(e) => setDatosAtencion({...datosAtencion, tratamiento: e.target.value})} 
                                                required 
                                                style={{ resize: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer border-0 p-4 bg-white d-flex gap-3">
                                <button type="button" className="btn btn-outline-secondary px-4 rounded-pill fw-bold" onClick={() => setShowAtencion(false)}>
                                    CANCELAR
                                </button>
                                <button type="submit" className="btn btn-success flex-grow-1 rounded-pill fw-bold shadow-sm py-2">
                                    <FontAwesomeIcon icon={faCalendarCheck} className="me-2" />
                                    FINALIZAR Y GUARDAR ATENCIÓN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ────────────── NUEVO MODAL DE ÉXITO ESTILO MALFI ────────────── */}
            {showSuccess && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000, backdropFilter: 'blur(5px)' }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div className="modal-content border-0 rounded-5 shadow-lg text-center p-5 position-relative overflow-visible">
                            {/* Icono de Check flotante superior */}
                            <div 
                                className="position-absolute start-50 translate-middle-x bg-white rounded-circle shadow"
                                style={{ top: '-40px', padding: '10px' }}
                            >
                                <FontAwesomeIcon 
                                    icon={faCheckCircle} 
                                    size="4x" 
                                    style={{ color: '#2ecc71', filter: 'drop-shadow(0 0 10px rgba(46, 204, 113, 0.4))' }} 
                                />
                            </div>
                            
                            <div className="mt-4">
                                <h2 className="fw-bold mb-3" style={{ color: '#2c3e50' }}>¡Éxito!</h2>
                                <p className="text-muted mb-4 fs-5">¡Atención finalizada y guardada con éxito!</p>
                                
                                <button 
                                    className="btn w-100 rounded-pill py-3 fw-bold text-white shadow-sm border-0" 
                                    style={{ 
                                        backgroundColor: '#7D3C4A', 
                                        transition: 'all 0.3s ease' 
                                    }}
                                    onClick={() => setShowSuccess(false)}
                                    onMouseOver={(e) => e.target.style.filter = 'brightness(1.1)'}
                                    onMouseOut={(e) => e.target.style.filter = 'brightness(1)'}
                                >
                                    Hecho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                show={showConfirm} 
                onClose={() => setShowConfirm(false)} 
                onConfirm={handleConfirmarEliminar} 
                title="¿Eliminar Turno?" 
                message="Esta acción no se puede deshacer." 
            />
        </div>
    );
};

export default TurnosPage;