import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHistory, faPencilAlt, faTrash, faSearch, faPaw, faUser, 
    faSave, faArrowLeft, faCalendarDay, faPlus, faFilePdf, faFileExcel 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';

// Librerías de exportación
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const HistorialPage = ({ user }) => {
    const [mascotas, setMascotas] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [registroEditando, setRegistroEditando] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);

    const [formAtencion, setFormAtencion] = useState({
        diagnostico: '',
        tratamiento: '',
        pesoValor: '',
        pesoUnidad: 'kg'
    });

    const cargarMascotas = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/mascotas');
            const data = await res.json();
            setMascotas(Array.isArray(data) ? data : []);
        } catch (error) { console.error(error); }
    };

    const cargarHistorial = async (mascotaId) => {
        try {
            const res = await fetch(`http://localhost:3001/api/historial/${mascotaId}`);
            const data = await res.json();
            setHistorial(Array.isArray(data) ? data : []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => { cargarMascotas(); }, []);

    // ✅ FUNCIÓN CORREGIDA: Evita el error "toFixed is not a function"
    const formatearPeso = (pesoKg) => {
        const pesoNum = Number(pesoKg); // Convertimos a número por seguridad

        if (isNaN(pesoNum) || pesoNum === 0) return 'N/A';
        
        if (pesoNum >= 1) {
            return `${pesoNum.toFixed(2)} kg`;
        } else {
            const gramos = Math.round(pesoNum * 1000);
            return `${gramos} gramos`;
        }
    };

    // --- FUNCIONES DE EXPORTACIÓN ---
    const exportarPDF = () => {
        if (historial.length === 0) return alert("No hay registros médicos para exportar");

        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor(102, 51, 153);
        doc.text("HISTORIAL CLÍNICO - Malfi Veterinaria", 14, 22);
        
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Paciente: ${mascotaSeleccionada.nombre}`, 14, 32);
        doc.text(`Dueño: ${mascotaSeleccionada.dueno_nombre}`, 14, 38);
        doc.text(`Especie: ${mascotaSeleccionada.especie} | Raza: ${mascotaSeleccionada.raza || 'N/A'}`, 14, 44);
        doc.text(`Fecha de Reporte: ${new Date().toLocaleDateString()}`, 14, 50);

        const tablaData = historial.map(reg => [
            reg.fecha_formateada,
            formatearPeso(reg.peso),
            reg.diagnostico,
            reg.tratamiento,
            reg.veterinario_nombre || 'N/A'
        ]);

        autoTable(doc, {
            startY: 55,
            head: [['Fecha', 'Peso', 'Diagnóstico', 'Tratamiento', 'Veterinario']],
            body: tablaData,
            headStyles: { fillColor: [102, 51, 153] },
            theme: 'grid',
            styles: { fontSize: 9 }
        });

        doc.save(`Historial_${mascotaSeleccionada.nombre}_Malfi.pdf`);
    };

    const exportarExcel = () => {
        if (historial.length === 0) return alert("No hay registros médicos para exportar");

        const dataExcel = historial.map(reg => ({
            Mascota: mascotaSeleccionada.nombre,
            Dueño: mascotaSeleccionada.dueno_nombre,
            Fecha: reg.fecha_formateada,
            Peso: formatearPeso(reg.peso),
            Diagnóstico: reg.diagnostico,
            Tratamiento: reg.tratamiento,
            Veterinario: reg.veterinario_nombre
        }));

        const ws = XLSX.utils.json_to_sheet(dataExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Clínico");
        XLSX.writeFile(wb, `Historial_${mascotaSeleccionada.nombre}.xlsx`);
    };

    const seleccionarMascota = (m) => {
        setMascotaSeleccionada(m);
        cargarHistorial(m.id);
    };

    const abrirModalNuevo = () => {
        setRegistroEditando(null);
        setFormAtencion({
            diagnostico: '',
            tratamiento: '',
            pesoValor: '',
            pesoUnidad: 'kg'
        });
        setShowModal(true);
    };

    const prepararEdicion = (reg) => {
        setRegistroEditando(reg);
        setFormAtencion({
            diagnostico: reg.diagnostico || '',
            tratamiento: reg.tratamiento || '',
            pesoValor: reg.peso || '',
            pesoUnidad: 'kg'
        });
        setShowModal(true);
    };

    const guardarRegistro = async (e) => {
        e.preventDefault();

        let pesoFinal = parseFloat(formAtencion.pesoValor) || 0;
        if (formAtencion.pesoUnidad === 'g') {
            pesoFinal = pesoFinal / 1000;
        }

        const body = {
            diagnostico: formAtencion.diagnostico,
            tratamiento: formAtencion.tratamiento,
            peso: pesoFinal,
            veterinario_id: user.id,
            mascota_id: mascotaSeleccionada.id
        };

        const url = registroEditando
            ? `http://localhost:3001/api/historial/${registroEditando.id}`
            : 'http://localhost:3001/api/historial';

        const method = registroEditando ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                cargarHistorial(mascotaSeleccionada.id);
            } else {
                alert('Error al guardar el registro');
            }
        } catch (err) {
            console.error('Error en fetch:', err);
        }
    };

    const handleEliminar = async () => {
        const res = await fetch(`http://localhost:3001/api/historial/${idToDelete}`, { method: 'DELETE' });
        if (res.ok) {
            setShowConfirm(false);
            cargarHistorial(mascotaSeleccionada.id);
        }
    };

    const mascotasFiltradas = mascotas.filter(m => 
        (m.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (m.dueno_nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="min-vh-100 p-4 p-md-5 position-relative" style={{ 
            backgroundImage: `url('https://i.pinimg.com/736x/24/04/85/24048509b8281e9319b3ce370e522a7b.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            {/* Overlay sutil para el fondo */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.2)', zIndex: 0 }} />

            <div className="container position-relative" style={{ zIndex: 1 }}>
                <h1 className="text-white fw-bold mb-5" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                    <FontAwesomeIcon icon={faHistory} className="me-3" /> Historial Clínico Malfi
                </h1>

                {!mascotaSeleccionada ? (
                    <>
                        <div className="mb-5 d-flex justify-content-center">
                            <div className="input-group input-group-lg shadow rounded-pill overflow-hidden bg-white" style={{ maxWidth: '600px' }}>
                                <span className="input-group-text bg-transparent border-0 ps-4"><FontAwesomeIcon icon={faSearch} className="text-primary" /></span>
                                <input type="text" className="form-control border-0 py-3" placeholder="Buscar mascota o dueño..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                            </div>
                        </div>
                        <div className="row g-4">
                            {mascotasFiltradas.map(m => (
                                <div className="col-md-4" key={m.id}>
                                    <div className="card border-0 shadow-lg p-4 rounded-4 bg-white cursor-pointer hover-shadow" onClick={() => seleccionarMascota(m)}>
                                        <div className="d-flex align-items-center">
                                            <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3"><FontAwesomeIcon icon={faPaw} className="text-primary fs-3" /></div>
                                            <div>
                                                <h5 className="fw-bold mb-0">{m.nombre}</h5>
                                                <small className="text-muted">Dueño: {m.dueno_nombre}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                            <button className="btn btn-volver-vibrante shadow-sm" onClick={() => setMascotaSeleccionada(null)}>
                                <FontAwesomeIcon icon={faArrowLeft} /> Volver
                            </button>
                            <div className="d-flex gap-2">
                                <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF} title="PDF"><FontAwesomeIcon icon={faFilePdf} /></button>
                                <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel} title="Excel"><FontAwesomeIcon icon={faFileExcel} /></button>
                                <button className="btn btn-nueva-mascota rounded-pill px-4 fw-bold shadow" onClick={abrirModalNuevo}>
                                    <FontAwesomeIcon icon={faPlus} className="me-2" /> Agregar Atención
                                </button>
                            </div>
                        </div>

                        <div className="card border-0 shadow-lg p-4 rounded-4 mb-4 bg-white">
                            <h2 className="fw-bold text-primary mb-1">{mascotaSeleccionada.nombre}</h2>
                            <p className="text-muted mb-0">Dueño: {mascotaSeleccionada.dueno_nombre} | {mascotaSeleccionada.especie} - {mascotaSeleccionada.raza}</p>
                        </div>

                        {historial.length === 0 ? (
                            <div className="text-center text-white py-5 opacity-75">
                                <FontAwesomeIcon icon={faHistory} size="4x" className="mb-3" />
                                <h5>No hay registros médicos cargados.</h5>
                            </div>
                        ) : (
                            historial.map(reg => (
                                <div className="card border-0 shadow-sm p-4 rounded-4 mb-3 bg-white border-start border-5 border-primary" key={reg.id}>
                                    <div className="d-flex justify-content-between mb-3">
                                        <h6 className="fw-bold text-primary"><FontAwesomeIcon icon={faCalendarDay} /> {reg.fecha_formateada}</h6>
                                        <div className="d-flex gap-2">
                                            <button className="btn btn-sm btn-outline-primary rounded-circle" onClick={() => prepararEdicion(reg)}><FontAwesomeIcon icon={faPencilAlt} /></button>
                                            <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => { setIdToDelete(reg.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                        </div>
                                    </div>
                                    <p className="mb-2 small"><strong>Veterinario:</strong> {reg.veterinario_nombre}</p>
                                    <p className="mb-2"><strong>Peso:</strong> {formatearPeso(reg.peso)}</p>
                                    <div className="bg-light p-3 rounded-3 mb-2"><strong>Diagnóstico:</strong><br/>{reg.diagnostico}</div>
                                    <div className="bg-light p-3 rounded-3"><strong>Tratamiento:</strong><br/>{reg.tratamiento}</div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {/* Modal con selector kg/gramos */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <form className="modal-content rounded-4 p-4 shadow-lg border-0" onSubmit={guardarRegistro}>
                            <h4 className="fw-bold mb-4 text-primary">
                                {registroEditando ? '📝 Editar Registro' : '➕ Nueva Atención'}
                            </h4>

                            <div className="mb-4">
                                <label className="form-label fw-bold small">Peso</label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-control rounded-start"
                                        value={formAtencion.pesoValor}
                                        onChange={(e) => setFormAtencion({
                                            ...formAtencion,
                                            pesoValor: e.target.value
                                        })}
                                        placeholder="Ej: 4.5 o 450"
                                        required
                                    />
                                    <select
                                        className="form-select rounded-end"
                                        style={{ maxWidth: '120px' }}
                                        value={formAtencion.pesoUnidad}
                                        onChange={(e) => setFormAtencion({
                                            ...formAtencion,
                                            pesoUnidad: e.target.value
                                        })}
                                    >
                                        <option value="kg">kg</option>
                                        <option value="g">gramos</option>
                                    </select>
                                </div>
                                <small className="form-text text-muted mt-1 d-block">
                                    Selecciona la unidad. Se convertirá automáticamente a kilogramos al guardar.
                                </small>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold small">Diagnóstico</label>
                                <textarea
                                    className="form-control rounded-3"
                                    rows="3"
                                    value={formAtencion.diagnostico}
                                    onChange={(e) => setFormAtencion({...formAtencion, diagnostico: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold small">Tratamiento</label>
                                <textarea
                                    className="form-control rounded-3"
                                    rows="3"
                                    value={formAtencion.tratamiento}
                                    onChange={(e) => setFormAtencion({...formAtencion, tratamiento: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-light w-100 rounded-pill"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary w-100 rounded-pill fw-bold shadow"
                                >
                                    GUARDAR
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleEliminar} title="¿Eliminar?" message="Esta acción es irreversible." />
        </div>
    );
};

export default HistorialPage;