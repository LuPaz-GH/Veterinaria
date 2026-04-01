import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHistory, faPencilAlt, faTrash, faSearch, faPaw, 
    faArrowLeft, faCalendarDay, faPlus, faFilePdf, faFileExcel, faCheckCircle 
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

    // Modal Papelera
    const [showPapelera, setShowPapelera] = useState(false);
    const [mascotasEliminadas, setMascotasEliminadas] = useState([]);

    // Nuevo: Modal de éxito bonito
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [formAtencion, setFormAtencion] = useState({
        diagnostico: '',
        tratamiento: '',
        pesoValor: '',
        pesoUnidad: 'kg'
    });

    const [currentPageMascotas, setCurrentPageMascotas] = useState(1);
    const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
    const itemsPerPageMascotas = 8;
    const itemsPerPageHistorial = 8;

    const cargarMascotas = async () => {
        try {
            const res = await api.get('/mascotas');
            setMascotas(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error al cargar mascotas:", error);
        }
    };

    const cargarHistorial = async (mascotaId) => {
        try {
            const res = await api.get(`/historial/${mascotaId}`);
            const data = Array.isArray(res.data) ? res.data : [];
            setHistorial(data);
            setBusquedaHistorial('');
            setCurrentPageHistorial(1);
        } catch (error) {
            console.error("Error al cargar historial:", error);
        }
    };

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/mascotas/papelera');
            setMascotasEliminadas(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error al cargar papelera:", error);
        }
    };

    useEffect(() => { cargarMascotas(); }, []);

    useEffect(() => setCurrentPageMascotas(1), [busquedaMascotas]);
    useEffect(() => setCurrentPageHistorial(1), [busquedaHistorial, mascotaSeleccionada]);

    const formatearPeso = (pesoKg) => {
        const pesoNum = Number(pesoKg);
        if (isNaN(pesoNum) || pesoNum === 0) return 'N/A';
        return pesoNum >= 1 
            ? `${pesoNum.toFixed(2)} kg` 
            : `${Math.round(pesoNum * 1000)} gramos`;
    };

    const confirmarEliminarMascota = (mascota) => {
        setIdToDelete(mascota.id);
        setDeleteType('mascota');
        setShowConfirm(true);
    };

    const confirmarEliminarRegistro = (registro) => {
        setIdToDelete(registro.id);
        setDeleteType('historial');
        setShowConfirm(true);
    };

    const handleEliminar = async () => {
        try {
            if (deleteType === 'mascota') {
                await api.delete(`/mascotas/${idToDelete}`);
                await cargarMascotas();
                if (mascotaSeleccionada?.id === idToDelete) setMascotaSeleccionada(null);
            } else {
                await api.delete(`/historial/${idToDelete}`);
                if (mascotaSeleccionada) await cargarHistorial(mascotaSeleccionada.id);
            }
            setShowConfirm(false);
        } catch (err) {
            console.error('Error al eliminar:', err);
            alert('No se pudo eliminar');
        }
    };

    const restaurarMascota = async (id) => {
        try {
            await api.put(`/mascotas/restaurar/${id}`);
            await cargarPapelera();
            await cargarMascotas();

            // Mostrar cartel bonito
            setSuccessMessage('Mascota restaurada correctamente');
            setShowSuccessModal(true);

        } catch (err) {
            console.error('Error al restaurar:', err);
            alert('No se pudo restaurar la mascota');
        }
    };

    // Filtros y Paginación (mismo que antes)
    const mascotasFiltradas = mascotas.filter(m => 
        (m.nombre || '').toLowerCase().includes(busquedaMascotas.toLowerCase()) ||
        (m.dueno_nombre || '').toLowerCase().includes(busquedaMascotas.toLowerCase())
    );

    const totalPagesMascotas = Math.ceil(mascotasFiltradas.length / itemsPerPageMascotas);
    const paginatedMascotas = mascotasFiltradas.slice(
        (currentPageMascotas - 1) * itemsPerPageMascotas,
        currentPageMascotas * itemsPerPageMascotas
    );

    const historialFiltrado = historial.filter(reg => {
        if (!busquedaHistorial) return true;
        const term = busquedaHistorial.toLowerCase();
        return (
            (reg.fecha_formateada || '').toLowerCase().includes(term) ||
            (reg.diagnostico || '').toLowerCase().includes(term) ||
            (reg.tratamiento || '').toLowerCase().includes(term) ||
            (reg.veterinario_nombre || '').toLowerCase().includes(term)
        );
    });

    const totalPagesHistorial = Math.ceil(historialFiltrado.length / itemsPerPageHistorial);
    const paginatedHistorial = historialFiltrado.slice(
        (currentPageHistorial - 1) * itemsPerPageHistorial,
        currentPageHistorial * itemsPerPageHistorial
    );

    const seleccionarMascota = (m) => {
        setMascotaSeleccionada(m);
        cargarHistorial(m.id);
    };

    const abrirModalNuevo = () => {
        setRegistroEditando(null);
        setFormAtencion({ diagnostico: '', tratamiento: '', pesoValor: '', pesoUnidad: 'kg' });
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
        if (formAtencion.pesoUnidad === 'g') pesoFinal /= 1000;

        const body = {
            diagnostico: formAtencion.diagnostico,
            tratamiento: formAtencion.tratamiento,
            peso: pesoFinal,
            veterinario_id: user.id,
            mascota_id: mascotaSeleccionada.id
        };

        try {
            const res = await api({
                url: registroEditando ? `/historial/${registroEditando.id}` : '/historial',
                method: registroEditando ? 'PUT' : 'POST',
                data: body
            });

            if (res.status === 200 || res.status === 201) {
                setShowModal(false);
                cargarHistorial(mascotaSeleccionada.id);
            }
        } catch (err) {
            console.error('Error al guardar:', err);
            alert('Error al guardar el registro');
        }
    };

    const exportarPDF = () => { /* tu código de PDF */ };
    const exportarExcel = () => { /* tu código de Excel */ };

    return (
        <div className="min-vh-100 p-4 p-md-5 position-relative" style={{ 
            backgroundImage: `url('https://i.pinimg.com/736x/24/04/85/24048509b8281e9319b3ce370e522a7b.jpg')`,
            backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.2)', zIndex: 0 }} />

            <div className="container position-relative" style={{ zIndex: 1 }}>
                <h1 className="text-white fw-bold mb-5" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                    <FontAwesomeIcon icon={faHistory} className="me-3" /> Historial Clínico Malfi
                </h1>

                {!mascotaSeleccionada ? (
                    <>
                        <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div className="input-group input-group-lg shadow rounded-pill overflow-hidden bg-white" style={{ maxWidth: '500px' }}>
                                <span className="input-group-text bg-transparent border-0 ps-4">
                                    <FontAwesomeIcon icon={faSearch} className="text-primary" />
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-0 py-3" 
                                    placeholder="Buscar mascota o dueño..." 
                                    value={busquedaMascotas} 
                                    onChange={(e) => setBusquedaMascotas(e.target.value)} 
                                />
                            </div>

                            <div className="d-flex gap-2">
                                <button className="btn btn-danger rounded-pill px-4" onClick={exportarPDF}>
                                    <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
                                </button>
                                <button className="btn btn-success rounded-pill px-4" onClick={exportarExcel}>
                                    <FontAwesomeIcon icon={faFileExcel} className="me-2" /> Excel
                                </button>
                                <button className="btn btn-warning rounded-pill px-4 text-dark" 
                                        onClick={() => { setShowPapelera(true); cargarPapelera(); }}>
                                    <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera
                                </button>
                            </div>
                        </div>

                        {/* Lista de mascotas con botón de basura */}
                        <div className="row g-4">
                            {paginatedMascotas.map(m => (
                                <div className="col-md-4 col-sm-6" key={m.id}>
                                    <div className="card border-0 shadow-lg p-4 rounded-4 bg-white position-relative hover-shadow" 
                                         onClick={() => seleccionarMascota(m)}>
                                        <div className="d-flex align-items-center" style={{ cursor: 'pointer' }}>
                                            <div className="bg-primary bg-opacity-10 p-3 rounded-circle me-3">
                                                <FontAwesomeIcon icon={faPaw} className="text-primary fs-3" />
                                            </div>
                                            <div>
                                                <h5 className="fw-bold mb-0">{m.nombre}</h5>
                                                <small className="text-muted">Dueño: {m.dueno_nombre}</small>
                                            </div>
                                        </div>

                                        <button 
                                            className="btn btn-outline-danger position-absolute top-0 end-0 m-3 rounded-circle"
                                            onClick={(e) => { e.stopPropagation(); confirmarEliminarMascota(m); }}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Paginación */}
                        {totalPagesMascotas > 1 && (
                            <div className="d-flex justify-content-center mt-5 gap-3">
                                <button className="btn btn-outline-light rounded-pill px-5 py-2" 
                                        onClick={() => setCurrentPageMascotas(p => Math.max(1, p-1))}
                                        disabled={currentPageMascotas === 1}>← Anterior</button>
                                <div className="px-4 py-2 bg-white bg-opacity-10 rounded-pill text-white fw-bold">
                                    Página {currentPageMascotas} de {totalPagesMascotas}
                                </div>
                                <button className="btn btn-outline-light rounded-pill px-5 py-2" 
                                        onClick={() => setCurrentPageMascotas(p => Math.min(totalPagesMascotas, p+1))}
                                        disabled={currentPageMascotas === totalPagesMascotas}>Siguiente →</button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Historial individual - puedes dejarlo como estaba */
                    <></>
                )}
            </div>

            {/* ==================== MODAL PAPELERA ==================== */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000 }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h4 className="modal-title fw-bold">
                                    <FontAwesomeIcon icon={faTrash} className="me-2" /> PAPELERA DE MASCOTAS
                                </h4>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPapelera(false)}></button>
                            </div>
                            <div className="modal-body">
                                {/* Tabla de papelera */}
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Dueño</th>
                                                <th>Borrado por</th>
                                                <th>Fecha de borrado</th>
                                                <th className="text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mascotasEliminadas.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center py-4">No hay mascotas en la papelera</td></tr>
                                            ) : (
                                                mascotasEliminadas.map(m => (
                                                    <tr key={m.id}>
                                                        <td><strong>{m.nombre}</strong></td>
                                                        <td>{m.dueno_nombre}</td>
                                                        <td>{m.responsable_borrado || 'Sistema'}</td>
                                                        <td>{new Date(m.fecha_borrado).toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <button 
                                                                className="btn btn-success btn-sm px-3"
                                                                onClick={() => restaurarMascota(m.id)}
                                                            >
                                                                Restaurar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary px-5 rounded-pill" onClick={() => setShowPapelera(false)}>
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== MODAL DE ÉXITO BONITO ==================== */}
            {showSuccessModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 4000 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content rounded-4 text-center p-4 shadow-lg">
                            <div className="py-4">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-success mb-3" style={{ fontSize: '4rem' }} />
                                <h4 className="fw-bold text-success mb-2">¡Éxito!</h4>
                                <p className="text-muted fs-5">{successMessage}</p>
                            </div>
                            <button 
                                className="btn btn-success rounded-pill px-5 py-2 fw-bold"
                                onClick={() => setShowSuccessModal(false)}
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal 
                show={showConfirm} 
                onClose={() => setShowConfirm(false)} 
                onConfirm={handleEliminar} 
                title={deleteType === 'mascota' ? "¿Mover a la papelera?" : "¿Eliminar registro?"} 
                message="Esta acción es irreversible." 
            />

            {/* Modal de Atención */}
            {showModal && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
                    {/* Tu modal de atención aquí */}
                </div>
            )}
        </div>
    );
};

export default HistorialPage;