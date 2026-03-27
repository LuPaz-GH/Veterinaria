import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPills, faPlus, faEdit, faTrash, faSearch, faFilePdf, faFileExcel,
    faInfoCircle, faMedkit, faDollarSign, faBox, faArrowLeft, faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const MedicamentosPage = () => {
    const [medicamentos, setMedicamentos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [limite] = useState(12);
    const [loading, setLoading] = useState(false);

    const cargar = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/productos/medicamentos?pagina=${pagina}&limite=${limite}`);
            console.log('💊 Respuesta de medicamentos:', res.data);
            const data = res.data.productos || res.data || [];
            setMedicamentos(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("❌ Error al cargar medicamentos:", err);
            setMedicamentos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargar();
    }, [pagina]);

    const getVencimientoInfo = (fechaVenc) => {
        if (!fechaVenc) return { estado: 'sin_fecha', texto: 'Sin fecha', clase: 'bg-secondary' };
        const hoy = new Date();
        const venc = new Date(fechaVenc);
        const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
        if (diasRestantes < 0) return { estado: 'vencido', texto: 'VENCIDO', clase: 'bg-danger text-white' };
        if (diasRestantes <= 30) return { estado: 'proximo', texto: `Próximo (${diasRestantes} d)`, clase: 'bg-warning text-dark' };
        return { estado: 'ok', texto: `OK (${diasRestantes} d)`, clase: 'bg-success text-white' };
    };

    const filtrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    const getStockBadgeClass = (cantidad) => {
        if (cantidad <= 0) return 'bg-danger';
        if (cantidad <= 5) return 'bg-warning text-dark';
        return 'bg-primary';
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtrados.map(m => ({
            Nombre: m.nombre,
            Precio: m.precio_venta,
            Stock: m.stock,
            Vencimiento: m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Medicamentos");
        XLSX.writeFile(wb, "Stock_Medicamentos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Farmacia - Malfi Veterinaria", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Nombre', 'Precio', 'Stock', 'Vencimiento']],
            body: filtrados.map(m => [
                m.nombre,
                `$${m.precio_venta}`,
                m.stock,
                m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A'
            ])
        });
        doc.save("Stock_Medicamentos_Malfi.pdf");
    };

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{
            backgroundImage: `url('https://i.pinimg.com/736x/17/82/7f/17827f1bb88cd66e62c0c1d17f16d184.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faPills} className="me-2" /> Farmacia
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}>
                            <FontAwesomeIcon icon={faFilePdf} />
                        </button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} />
                        </button>
                        <button className="btn btn-light rounded-pill px-4 fw-bold shadow-sm" onClick={() => {
                            setDatosEdicion(null);
                            setShowModal(true);
                        }}>
                            + Nuevo
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-white py-5">
                        <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="mt-2">Cargando medicamentos...</p>
                    </div>
                ) : (
                    <>
                        <div className="row justify-content-center mb-5">
                            <div className="col-md-6 col-lg-5">
                                <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                                    <span className="input-group-text bg-white border-0 ps-3">
                                        <FontAwesomeIcon icon={faSearch} className="text-muted" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border-0 py-2 ps-1"
                                        placeholder="Buscar medicamento..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            {filtrados.length > 0 ? (
                                filtrados.map(m => {
                                    const vencInfo = getVencimientoInfo(m.vencimiento_med);
                                    return (
                                        <div className="col-md-4 col-lg-3" key={m.id}>
                                            <div className="card border-0 shadow-sm p-3 rounded-4 h-100 border-start border-4 border-primary"
                                                style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
                                                <div className="d-flex justify-content-between align-items-start mb-1">
                                                    <h6 className="fw-bold">{m.nombre}</h6>
                                                    <span className={`badge ${vencInfo.clase} small`}>{vencInfo.texto}</span>
                                                </div>
                                                <p className="text-primary fw-bold mb-1">${m.precio_venta}</p>
                                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                                    <span className={`badge ${getStockBadgeClass(m.stock)} px-3 py-2 rounded-pill`}>
                                                        Stock: {m.stock}
                                                    </span>
                                                    <div className="d-flex gap-1">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary rounded-circle"
                                                            onClick={() => {
                                                                setDatosEdicion(m);
                                                                setShowModal(true);
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger rounded-circle"
                                                            onClick={() => {
                                                                setIdToDelete(m.id);
                                                                setShowConfirm(true);
                                                            }}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-12 text-center text-white py-5">
                                    <h3>No hay medicamentos registrados</h3>
                                    <p>Hacé clic en "+ Nuevo" para agregar el primero</p>
                                </div>
                            )}
                        </div>

                        <div className="d-flex justify-content-center align-items-center gap-3 mt-5 pb-4">
                            <button
                                className="btn btn-light rounded-circle shadow-sm"
                                disabled={pagina === 1}
                                onClick={() => setPagina(pagina - 1)}
                            >
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </button>
                            <span className="badge bg-white text-dark px-3 py-2 rounded-pill fw-bold">
                                Página {pagina}
                            </span>
                            <button
                                className="btn btn-light rounded-circle shadow-sm"
                                disabled={medicamentos.length < limite}
                                onClick={() => setPagina(pagina + 1)}
                            >
                                <FontAwesomeIcon icon={faArrowRight} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <ProductoModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onGuardar={async (form) => {
                    try {
                        const url = datosEdicion ? `/productos/${datosEdicion.id}` : '/productos';
                        const metodo = datosEdicion ? 'put' : 'post';
                        await api[metodo](url, { ...form, categoria: 'medicamentos' });
                        setShowModal(false);
                        cargar();
                    } catch (err) {
                        console.error("Error al guardar:", err);
                        alert("Error: No se pudo guardar. Revisa que todos los campos estén llenos.");
                    }
                }}
                datosEdicion={datosEdicion}
                categoria="medicamentos"
            />

            <ConfirmModal
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={async () => {
                    try {
                        await api.delete(`/productos/${idToDelete}`);
                        setShowConfirm(false);
                        cargar();
                    } catch (err) {
                        console.error(err);
                    }
                }}
            />
        </div>
    );
};

export default MedicamentosPage;