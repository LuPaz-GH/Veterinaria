import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHistory, faPencilAlt, faTrash, faSearch, faPaw, 
    faArrowLeft, faCalendarDay, faPlus, faFilePdf, faFileExcel, faCheckCircle, faUndo, faTrashRestore,
    faChevronLeft, faChevronRight, faDownload
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import api from '../services/api';

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const HistorialPage = ({ user }) => {
    const [mascotas, setMascotas] = useState([]);
    const [busquedaMascotas, setBusquedaMascotas] = useState('');
    const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [busquedaHistorial, setBusquedaHistorial] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [registroEditando, setRegistroEditando] = useState(null);
    
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [deleteType, setDeleteType] = useState('');

    const [showPapelera, setShowPapelera] = useState(false);
    const [showPapeleraHistorial, setShowPapeleraHistorial] = useState(false); 
    const [mascotasEliminadas, setMascotasEliminadas] = useState([]);
    const [historialEliminado, setHistorialEliminado] = useState([]); 
    const [busquedaPapelera, setBusquedaPapelera] = useState(''); 

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [showConfirmPermanent, setShowConfirmPermanent] = useState(false);
    const [idToPermanentDelete, setIdToPermanentDelete] = useState(null);
    const [permanentDeleteType, setPermanentDeleteType] = useState('');

    const [formAtencion, setFormAtencion] = useState({
        diagnostico: '', tratamiento: '', pesoValor: '', weightUnit: 'kg'
    });

    // --- CONFIGURACIÓN DE PAGINACIÓN ---
    const [currentPageMascotas, setCurrentPageMascotas] = useState(1);
    const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
    const itemsPerPageMascotas = 6; 
    const itemsPerPageHistorial = 6; 

    const lanzarExito = (mensaje) => {
        setSuccessMessage(mensaje);
        setShowSuccessModal(true);
    };

    const cargarMascotas = async () => {
        try {
            const res = await api.get('/mascotas');
            setMascotas(Array.isArray(res.data) ? res.data : []);
        } catch (error) { console.error(error); }
    };

    const cargarHistorial = async (mascotaId) => {
        try {
            const res = await api.get(`/historial/${mascotaId}`);
            setHistorial(Array.isArray(res.data) ? res.data : []);
            setCurrentPageHistorial(1);
        } catch (error) { console.error(error); }
    };

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/mascotas/papelera');
            setMascotasEliminadas(Array.isArray(res.data) ? res.data : []);
        } catch (error) { console.error(error); }
    };

    const cargarPapeleraHistorial = async (mascotaId) => {
        try {
            const res = await api.get(`/historial/papelera/${mascotaId}`);
            setHistorialEliminado(Array.isArray(res.data) ? res.data : []);
        } catch (error) { console.error(error); }
    };

    useEffect(() => { cargarMascotas(); }, []);

    // --- FUNCIONES DE DESCARGA ---
    const generarPDFIndividual = (reg) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("MALFI VETERINARIA - FICHA CLÍNICA", 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Paciente: ${mascotaSeleccionada.nombre}`, 14, 40);
        doc.text(`Dueño: ${mascotaSeleccionada.dueno_nombre}`, 14, 48);
        doc.text(`Fecha: ${reg.fecha_formateada}`, 14, 56);
        doc.text(`Peso: ${formatearPeso(reg.peso)}`, 14, 64);
        autoTable(doc, {
            startY: 75,
            head: [['Concepto', 'Detalle']],
            body: [['Diagnóstico', reg.diagnostico], ['Tratamiento', reg.tratamiento]],
            headStyles: { fillColor: [102, 51, 153] }
        });
        doc.save(`Atencion_${mascotaSeleccionada.nombre}_${reg.fecha_formateada.split(' ')[0]}.pdf`);
    };

    const exportarPDFGeneral = () => {
        const doc = new jsPDF();
        const titulo = mascotaSeleccionada ? `Historial de ${mascotaSeleccionada.nombre}` : "Listado de Mascotas - Malfi";
        doc.text(titulo, 105, 20, { align: 'center' });
        
        const headers = mascotaSeleccionada ? [['Fecha', 'Diagnóstico', 'Tratamiento', 'Peso']] : [['Nombre', 'Dueño']];
        const body = mascotaSeleccionada 
            ? historial.map(h => [h.fecha_formateada, h.diagnostico, h.tratamiento, formatearPeso(h.peso)])
            : mascotas.map(m => [m.nombre, m.dueno_nombre]);

        autoTable(doc, {
            startY: 30,
            head: headers,
            body: body,
            headStyles: { fillColor: [0, 123, 255] }
        });
        doc.save(`${titulo.replace(/ /g, "_")}.pdf`);
    };

    const exportarExcelGeneral = () => {
        const data = mascotaSeleccionada 
            ? historial.map(h => ({ Fecha: h.fecha_formateada, Diagnostico: h.diagnostico, Tratamiento: h.tratamiento, Peso: formatearPeso(h.peso) }))
            : mascotas.map(m => ({ Mascota: m.nombre, Dueño: m.dueno_nombre }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        XLSX.writeFile(wb, `${mascotaSeleccionada ? 'Historial_'+mascotaSeleccionada.nombre : 'Mascotas_Malfi'}.xlsx`);
    };

    const handleEliminar = async () => {
        try {
            if (deleteType === 'mascota') {
                await api.delete(`/mascotas/${idToDelete}`);
                await cargarMascotas();
                if (mascotaSeleccionada?.id === idToDelete) setMascotaSeleccionada(null);
                lanzarExito('Mascota enviada a la papelera');
            } else {
                await api.delete(`/historial/${idToDelete}`);
                if (mascotaSeleccionada) await cargarHistorial(mascotaSeleccionada.id);
                lanzarExito('Registro clínico enviado a la papelera');
            }
            setShowConfirm(false);
            setIdToDelete(null);
        } catch (err) { console.error(err); }
    };

    const handleConfirmarEliminarPermanente = async () => {
        if (!idToPermanentDelete) return;
        try {
            if (permanentDeleteType === 'mascota') {
                await api.delete(`/mascotas/papelera/${idToPermanentDelete}`);
                await cargarPapelera();
            } else {
                await api.delete(`/historial/papelera/${idToPermanentDelete}`);
                if (mascotaSeleccionada) await cargarPapeleraHistorial(mascotaSeleccionada.id);
            }
            lanzarExito('Eliminado definitivamente');
            setShowConfirmPermanent(false);
            setIdToPermanentDelete(null);
        } catch (err) { console.error(err); }
    };

    const restaurarMascota = async (id) => {
        try {
            await api.put(`/mascotas/restaurar/${id}`);
            await cargarPapelera(); await cargarMascotas();
            lanzarExito('Mascota restaurada');
        } catch (err) { console.error(err); }
    };

    const restaurarRegistro = async (id) => {
        try {
            await api.put(`/historial/restaurar/${id}`);
            if (mascotaSeleccionada) { await cargarPapeleraHistorial(mascotaSeleccionada.id); await cargarHistorial(mascotaSeleccionada.id); }
            lanzarExito('Registro clínico restaurado');
        } catch (err) { console.error(err); }
    };

    const seleccionarMascota = (m) => { setMascotaSeleccionada(m); cargarHistorial(m.id); };

    const prepararEdicion = (reg) => {
        setRegistroEditando(reg);
        setFormAtencion({ diagnostico: reg.diagnostico || '', tratamiento: reg.tratamiento || '', pesoValor: reg.peso || '', weightUnit: 'kg' });
        setShowModal(true);
    };

    const guardarRegistro = async (e) => {
        e.preventDefault();
        let pesoFinal = parseFloat(formAtencion.pesoValor) || 0;
        if (formAtencion.weightUnit === 'g') pesoFinal /= 1000;
        const body = { diagnostico: formAtencion.diagnostico, tratamiento: formAtencion.tratamiento, peso: pesoFinal, veterinario_id: user.id, mascota_id: mascotaSeleccionada.id };
        try {
            const url = registroEditando ? `/historial/${registroEditando.id}` : '/historial';
            await api({ url, method: registroEditando ? 'PUT' : 'POST', data: body });
            setShowModal(false); cargarHistorial(mascotaSeleccionada.id);
            lanzarExito(registroEditando ? 'Registro actualizado' : 'Nueva atención guardada');
        } catch (err) { console.error(err); }
    };

    const obtenerPapeleraMascotasFiltrada = () => {
        return mascotasEliminadas.filter(m => (m.nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase()) || (m.dueno_nombre || '').toLowerCase().includes(busquedaPapelera.toLowerCase()));
    };

    const obtenerPapeleraHistorialFiltrada = () => {
        return historialEliminado.filter(h => (h.diagnostico || '').toLowerCase().includes(busquedaPapelera.toLowerCase()) || (h.tratamiento || '').toLowerCase().includes(busquedaPapelera.toLowerCase()));
    };

    const formatearPeso = (pesoKg) => {
        const pesoNum = Number(pesoKg);
        if (isNaN(pesoNum) || pesoNum === 0) return 'N/A';
        return pesoNum >= 1 ? `${pesoNum.toFixed(2)} kg` : `${Math.round(pesoNum * 1000)} g`;
    };

    const mascotasFiltradas = mascotas.filter(m => (m.nombre || '').toLowerCase().includes(busquedaMascotas.toLowerCase()) || (m.dueno_nombre || '').toLowerCase().includes(busquedaMascotas.toLowerCase()));
    const totalPaginasMascotas = Math.ceil(mascotasFiltradas.length / itemsPerPageMascotas);
    const paginatedMascotas = mascotasFiltradas.slice((currentPageMascotas - 1) * itemsPerPageMascotas, currentPageMascotas * itemsPerPageMascotas);

    const historialFiltrado = historial.filter(reg => (reg.diagnostico || '').toLowerCase().includes(busquedaHistorial.toLowerCase()) || (reg.tratamiento || '').toLowerCase().includes(busquedaHistorial.toLowerCase()));
    const totalPaginasHistorial = Math.ceil(historialFiltrado.length / itemsPerPageHistorial);
    const paginatedHistorial = historialFiltrado.slice((currentPageHistorial - 1) * itemsPerPageHistorial, currentPageHistorial * itemsPerPageHistorial);

    return (
        <div className="min-vh-100 p-4 p-md-5 position-relative" style={{ backgroundImage: `url('https://i.pinimg.com/736x/24/04/85/24048509b8281e9319b3ce370e522a7b.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.15)', zIndex: 0 }} />
            <div className="container position-relative" style={{ zIndex: 1 }}>
                <h1 className="text-white fw-bold mb-5" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
                    <FontAwesomeIcon icon={faHistory} className="me-3" /> Historial Clínico Malfi
                </h1>

                {!mascotaSeleccionada ? (
                    <>
                        <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div className="input-group input-group-lg shadow rounded-pill overflow-hidden" style={{ maxWidth: '400px', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
                                <span className="input-group-text bg-transparent border-0 ps-4"><FontAwesomeIcon icon={faSearch} className="text-primary" /></span>
                                <input type="text" className="form-control border-0 py-3 bg-transparent text-dark shadow-none" placeholder="Buscar mascota o dueño..." value={busquedaMascotas} onChange={(e) => { setBusquedaMascotas(e.target.value); setCurrentPageMascotas(1); }} />
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDFGeneral} title="Descargar PDF"><FontAwesomeIcon icon={faFilePdf} /></button>
                                <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcelGeneral} title="Descargar Excel"><FontAwesomeIcon icon={faFileExcel} /></button>
                                <button className="btn btn-danger rounded-pill px-4 shadow text-white fw-bold" onClick={() => { setShowPapelera(true); cargarPapelera(); }}><FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera</button>
                                <button className="btn btn-light rounded-pill px-4 fw-bold shadow-sm" onClick={() => window.location.href='/mascotas'}>+ Nueva Mascota</button>
                            </div>
                        </div>
                        <div className="row g-4">
                            {paginatedMascotas.map(m => (
                                <div className="col-md-4 col-sm-6" key={m.id}>
                                    <div className="card border-0 shadow-lg p-4 rounded-4 position-relative hover-shadow" style={{ background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(12px)', cursor:'pointer' }} onClick={() => seleccionarMascota(m)}>
                                        <div className="d-flex align-items-center">
                                            <div className="me-4"><div className="rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '5px solid white' }}><FontAwesomeIcon icon={faPaw} className="text-white" style={{ fontSize: '36px' }} /></div></div>
                                            <div><h5 className="fw-bold mb-0 text-dark">{m.nombre}</h5><small className="text-muted fw-bold">Dueño: {m.dueno_nombre}</small></div>
                                        </div>
                                        <button className="btn btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle shadow-sm" style={{ background: 'white' }} onClick={(e) => { e.stopPropagation(); setIdToDelete(m.id); setDeleteType('mascota'); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalPaginasMascotas > 1 && (
                            <div className="d-flex justify-content-center align-items-center mt-5 gap-3">
                                <button className="btn btn-white rounded-circle shadow d-flex align-items-center justify-content-center border-0" style={{ width: '50px', height: '50px', background: '#fff' }} disabled={currentPageMascotas === 1} onClick={() => setCurrentPageMascotas(p => p - 1)}><FontAwesomeIcon icon={faChevronLeft} className="text-primary" /></button>
                                <div className="bg-white px-4 py-2 rounded-pill shadow fw-bold text-primary border">Página {currentPageMascotas} de {totalPaginasMascotas}</div>
                                <button className="btn btn-white rounded-circle shadow d-flex align-items-center justify-content-center border-0" style={{ width: '50px', height: '50px', background: '#fff' }} disabled={currentPageMascotas === totalPaginasMascotas} onClick={() => setCurrentPageMascotas(p => p + 1)}><FontAwesomeIcon icon={faChevronRight} className="text-primary" /></button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="rounded-4 shadow-lg p-4 p-md-5" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(15px)' }}>
                        <button className="btn btn-outline-primary rounded-pill px-4 mb-4 fw-bold shadow-sm" style={{ background: 'white' }} onClick={() => setMascotaSeleccionada(null)}><FontAwesomeIcon icon={faArrowLeft} className="me-2" /> Volver</button>
                        <div className="d-flex justify-content-between align-items-start mb-5 flex-wrap gap-3 text-dark">
                            <div><h2 className="fw-bold mb-1">Historial de {mascotaSeleccionada.nombre}</h2><p className="text-muted fs-5 mb-0 fw-bold">Dueño: {mascotaSeleccionada.dueno_nombre}</p></div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDFGeneral} title="Descargar PDF completo"><FontAwesomeIcon icon={faFilePdf} /></button>
                                <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcelGeneral} title="Descargar Excel completo"><FontAwesomeIcon icon={faFileExcel} /></button>
                                <button className="btn btn-warning rounded-pill px-4 shadow-sm text-dark fw-bold" onClick={() => { setShowPapeleraHistorial(true); cargarPapeleraHistorial(mascotaSeleccionada.id); }}><FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera</button>
                                <button className="btn btn-primary rounded-pill px-4 shadow fw-bold" onClick={() => { setRegistroEditando(null); setFormAtencion({ diagnostico: '', tratamiento: '', pesoValor: '', weightUnit: 'kg' }); setShowModal(true); }}><FontAwesomeIcon icon={faPlus} className="me-2" /> Nueva Atención</button>
                            </div>
                        </div>
                        <div className="mb-4">
                            <div className="input-group shadow-sm rounded-pill overflow-hidden border-0" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
                                <span className="input-group-text bg-transparent border-0 ps-4"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                                <input type="text" className="form-control border-0 py-2 bg-transparent text-dark" placeholder="Filtrar por diagnóstico o tratamiento..." value={busquedaHistorial} onChange={(e) => { setBusquedaHistorial(e.target.value); setCurrentPageHistorial(1); }} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 text-dark">
                                <thead className="table-light"><tr><th>Fecha</th><th>Diagnóstico</th><th>Tratamiento</th><th>Peso</th><th className="text-center">Acciones</th></tr></thead>
                                <tbody>
                                    {paginatedHistorial.map(reg => (
                                        <tr key={reg.id}>
                                            <td className="fw-bold">{reg.fecha_formateada}</td><td>{reg.diagnostico}</td><td>{reg.tratamiento}</td>
                                            <td><span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill border">{formatearPeso(reg.peso)}</span></td>
                                            <td className="text-center">
                                                <div className="d-flex gap-2 justify-content-center">
                                                    <button className="btn btn-sm text-success" onClick={() => generarPDFIndividual(reg)} title="Descargar PDF"><FontAwesomeIcon icon={faDownload}/></button>
                                                    <button className="btn btn-sm text-primary" onClick={() => prepararEdicion(reg)} title="Editar"><FontAwesomeIcon icon={faPencilAlt}/></button>
                                                    <button className="btn btn-sm text-danger" onClick={() => { setIdToDelete(reg.id); setDeleteType('historial'); setShowConfirm(true); }} title="Eliminar"><FontAwesomeIcon icon={faTrash}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="d-flex justify-content-center align-items-center mt-4 gap-3 text-dark">
                            <button className="btn btn-white shadow-sm rounded-circle d-flex align-items-center justify-content-center border" style={{ width: '40px', height: '40px', background: '#fff' }} disabled={currentPageHistorial === 1} onClick={() => setCurrentPageHistorial(p => p - 1)}><FontAwesomeIcon icon={faChevronLeft} className="text-secondary" /></button>
                            <span className="fw-bold text-muted">Página {currentPageHistorial} de {totalPaginasHistorial || 1}</span>
                            <button className="btn btn-white shadow-sm rounded-circle d-flex align-items-center justify-content-center border" style={{ width: '40px', height: '40px', background: '#fff' }} disabled={currentPageHistorial >= totalPaginasHistorial || totalPaginasHistorial === 0} onClick={() => setCurrentPageHistorial(p => p + 1)}><FontAwesomeIcon icon={faChevronRight} className="text-secondary" /></button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal show={showConfirmPermanent} onClose={() => { setShowConfirmPermanent(false); setIdToPermanentDelete(null); }} onConfirm={handleConfirmarEliminarPermanente} title="¿Eliminar definitivamente?" message="Esta acción no se puede deshacer." confirmText="Sí, eliminar" confirmColor="danger" />
            <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleEliminar} title={deleteType === 'mascota' ? "¿Mover a la papelera?" : "¿Eliminar registro?"} message="Podrás restaurarlo más tarde desde la papelera." confirmText="Mover" confirmColor="danger" />

            {showSuccessModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 4500 }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
                        <div className="modal-content border-0 rounded-5 text-center p-5 position-relative shadow-lg" style={{ overflow: 'visible', marginTop: '40px' }}>
                            <div className="position-absolute start-50 translate-middle bg-white rounded-circle shadow d-flex align-items-center justify-content-center" style={{ top: '0', width: '100px', height: '100px' }}><FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '80px', color: '#2ecc71' }} /></div>
                            <div className="mt-4 pt-2 text-dark">
                                <h2 className="fw-bold mb-3 text-dark text-uppercase">¡Éxito!</h2>
                                <p className="text-muted fs-5 mb-4 fw-bold">{successMessage}</p>
                                <button className="btn w-100 rounded-pill py-3 fw-bold text-white shadow-sm" style={{ backgroundColor: '#2C3E50' }} onClick={() => setShowSuccessModal(false)}>Entendido</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    <div className="modal-dialog modal-dialog-centered text-dark">
                        <form className="modal-content rounded-4 shadow-lg border-0" onSubmit={guardarRegistro}>
                            <div className="modal-header bg-primary text-white border-0"><h5>{registroEditando ? 'Editar Registro' : 'Nueva Atención'}</h5><button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setShowModal(false)}></button></div>
                            <div className="modal-body p-4 text-dark">
                                <div className="mb-3"><label className="fw-bold small">Diagnóstico</label><textarea className="form-control rounded-3" rows="3" required value={formAtencion.diagnostico} onChange={(e) => setFormAtencion({...formAtencion, diagnostico: e.target.value})}></textarea></div>
                                <div className="mb-3"><label className="fw-bold small">Tratamiento</label><textarea className="form-control rounded-3" rows="3" required value={formAtencion.tratamiento} onChange={(e) => setFormAtencion({...formAtencion, tratamiento: e.target.value})}></textarea></div>
                                <div className="row">
                                    <div className="col-8"><label className="fw-bold small">Peso</label><input type="number" step="0.01" className="form-control rounded-3" value={formAtencion.pesoValor} onChange={(e) => setFormAtencion({...formAtencion, pesoValor: e.target.value})} /></div>
                                    <div className="col-4"><label className="fw-bold small">Unidad</label><select className="form-select" value={formAtencion.weightUnit} onChange={(e) => setFormAtencion({...formAtencion, weightUnit: e.target.value})}><option value="kg">kg</option><option value="g">gramos</option></select></div>
                                </div>
                            </div>
                            <div className="modal-footer border-0 pb-4"><button type="submit" className="btn btn-primary w-100 rounded-pill py-2 fw-bold shadow">GUARDAR REGISTRO</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialPage;