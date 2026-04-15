import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarCheck, faPlus, faPencilAlt, faTrash, faSearch,
    faStethoscope, faClock, faCalendarDay, faFilePdf, faFileExcel,
    faPaw, faTimes, faInfoCircle, faUser, faNotesMedical, faTag, faWeightHanging, faClipboardList, faPrescriptionBottleMedical,
    faCheckCircle, faCalendarAlt, faPrint, faSpinner, faTrashRestore,
    faChevronLeft, faChevronRight, faHistory, faArrowLeft, faAmbulance, faExclamationTriangle, faUserMd, faRandom, faHourglassStart
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
    const [busquedaPapelera, setBusquedaPapelera] = useState('');
    const [mascotas, setMascotas] = useState([]);
    const [veterinarios, setVeterinarios] = useState([]);
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
    // NUEVOS ESTADOS PARA VALIDACIÓN DE TURNOS
    const [turnosDelDia, setTurnosDelDia] = useState([]);
    const [horarioDisponible, setHorarioDisponible] = useState(true);
    const [mensajeSolapamiento, setMensajeSolapamiento] = useState('');
    const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);
    const [disponibilidadPorMedico, setDisponibilidadPorMedico] = useState({});
    // ✅ NUEVOS ESTADOS PARA SELECTOR VISUAL DE HORAS CON COLORES
    const [horariosOcupados, setHorariosOcupados] = useState({});
    const [showTimeSelector, setShowTimeSelector] = useState(false);
    // DURACIONES DISPONIBLES PARA TURNOS
    const duracionesDisponibles = [
        { valor: 10, etiqueta: '10 min' },
        { valor: 15, etiqueta: '15 min' },
        { valor: 20, etiqueta: '20 min' },
        { valor: 30, etiqueta: '30 min' }
    ];
    const [nuevoTurno, setNuevoTurno] = useState({
        mascota_id: '', dueno_id: '', fecha: '', hora: '', veterinario_id: 'aleatorio', tipo: 'consulta', motivo: '', es_urgencia: false, duracion: 15
    });
    // ACTUALIZADO: Nuevos campos para paciente no registrado en urgencias (CON DNI)
    const [datosAtencion, setDatosAtencion] = useState({
        peso: '',
        unidad: 'kg',
        diagnostico: '',
        tratamiento: '',
        mascota_id: '',
        veterinario_id: '',
        esPacienteNuevo: false,
        sinDueno: false,
        nuevoPaciente_nombre: '',
        nuevoPaciente_especie: '',
        nuevoPaciente_raza: '',
        nuevoPaciente_edad: '',
        nuevoDueno_nombre: '',
        nuevoDueno_dni: '',
        nuevoDueno_telefono: ''
    });
    // CARGAR VETERINARIOS
    const cargarVeterinarios = async () => {
        try {
            const res = await api.get('/empleados');
            const vets = res.data.filter(e => e.rol === 'veterinario' && e.activo === 1);
            setVeterinarios(vets);
        } catch (err) {
            console.error('Error al cargar veterinarios:', err);
        }
    };
    // ✅ FUNCIÓN SIMPLE PARA CARGAR HORARIOS OCUPADOS
    const cargarHorariosOcupados = async (fecha, veterinarioId) => {
        if (!fecha) {
            setHorariosOcupados({});
            return;
        }
     
        try {
            const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
            const res = await api.get('/turnos', { params: { fecha: fechaStr } });
            const turnos = res.data.data || [];
         
            const turnosFiltrados = veterinarioId === 'aleatorio' || !veterinarioId
                ? turnos
                : turnos.filter(t => !t.veterinario_id || t.veterinario_id == veterinarioId);
         
            const ocupados = {};
            turnosFiltrados.forEach(turno => {
                if (turno.estado === 'cancelado') return;
             
                const fechaTurno = turno.fecha.includes('T') ? turno.fecha : turno.fecha.replace(' ', 'T');
                const horaKey = fechaTurno.substring(11, 16);
             
                ocupados[horaKey] = {
                    ocupado: true,
                    mascota: turno.mascota_nombre,
                    tipo: turno.tipo
                };
            });
         
            console.log('📅 Horarios ocupados:', Object.keys(ocupados).length);
            setHorariosOcupados(ocupados);
        } catch (err) {
            console.error('Error cargando horarios:', err);
            setHorariosOcupados({});
        }
    };
    // ✅ FUNCIÓN CORREGIDA PARA VERIFICAR DISPONIBILIDAD DE HORARIO POR MÉDICO
    const verificarDisponibilidadHorario = async (fecha, hora, duracion, veterinarioId, turnoIdExcluir = null) => {
        if (!fecha || !hora) return true;
     
        setVerificandoDisponibilidad(true);
     
        try {
            const fechaStr = fecha.includes('T') ? fecha.split('T')[0] : fecha;
            const res = await api.get('/turnos', { params: { fecha: fechaStr } });
            const turnosExistentes = res.data.data || [];
         
            const [fechaSel, horaSel] = fecha.includes('T') ? fecha.split('T') : [fecha, hora];
            const inicioNuevo = new Date(`${fechaSel}T${horaSel}`);
            const finNuevo = new Date(inicioNuevo.getTime() + (duracion * 60000));
         
            const turnosFiltrados = turnosExistentes.filter(turno => {
                if (turno.id === turnoIdExcluir) return false;
                if (veterinarioId === 'aleatorio' || !veterinarioId) return true;
                if (!turno.veterinario_id) return true;
                return turno.veterinario_id == veterinarioId;
            });
         
            const haySolapamiento = turnosFiltrados.some(turno => {
                if (turno.estado === 'cancelado') return false;
             
                const fechaTurno = turno.fecha.includes('T') ? turno.fecha : turno.fecha.replace(' ', 'T');
                const inicioExistente = new Date(fechaTurno);
                const duracionExistente = turno.duracion || 15;
                const finExistente = new Date(inicioExistente.getTime() + (duracionExistente * 60000));
             
                const seSolapan = (inicioNuevo < finExistente && finNuevo > inicioExistente);
             
                return seSolapan;
            });
         
            setHorarioDisponible(!haySolapamiento);
         
            if (haySolapamiento) {
                const medicoNombre = veterinarioId === 'aleatorio' || !veterinarioId
                    ? 'algún médico'
                    : veterinarios.find(v => v.id == veterinarioId)?.nombre || 'el médico';
                setMensajeSolapamiento(
                    `⚠️ ${medicoNombre} ya tiene un turno en ese horario. El turno de ${duracion} minutos se superpone.`
                );
            } else {
                setMensajeSolapamiento('');
            }
         
            const disponibilidad = {};
            if (veterinarioId === 'aleatorio' || !veterinarioId) {
                veterinarios.forEach(vet => {
                    const turnosVet = turnosExistentes.filter(t => {
                        if (!t.veterinario_id) return true;
                        return t.veterinario_id == vet.id && t.estado !== 'cancelado';
                    });
                    disponibilidad[vet.id] = {
                        nombre: vet.nombre,
                        turnosOcupados: turnosVet.length,
                        disponible: true
                    };
                });
                setDisponibilidadPorMedico(disponibilidad);
            }
         
            return !haySolapamiento;
        } catch (err) {
            console.warn('⚠️ Error al verificar disponibilidad:', err.message);
            setHorarioDisponible(true);
            return true;
        } finally {
            setVerificandoDisponibilidad(false);
        }
    };
    // ✅ EFFECT PARA CARGAR HORARIOS OCUPADOS CUANDO CAMBIA LA FECHA O VETERINARIO
    useEffect(() => {
        if (showModal && nuevoTurno.fecha) {
            cargarHorariosOcupados(nuevoTurno.fecha, nuevoTurno.veterinario_id);
        }
    }, [showModal, nuevoTurno.fecha, nuevoTurno.veterinario_id]);
    // ✅ EFFECT PARA VERIFICAR DISPONIBILIDAD
    useEffect(() => {
        if (nuevoTurno.fecha && nuevoTurno.hora && showModal) {
            const timeoutId = setTimeout(() => {
                verificarDisponibilidadHorario(
                    nuevoTurno.fecha,
                    nuevoTurno.hora,
                    nuevoTurno.duracion || 15,
                    nuevoTurno.veterinario_id,
                    datosEdicion?.id
                );
            }, 300);
         
            return () => clearTimeout(timeoutId);
        }
    }, [nuevoTurno.fecha, nuevoTurno.hora, nuevoTurno.duracion, nuevoTurno.veterinario_id, showModal, datosEdicion?.id]);
    // CARGAR DATOS AL INICIAR
    useEffect(() => {
        cargarVeterinarios();
    }, []);
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
            Veterinario: t.veterinario_nombre || 'Aleatorio',
            Tipo: t.tipo.toUpperCase(),
            Motivo: t.motivo || '',
            Duración: `${t.duracion || 15} min`
        }));
        const ws = XLSX.utils.json_to_sheet(dataParaExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Agenda");
        XLSX.writeFile(wb, `Agenda_Turnos_${filtroFecha}.xlsx`);
    };
    const exportarPDFGeneral = () => {
        const doc = new jsPDF();
        doc.text(`Reporte de Agenda - ${filtroFecha.toUpperCase()}`, 14, 15);
        const columns = ["Fecha", "Hora", "Mascota", "Dueño", "Veterinario", "Tipo", "Duración"];
        const rows = obtenerTurnosProcesados().map(t => [
            new Date(t.fecha).toLocaleDateString(),
            new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            t.mascota_nombre,
            t.dueno_nombre,
            t.veterinario_nombre || 'Aleatorio',
            t.tipo.toUpperCase(),
            `${t.duracion || 15} min`
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
            doc.setFont("helvetica", "bold"); doc.text("Veterinario:", 10, 71);
            doc.setFont("helvetica", "normal"); doc.text(String(t.veterinario_nombre || 'Aleatorio'), 32, 71);
            doc.setFont("helvetica", "bold"); doc.text("Teléfono:", 10, 79);
            doc.setFont("helvetica", "normal"); doc.text(String(t.dueno_telefono || 'No reg.'), 32, 79);
            doc.setFont("helvetica", "bold"); doc.text("Fecha:", 10, 87);
            doc.setFont("helvetica", "normal"); doc.text(new Date(t.fecha).toLocaleDateString('es-AR'), 32, 87);
            doc.setFont("helvetica", "bold"); doc.text("Hora:", 10, 95);
            doc.setFont("helvetica", "normal"); doc.text(new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " hs", 32, 95);
            doc.setFont("helvetica", "bold"); doc.text("Tipo:", 10, 103);
            doc.setFont("helvetica", "normal"); doc.text(t.tipo.toUpperCase(), 32, 103);
            doc.setFont("helvetica", "bold"); doc.text("Duración:", 10, 111);
            doc.setFont("helvetica", "normal"); doc.text(`${t.duracion || 15} minutos`, 32, 111);
            doc.setTextColor(120); doc.setFontSize(8);
            doc.text("-----------------------------------------------", 40, 135, { align: "center" });
            doc.setFont("helvetica", "bold");
            doc.text("¡Gracias por confiar en Malfi!", 40, 140, { align: "center" });
            doc.save(`Turno_${t.mascota_nombre}.pdf`);
        };
        img.onload = () => generarPDF(img);
        img.onerror = () => generarPDF(null);
    };
    const guardarTurno = async (e) => {
        e.preventDefault();
        console.log('📝 [guardarTurno] Estado actual:', nuevoTurno);
        if (!nuevoTurno.fecha || !nuevoTurno.hora) {
            mostrarAviso("❌ Debes seleccionar fecha y hora para crear el turno", "error");
            return;
        }
        if (verificandoDisponibilidad) {
            mostrarAviso("⏳ Por favor, esperá a que se verifique la disponibilidad...", "warning");
            return;
        }
        if (!horarioDisponible && !nuevoTurno.es_urgencia) {
            mostrarAviso("❌ No se puede guardar: El horario seleccionado está ocupado.", "error");
            return;
        }
        try {
            const fechaBase = nuevoTurno.fecha.includes('T')
                ? nuevoTurno.fecha.split('T')[0]
                : nuevoTurno.fecha;
            const fechaCompleta = `${fechaBase}T${nuevoTurno.hora}:00`;
            console.log('📅 Fecha enviada al backend:', fechaCompleta);
            const url = datosEdicion ? `/turnos/${datosEdicion.id}` : '/turnos';
            const datosParaEnviar = {
                mascota_id: nuevoTurno.mascota_id || null,
                dueno_id: nuevoTurno.dueno_id || null,
                fecha: fechaCompleta,
                veterinario_id: nuevoTurno.veterinario_id === 'aleatorio' ? null : parseInt(nuevoTurno.veterinario_id),
                tipo: nuevoTurno.tipo,
                motivo: nuevoTurno.motivo?.trim() || 'Turno registrado',
                es_urgencia: nuevoTurno.es_urgencia || false,
                duracion: parseInt(nuevoTurno.duracion) || 15
            };
            console.log('📤 Datos enviados al backend:', datosParaEnviar);
            await api({
                url,
                method: datosEdicion ? 'PUT' : 'POST',
                data: datosParaEnviar
            });
            setShowModal(false);
            setDatosEdicion(null);
            await cargarDatos();
            mostrarAviso("✅ Turno guardado correctamente");
        } catch (err) {
            console.error('❌ Error completo al guardar turno:', err);
            console.error('📄 Response data:', err.response?.data);
            if (err.response?.status === 409) {
                mostrarAviso("⚠️ El horario ya está ocupado. Marcá 'Urgencia' si es necesario o elegí otro turno.", "error");
            } else if (err.response?.data?.message) {
                mostrarAviso("❌ " + err.response.data.message, "error");
            } else {
                mostrarAviso("Error al guardar el turno. Revisá la consola del navegador.", "error");
            }
        }
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
    
        if (!user || !user.id) {
            mostrarAviso("Sesión no válida para guardar la atención", "error");
            return;
        }
        const idAtencion = turnoSeleccionado ? turnoSeleccionado.id : 'urgencia_directa';
        let mascotaId = turnoSeleccionado ? turnoSeleccionado.mascota_id : datosAtencion.mascota_id;
        let nombreMascota = datosAtencion.nuevoPaciente_nombre?.trim() || 'Sin nombre';
        let veterinarioId = datosAtencion.veterinario_id || user.id;
        if (datosAtencion.esPacienteNuevo) {
            try {
                let duenoId = null;
                if (!datosAtencion.sinDueno && datosAtencion.nuevoDueno_nombre) {
                    const resDueno = await api.post('/duenos', {
                        nombre: datosAtencion.nuevoDueno_nombre.trim(),
                        dni: datosAtencion.nuevoDueno_dni?.trim() || null,
                        telefono: datosAtencion.nuevoDueno_telefono?.trim() || '',
                        email: '',
                        direccion: '',
                        activo: 1
                    });
                    duenoId = resDueno.data.id;
                } else {
                    const dniUnico = 'SIN_DUEÑO_' + Date.now();
                    const resDueno = await api.post('/duenos', {
                        nombre: 'Animal encontrado - Sin dueño',
                        dni: dniUnico,
                        telefono: '',
                        email: '',
                        direccion: '',
                        activo: 1
                    });
                    duenoId = resDueno.data.id;
                }
                const resMascota = await api.post('/mascotas', {
                    nombre: datosAtencion.nuevoPaciente_nombre.trim(),
                    especie: datosAtencion.nuevoPaciente_especie || 'Perro',
                    raza: datosAtencion.nuevoPaciente_raza?.trim() || 'Mestizo',
                    dueno_id: duenoId,
                    edad: datosAtencion.nuevoPaciente_edad?.trim() || ''
                });
                mascotaId = resMascota.data.id;
                nombreMascota = datosAtencion.nuevoPaciente_nombre.trim();
            } catch (err) {
                console.error("❌ Error creando paciente:", err);
                mostrarAviso("Error al crear el paciente", "error");
                return;
            }
        }
        if (!mascotaId) {
            mostrarAviso("Debes seleccionar o registrar un paciente", "error");
            return;
        }
        const pesoFinal = `${datosAtencion.peso} ${datosAtencion.unidad}`;
        try {
            await api.post(`/turnos/${idAtencion}/atender`, {
                diagnostico: datosAtencion.diagnostico,
                tratamiento: datosAtencion.tratamiento,
                peso: pesoFinal,
                veterinario_id: veterinarioId,
                mascota_id: mascotaId,
                nuevoPaciente_nombre: nombreMascota
            });
            setShowAtencion(false);
            setTurnoSeleccionado(null);
            setDatosAtencion({
                peso: '', unidad: 'kg', diagnostico: '', tratamiento: '', mascota_id: '', veterinario_id: '',
                esPacienteNuevo: false, sinDueno: false,
                nuevoPaciente_nombre: '', nuevoPaciente_especie: '', nuevoPaciente_raza: '', nuevoPaciente_edad: '',
                nuevoDueno_nombre: '', nuevoDueno_dni: '', nuevoDueno_telefono: ''
            });
            await cargarDatos();
            setShowSuccess(true);
        } catch (err) {
            console.error("❌ Error final:", err);
            mostrarAviso("Error al guardar atención", "error");
        }
    };
    const prepararEdicion = (t) => {
        setDatosEdicion(t);
        const fechaHora = t.fecha.includes('T') ? t.fecha : t.fecha.replace(' ', 'T');
        setNuevoTurno({
            mascota_id: t.mascota_id,
            dueno_id: t.dueno_id,
            fecha: fechaHora.substring(0, 16),
            hora: fechaHora.substring(11, 16),
            veterinario_id: t.veterinario_id || 'aleatorio',
            tipo: t.tipo,
            motivo: t.motivo || '',
            es_urgencia: t.es_urgencia || false,
            duracion: t.duracion || 15
        });
        setShowModal(true);
    };
    const SelectorHoraVisual = () => {
        const generarHorarios = () => {
            const horarios = [];
            const esHoy = nuevoTurno.fecha?.split('T')[0] === new Date().toISOString().split('T')[0];
            const ahora = new Date();
            const horaActual = ahora.getHours();
            const minActual = ahora.getMinutes();
            for (let hora = 8; hora <= 20; hora++) {
                for (let min of ['00', '15', '30', '45']) {
                    if (hora === 20 && min !== '00') continue;
                    const horaStr = `${String(hora).padStart(2, '0')}:${min}`;
                    if (esHoy) {
                        if (hora < horaActual || (hora === horaActual && parseInt(min) <= minActual)) {
                            continue;
                        }
                    }
                    horarios.push(horaStr);
                }
            }
            return horarios;
        };
        const horariosDisponibles = generarHorarios();
        const seleccionarHora = (horaStr) => {
            if (horariosOcupados[horaStr]?.ocupado) return;
          
            setNuevoTurno(prev => ({
                ...prev,
                hora: horaStr
            }));
        };
        const franjas = [
            { titulo: "🌅 Mañana", rango: [8, 12] },
            { titulo: "☀️ Mediodía", rango: [12, 15] },
            { titulo: "🌤️ Tarde", rango: [15, 21] }
        ];
        return (
            <div className="card border-0 shadow-sm mb-3">
                <div className="card-header bg-light py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <small className="fw-bold">
                            <FontAwesomeIcon icon={faClock} className="me-2" />
                            Seleccionar horario - Click para elegir
                        </small>
                        <small className="text-muted">
                            {nuevoTurno.fecha ? new Date(nuevoTurno.fecha).toLocaleDateString('es-AR', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                            }) : ''}
                        </small>
                    </div>
                </div>
                <div className="card-body p-3" style={{ maxHeight: '460px', overflowY: 'auto' }}>
                    {franjas.map((franja, index) => {
                        const horariosFranja = horariosDisponibles.filter(horaStr => {
                            const horaNum = parseInt(horaStr.split(':')[0]);
                            return horaNum >= franja.rango[0] && horaNum < franja.rango[1];
                        });
                        if (horariosFranja.length === 0) return null;
                        return (
                            <div key={index} className="mb-4">
                                <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
                                    {franja.titulo}
                                </h6>
                              
                                <div className="row g-2">
                                    {horariosFranja.map((horaStr) => {
                                        const info = horariosOcupados[horaStr];
                                        const estaOcupado = info?.ocupado;
                                        const estaSeleccionado = nuevoTurno.hora === horaStr;
                                        let claseBoton = 'btn-outline-primary';
                                        if (estaOcupado) claseBoton = 'btn-danger';
                                        else if (estaSeleccionado) claseBoton = 'btn-success';
                                        return (
                                            <div className="col-6 col-sm-4 col-md-3" key={horaStr}>
                                                <button
                                                    type="button"
                                                    className={`btn btn-sm w-100 rounded-pill py-2.5 fw-medium ${claseBoton}`}
                                                    onClick={() => seleccionarHora(horaStr)}
                                                    disabled={estaOcupado}
                                                    title={estaOcupado ? `Ocupado por: ${info.mascota || 'otra mascota'}` : 'Disponible'}
                                                >
                                                    <strong>{horaStr}</strong>
                                                    {estaOcupado && (
                                                        <div className="mt-1" style={{ fontSize: '0.68rem', lineHeight: '1.1' }}>
                                                            {info.mascota ? info.mascota.substring(0, 13) + (info.mascota.length > 13 ? '...' : '') : 'Ocupado'}
                                                        </div>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    <div className="mt-4 pt-3 border-top d-flex flex-wrap gap-3 justify-content-center">
                        <span className="badge bg-success px-4 py-2">Disponible</span>
                        <span className="badge bg-danger px-4 py-2">Ocupado</span>
                        <span className="badge bg-success px-4 py-2">Seleccionado ✓</span>
                    </div>
                </div>
            </div>
        );
    };
    return (
        <div className="min-vh-100 p-4 p-md-5" style={{ backgroundImage: `url('https://i.pinimg.com/1200x/0f/72/c3/0f72c33debe887dd051042d7642024b0.jpg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
            <div className="position-relative z-1">
                <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                        <FontAwesomeIcon icon={faCalendarCheck} className="me-3" /> Agenda Veterinaria
                    </h1>
                    <div className="d-flex gap-2 align-items-center">
                        <button className="btn btn-danger rounded-pill px-4 fw-bold shadow" onClick={() => { setTurnoSeleccionado(null); setShowAtencion(true); }}>
                            <FontAwesomeIcon icon={faAmbulance} className="me-2" /> URGENCE
                        </button>
                        <button className="btn btn-primary rounded-pill px-4 fw-bold shadow" onClick={() => { setDatosEdicion(null); setNuevoTurno({ mascota_id: '', dueno_id: '', fecha: '', hora: '', veterinario_id: 'aleatorio', tipo: 'consulta', motivo: '', es_urgencia: false, duracion: 15 }); setShowModal(true); }}>
                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Turno
                        </button>
                    </div>
                </header>
                <div className="mb-5 d-flex gap-3 align-items-center flex-wrap">
                    <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white w-auto" style={{minWidth: '350px'}}>
                        <span className="input-group-text bg-transparent border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-success" /></span>
                        <input type="text" className="form-control border-0 py-2" placeholder="Buscar mascota..." value={busqueda} onChange={(e) => {setBusqueda(e.target.value); setPagina(1);}} />
                    </div>
                    <select value={filtroFecha} onChange={(e) => handleCambioFiltro(e.target.value)} className="form-select rounded-pill w-auto shadow-sm">
                        <option value="hoy">Hoy</option>
                        <option value="semana">Esta semana</option>
                        <option value="personalizado">Personalizado</option>
                    </select>

                    {/* ✅ CALENDARIO QUE APARECE SOLO EN PERSONALIZADO */}
                    {filtroFecha === 'personalizado' && (
                        <input
                            type="date"
                            className="form-control rounded-pill shadow-sm"
                            value={fechaPersonalizada}
                            onChange={(e) => setFechaPersonalizada(e.target.value)}
                            style={{ maxWidth: '200px' }}
                        />
                    )}

                    <button
                        className="btn btn-danger rounded-pill px-4 fw-bold shadow d-flex align-items-center gap-2"
                        onClick={() => setShowPapelera(true)}
                    >
                        <FontAwesomeIcon icon={faHistory} /> Papelera
                    </button>
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
                                                <div className={`card border-0 shadow-lg p-3 rounded-4 ${t.es_urgencia ? 'border-start border-danger border-5' : ''}`} style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                                                    <div className="d-flex justify-content-between mb-2">
                                                        <h5 className="fw-bold text-primary mb-0">{t.mascota_nombre}</h5>
                                                        {t.es_urgencia ? <span className="badge bg-danger">🚨 URGENTE</span> : <span className="badge bg-info text-dark">{t.tipo.toUpperCase()}</span>}
                                                    </div>
                                                    <hr className="my-2 opacity-25" />
                                                    <p className="small mb-1"><FontAwesomeIcon icon={faUser} className="me-2 text-muted" /> {t.dueno_nombre}</p>
                                                    <p className="small mb-1"><FontAwesomeIcon icon={faUserMd} className="me-2 text-muted" /> {t.veterinario_nombre || 'Aleatorio'}</p>
                                                    <p className="small mb-1"><FontAwesomeIcon icon={faClock} className="me-2 text-muted" /> {new Date(t.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</p>
                                                    {t.duracion && (
                                                        <p className="small mb-2 text-muted"><FontAwesomeIcon icon={faHourglassStart} className="me-2" /> Duración: {t.duracion} min</p>
                                                    )}
                                                    <div className="d-flex gap-2">
                                                        {t.estado === 'pendiente' && <button className={`btn ${t.es_urgencia ? 'btn-danger' : 'btn-success'} btn-sm rounded-pill flex-grow-1 fw-bold shadow-sm`} onClick={() => { setTurnoSeleccionado(t); setShowAtencion(true); }}>ATENDER</button>}
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
            {/* MODALES (Papelera, Atención, Success, Confirm) */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
                    <div className="modal-dialog modal-xl modal-dialog-centered">
                        <div className="modal-content border-0" style={{ borderRadius: '40px', overflow: 'hidden' }}>
                            <div className="text-center p-4 text-white position-relative" style={{ backgroundColor: '#D82F43' }}>
                                <h3 className="fw-bold m-0 text-uppercase"><FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Reciclaje</h3>
                            </div>
                            <div className="modal-body p-4 bg-white">
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
            {/* MODAL NUEVO/EDITAR TURNO */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <form className="modal-content rounded-4 p-4 shadow-lg border-0" onSubmit={guardarTurno}>
                            <h4 className="fw-bold mb-4 text-primary">{datosEdicion ? '📝 Editar Turno' : '📅 Nuevo Turno'}</h4>
                        
                            {/* Mascota */}
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
                            {/* Fecha */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Fecha *</label>
                                <input
                                    type="date"
                                    className="form-control rounded-pill"
                                    value={nuevoTurno.fecha?.split('T')[0] || ''}
                                    onChange={(e) => setNuevoTurno({...nuevoTurno, fecha: e.target.value + (nuevoTurno.hora ? 'T' + nuevoTurno.hora : 'T00:00')})}
                                    required
                                />
                            </div>
                            {/* Selector de Hora */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold d-flex justify-content-between align-items-center">
                                    <span>
                                        <FontAwesomeIcon icon={faClock} className="me-2" />
                                        Hora *
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary rounded-pill"
                                        onClick={() => setShowTimeSelector(!showTimeSelector)}
                                    >
                                        {showTimeSelector ? 'Ocultar selector' : 'Ver horarios disponibles 🎨'}
                                    </button>
                                </label>
                            
                                <input
                                    type="time"
                                    className="form-control rounded-pill mb-2"
                                    value={nuevoTurno.hora || ''}
                                    onChange={(e) => setNuevoTurno({...nuevoTurno, hora: e.target.value, fecha: (nuevoTurno.fecha?.split('T')[0] || new Date().toISOString().split('T')[0]) + 'T' + e.target.value + ':00'})}
                                    required
                                />
                            
                                {showTimeSelector && <SelectorHoraVisual />}
                            
                                <small className="text-muted d-block">
                                    🟢 Disponible | 🔴 Ocupado
                                </small>
                            </div>
                            {/* SELECTOR DE VETERINARIO */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">
                                    <FontAwesomeIcon icon={faUserMd} className="me-2" />
                                    Veterinario *
                                </label>
                                <select
                                    className="form-select rounded-pill"
                                    value={nuevoTurno.veterinario_id}
                                    onChange={(e) => setNuevoTurno({...nuevoTurno, veterinario_id: e.target.value})}
                                >
                                    <option value="aleatorio">
                                        🎲 Cualquier médico disponible (Aleatorio)
                                    </option>
                                    {veterinarios.map(vet => (
                                        <option key={vet.id} value={vet.id}>
                                            👨‍⚕️ {vet.nombre}
                                        </option>
                                    ))}
                                </select>
                                <small className="text-muted d-block mt-1">
                                    {nuevoTurno.veterinario_id === 'aleatorio'
                                        ? '🎲 El sistema asignará automáticamente el primer médico disponible'
                                        : `👨‍⚕️ Turno asignado a ${veterinarios.find(v => v.id == nuevoTurno.veterinario_id)?.nombre || 'este médico'}`
                                    }
                                </small>
                            </div>
                            {/* Duración del Turno */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Duración del Turno</label>
                                <div className="btn-group w-100" role="group">
                                    {duracionesDisponibles.map((dur) => (
                                        <button
                                            key={dur.valor}
                                            type="button"
                                            className={`btn btn-sm ${nuevoTurno.duracion === dur.valor ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setNuevoTurno({ ...nuevoTurno, duracion: dur.valor })}
                                        >
                                            {dur.etiqueta}
                                        </button>
                                    ))}
                                </div>
                                <small className="text-muted d-block mt-1">
                                    ⏱️ El turno tendrá una duración de <strong>{nuevoTurno.duracion} minutos</strong>
                                </small>
                            </div>
                            {/* Alerta de Disponibilidad */}
                            {verificandoDisponibilidad && (
                                <div className="alert alert-info d-flex align-items-center py-2 mb-3" role="alert">
                                    <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                                    <small>Verificando disponibilidad...</small>
                                </div>
                            )}
                        
                            {!verificandoDisponibilidad && nuevoTurno.fecha && nuevoTurno.hora && (
                                <>
                                    {horarioDisponible ? (
                                        <div className="alert alert-success d-flex align-items-center py-2 mb-3" role="alert">
                                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                                            <small>✅ Horario disponible {nuevoTurno.veterinario_id === 'aleatorio' ? 'con algún médico' : `con ${veterinarios.find(v => v.id == nuevoTurno.veterinario_id)?.nombre || 'este médico'}`}</small>
                                        </div>
                                    ) : (
                                        <div className="alert alert-warning d-flex align-items-center py-2 mb-3" role="alert">
                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                                            <small>{mensajeSolapamiento}</small>
                                        </div>
                                    )}
                                    {nuevoTurno.veterinario_id === 'aleatorio' && Object.keys(disponibilidadPorMedico).length > 0 && (
                                        <div className="alert alert-light border mb-3">
                                            <small className="fw-bold d-block mb-2">📊 Disponibilidad de médicos:</small>
                                            {Object.values(disponibilidadPorMedico).map((medico, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-center py-1">
                                                    <span>👨‍⚕️ {medico.nombre}</span>
                                                    <span className={`badge ${medico.turnosOcupados === 0 ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                        {medico.turnosOcupados} turno{medico.turnosOcupados !== 1 ? 's' : ''} ocupado{medico.turnosOcupados !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                            {/* Tipo */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Tipo *</label>
                                <select className="form-select rounded-pill" value={nuevoTurno.tipo} onChange={(e) => setNuevoTurno({...nuevoTurno, tipo: e.target.value})} required>
                                    <option value="consulta">Consulta Médica</option>
                                    <option value="vacunacion">Vacunación</option>
                                    <option value="cirugia">Cirugía</option>
                                    <option value="estetica">Estética/Peluquería</option>
                                    <option value="control">Control</option>
                                </select>
                            </div>
                            {/* Motivo */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Motivo</label>
                                <textarea
                                    className="form-control rounded-3"
                                    rows="2"
                                    value={nuevoTurno.motivo}
                                    onChange={(e) => setNuevoTurno({...nuevoTurno, motivo: e.target.value})}
                                    placeholder="Describí el motivo del turno..."
                                />
                            </div>
                            {/* Urgencia */}
                            <div className="form-check mb-4 p-3 rounded-3 bg-light border">
                                <input type="checkbox" className="form-check-input ms-0 me-2" id="checkUrg" checked={nuevoTurno.es_urgencia} onChange={(e) => setNuevoTurno({...nuevoTurno, es_urgencia: e.target.checked})} />
                                <label className="form-check-label fw-bold text-danger" htmlFor="checkUrg">🚨 MARCAR COMO SOBRETURNO / URGENCIA</label>
                                <small className="text-muted d-block mt-1">Los turnos de urgencia pueden solaparse con turnos existentes</small>
                            </div>
                            {/* Botones */}
                            <div className="d-flex gap-2 mt-4">
                                <button type="button" className="btn btn-light w-100 rounded-pill" onClick={() => setShowModal(false)}>Cerrar</button>
                                <button type="submit" className="btn btn-primary w-100 rounded-pill fw-bold shadow" disabled={!horarioDisponible && !nuevoTurno.es_urgencia}>
                                    {verificandoDisponibilidad ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Verificando...</>
                                    ) : (
                                        'GUARDAR'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* MODAL ATENCIÓN */}
            {showAtencion && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <form className="modal-content rounded-4 overflow-hidden border-0" onSubmit={finalizarAtencion}>
                            <div className={`modal-header ${turnoSeleccionado ? 'bg-success' : 'bg-danger'} text-white p-4`}>
                                <h4 className="fw-bold mb-0">
                                    {turnoSeleccionado ? `Atendiendo a: ${turnoSeleccionado.mascota_nombre}` : '🚨 ATENCIÓN DE URGENCIA INMEDIATA'}
                                </h4>
                            </div>
                            <div className="modal-body p-4 bg-light">
                                {!turnoSeleccionado && (
                                    <>
                                        <div className="mb-4 p-3 bg-white rounded-4 shadow-sm">
                                            <label className="fw-bold mb-2 text-danger small">TIPO DE PACIENTE *</label>
                                            <div className="form-check mb-2">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="tipoPaciente"
                                                    id="pacienteExistente"
                                                    checked={!datosAtencion.esPacienteNuevo}
                                                    onChange={() => setDatosAtencion({...datosAtencion, esPacienteNuevo: false, mascota_id: ''})}
                                                />
                                                <label className="form-check-label" htmlFor="pacienteExistente">
                                                    🐾 Paciente registrado
                                                </label>
                                            </div>
                                            <div className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="radio"
                                                    name="tipoPaciente"
                                                    id="pacienteNuevo"
                                                    checked={datosAtencion.esPacienteNuevo}
                                                    onChange={() => setDatosAtencion({...datosAtencion, esPacienteNuevo: true, mascota_id: ''})}
                                                />
                                                <label className="form-check-label" htmlFor="pacienteNuevo">
                                                    🆕 Paciente nuevo / No registrado
                                                </label>
                                            </div>
                                        </div>
                                        {!datosAtencion.esPacienteNuevo && (
                                            <div className="mb-4 p-3 bg-white rounded-4 shadow-sm">
                                                <label className="fw-bold mb-2 text-danger small">SELECCIONAR PACIENTE *</label>
                                                <select
                                                    className="form-select rounded-pill"
                                                    required
                                                    value={datosAtencion.mascota_id}
                                                    onChange={(e) => setDatosAtencion({...datosAtencion, mascota_id: e.target.value})}
                                                >
                                                    <option value="">Seleccionar mascota...</option>
                                                    {mascotas.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.dueno_nombre})</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {datosAtencion.esPacienteNuevo && (
                                            <div className="mb-4 p-3 bg-white rounded-4 shadow-sm">
                                                <h6 className="fw-bold text-primary mb-3">📝 Datos del Paciente</h6>
                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <label className="form-label small fw-bold">Nombre *</label>
                                                        <input
                                                            type="text"
                                                            className="form-control rounded-pill"
                                                            placeholder="Ej: Firulais"
                                                            value={datosAtencion.nuevoPaciente_nombre}
                                                            onChange={(e) => setDatosAtencion({...datosAtencion, nuevoPaciente_nombre: e.target.value})}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-md-6">
                                                        <label className="form-label small fw-bold">Especie *</label>
                                                        <select
                                                            className="form-select rounded-pill"
                                                            value={datosAtencion.nuevoPaciente_especie}
                                                            onChange={(e) => setDatosAtencion({...datosAtencion, nuevoPaciente_especie: e.target.value})}
                                                            required
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            <option value="Perro">🐕 Perro</option>
                                                            <option value="Gato">🐱 Gato</option>
                                                            <option value="Otro">🦜 Otro</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label small fw-bold">Raza</label>
                                                        <input
                                                            type="text"
                                                            className="form-control rounded-pill"
                                                            placeholder="Ej: Mestizo"
                                                            value={datosAtencion.nuevoPaciente_raza}
                                                            onChange={(e) => setDatosAtencion({...datosAtencion, nuevoPaciente_raza: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            
                                                <hr className="my-3" />
                                            
                                                <h6 className="fw-bold text-success mb-3">👤 Responsable</h6>
                                                <div className="form-check mb-3">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        id="sinDueno"
                                                        checked={datosAtencion.sinDueno}
                                                        onChange={(e) => setDatosAtencion({...datosAtencion, sinDueno: e.target.checked})}
                                                    />
                                                    <label className="form-check-label" htmlFor="sinDueno">
                                                        🆘 Animal sin dueño / Encontrado
                                                    </label>
                                                </div>
                                            
                                                {!datosAtencion.sinDueno && (
                                                    <div className="row g-3">
                                                        <div className="col-md-6">
                                                            <label className="form-label small fw-bold">Nombre del dueño *</label>
                                                            <input
                                                                type="text"
                                                                className="form-control rounded-pill"
                                                                placeholder="Ej: María López"
                                                                value={datosAtencion.nuevoDueno_nombre}
                                                                onChange={(e) => setDatosAtencion({...datosAtencion, nuevoDueno_nombre: e.target.value})}
                                                                required={!datosAtencion.sinDueno}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label small fw-bold">DNI *</label>
                                                            <input
                                                                type="text"
                                                                className="form-control rounded-pill"
                                                                placeholder="Ej: 12345678"
                                                                value={datosAtencion.nuevoDueno_dni}
                                                                onChange={(e) => setDatosAtencion({...datosAtencion, nuevoDueno_dni: e.target.value})}
                                                                required={!datosAtencion.sinDueno}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <label className="form-label small fw-bold">Teléfono</label>
                                                            <input
                                                                type="tel"
                                                                className="form-control rounded-pill"
                                                                placeholder="Ej: 11-1234-5678"
                                                                value={datosAtencion.nuevoDueno_telefono}
                                                                onChange={(e) => setDatosAtencion({...datosAtencion, nuevoDueno_telefono: e.target.value})}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
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
                                <button type="button" className="btn btn-light rounded-pill px-4" onClick={() => { setShowAtencion(false); setTurnoSeleccionado(null); }}>CANCELAR</button>
                                <button type="submit" className="btn btn-success flex-grow-1 rounded-pill fw-bold">GUARDAR ATENCIÓN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showSuccess && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div
                            className="modal-content border-0 rounded-5 text-center p-5 position-relative shadow-lg"
                            style={{ overflow: 'visible' }}
                        >
                            <div
                                className="position-absolute start-50 translate-middle bg-white rounded-circle shadow"
                                style={{
                                    top: '0',
                                    width: '90px',
                                    height: '90px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: '10'
                                }}
                            >
                                <FontAwesomeIcon icon={faCheckCircle} size="4x" style={{ color: '#2ecc71' }} />
                            </div>
                            <div className="mt-4">
                                <h2 className="fw-bold mb-3" style={{ color: '#333', marginTop: '10px' }}>¡Éxito!</h2>
                                <p className="text-muted fs-5">Atención guardada correctamente.</p>
                                <button
                                    className="btn w-100 rounded-pill py-3 fw-bold text-white mt-3"
                                    style={{ backgroundColor: '#7D3C4A', border: 'none', fontSize: '1.1rem' }}
                                    onClick={() => setShowSuccess(false)}
                                >
                                    Hecho
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* CONFIRM MODALS - CORREGIDOS */}
            <ConfirmModal
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmarEliminar}
                title="¿Mover a la papelera?"
                message="El turno se moverá a la papelera y se podrá restaurar más tarde."
                confirmText="Sí, mover a papelera"
                cancelText="Cancelar"
                confirmColor="danger"
            />
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
            {/* NOTIFICACIÓN TOAST */}
            {notificacion.show && (
                <div className={`position-fixed bottom-0 end-0 m-4 p-3 rounded-4 shadow-lg d-flex align-items-center gap-3`}
                     style={{
                         minWidth: '300px',
                         zIndex: 9999,
                         animation: 'slideIn 0.3s ease'
                     }}
                >
                    <div className={`${
                        notificacion.tipo === 'success' ? 'bg-success' : 'bg-danger'
                    } text-white px-3 py-2 rounded-3 d-flex align-items-center gap-3`}>
                        <FontAwesomeIcon icon={notificacion.tipo === 'success' ? faCheckCircle : faExclamationTriangle} size="lg" />
                        <span className="fw-medium">{notificacion.mensaje}</span>
                        <button className="btn btn-sm btn-light ms-auto rounded-circle" onClick={() => setNotificacion({ show: false, mensaje: '', tipo: 'success' })}>
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default TurnosPage;