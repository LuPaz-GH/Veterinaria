import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPills, faPlus, faEdit, faTrash, faSearch, faFilePdf, faFileExcel, 
    faInfoCircle, faCalendarTimes, faMedkit, faDollarSign, faTimes, faBox 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';  // ← Cambiado a api (con token)

const MedicamentosPage = () => {
    const [medicamentos, setMedicamentos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);

    const [showDetalle, setShowDetalle] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);

    const cargar = async () => {
        try {
            const res = await api.get('/productos/medicamentos');
            const data = res.data;
            // Ordenamos por fecha de vencimiento más próxima primero
            const sorted = Array.isArray(data) ? data.sort((a, b) => {
                const fechaA = a.vencimiento_med ? new Date(a.vencimiento_med) : new Date('9999-12-31');
                const fechaB = b.vencimiento_med ? new Date(b.vencimiento_med) : new Date('9999-12-31');
                return fechaA - fechaB;
            }) : [];
            setMedicamentos(sorted);
        } catch (err) { 
            console.error("Error al cargar medicamentos:", err);
            if (err.response?.status === 401) {
                alert("Sesión expirada. Inicia sesión nuevamente.");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
    };

    useEffect(() => { cargar(); }, []);

    // Función auxiliar para determinar si está próximo a vencer o vencido
    const getVencimientoInfo = (fechaVenc) => {
        if (!fechaVenc) return { estado: 'sin_fecha', texto: 'Sin fecha', clase: 'bg-secondary' };

        const hoy = new Date();
        const venc = new Date(fechaVenc);
        const diasRestantes = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));

        if (diasRestantes < 0) {
            return { estado: 'vencido', texto: 'VENCIDO', clase: 'bg-danger text-white', dias: Math.abs(diasRestantes) };
        }
        if (diasRestantes <= 30) {
            return { estado: 'proximo', texto: `Próximo (${diasRestantes} días)`, clase: 'bg-warning text-dark', dias: diasRestantes };
        }
        return { estado: 'ok', texto: `Vence en ${diasRestantes} días`, clase: 'bg-success text-white', dias: diasRestantes };
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtrados.map(m => ({ 
            Nombre: m.nombre, Precio: m.precio_venta, Stock: m.stock, 
            Vencimiento: m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A' 
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Farmacia");
        XLSX.writeFile(wb, "Stock_Medicamentos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        if (filtrados.length === 0) return alert("No hay datos para exportar");
        const doc = new jsPDF();
        doc.text("Inventario de Farmacia - Malfi Veterinaria", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Medicamento', 'Precio', 'Stock', 'Vencimiento']],
            body: filtrados.map(m => [
                m.nombre, 
                `$${m.precio_venta}`, 
                m.stock, 
                m.vencimiento_med ? new Date(m.vencimiento_med).toLocaleDateString() : 'N/A'
            ]),
            headStyles: { fillColor: [102, 51, 153] }
        });
        doc.save("Stock_Medicamentos_Malfi.pdf");
    };

    const filtrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    // ✅ FUNCIÓN AUXILIAR PARA EL COLOR DEL STOCK
    const getStockBadgeClass = (cantidad) => {
        if (cantidad <= 0) return 'bg-danger'; // Rojo si no hay nada
        if (cantidad <= 5) return 'bg-warning text-dark'; // Naranja si es bajo
        return 'bg-primary'; // Azul si está bien
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
                        <FontAwesomeIcon icon={faPills} className="me-2"/> Farmacia
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}>
                            <FontAwesomeIcon icon={faFilePdf} /> PDF
                        </button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} /> Excel
                        </button>
                        <button className="btn btn-light rounded-pill px-3 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>
                            + Nuevo
                        </button>
                    </div>
                </div>

                <div className="row justify-content-center mb-5">
                    <div className="col-md-6 col-lg-5">
                        <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                            <span className="input-group-text bg-white border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                            <input type="text" className="form-control border-0 py-2 ps-1" placeholder="Buscar medicamento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {filtrados.map(m => {
                        const vencInfo = getVencimientoInfo(m.vencimiento_med);
                        let cardStyle = {};
                        if (vencInfo.estado === 'vencido') {
                            cardStyle.background = 'rgba(255, 99, 71, 0.25)'; // rojo suave
                        } else if (vencInfo.estado === 'proximo') {
                            cardStyle.background = 'rgba(255, 193, 7, 0.25)'; // amarillo/naranja suave
                        }

                        return (
                            <div className="col-md-4 col-lg-3" key={m.id}>
                                <div 
                                    className={`card border-0 shadow-sm p-3 rounded-4 h-100 border-start border-4 border-primary transition-card`} 
                                    style={{ 
                                        cursor: 'pointer', 
                                        ...cardStyle,
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)'
                                    }} 
                                    onClick={() => { setItemSeleccionado(m); setShowDetalle(true); }}
                                >
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                        <h6 className="fw-bold">{m.nombre}</h6>
                                        {/* Badge de vencimiento */}
                                        <span className={`badge ${vencInfo.clase} px-2 py-1 rounded-pill small`}>
                                            {vencInfo.texto}
                                        </span>
                                    </div>
                                    <p className="text-primary fw-bold mb-1">$ {m.precio_venta}</p>
                                    <div className="d-flex justify-content-between align-items-center mt-auto">
                                        {/* LÓGICA DE COLOR RECUPERADA AQUÍ */}
                                        <span className={`badge ${getStockBadgeClass(m.stock)} px-3 py-2 rounded-pill`}>
                                            {m.stock <= 0 ? 'SIN STOCK' : `Stock: ${m.stock}`}
                                        </span>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-sm btn-outline-primary rounded-circle" onClick={(e) => { e.stopPropagation(); setDatosEdicion(m); setShowModal(true); }}><FontAwesomeIcon icon={faEdit} /></button>
                                            <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={(e) => { e.stopPropagation(); setIdToDelete(m.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showDetalle && itemSeleccionado && (
              <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)', zIndex: 1060}}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                    <h4 className="fw-bold mb-4" style={{color:'#007bff'}}><FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Detalle de Medicamento</h4>
                    <div className="text-center mb-4">
                        <div className="bg-primary bg-opacity-10 rounded-pill d-inline-flex p-4 mb-3"><FontAwesomeIcon icon={faMedkit} size="4x" className="text-primary" /></div>
                        <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
                    </div>
                    <ul className="list-group rounded-4 overflow-hidden border">
                        <div className="list-group-item d-flex gap-3 py-3"><FontAwesomeIcon icon={faDollarSign} className="text-success" /> <strong>Precio:</strong> ${itemSeleccionado.precio_venta}</div>
                        <div className="list-group-item d-flex gap-3 py-3"><FontAwesomeIcon icon={faBox} className="text-primary" /> <strong>Stock:</strong> {itemSeleccionado.stock} unidades</div>
                        {itemSeleccionado.vencimiento_med && (
                          <div className="list-group-item d-flex gap-3 py-3">
                            <FontAwesomeIcon icon={faCalendarTimes} className="text-danger" /> 
                            <strong>Vencimiento:</strong> {new Date(itemSeleccionado.vencimiento_med).toLocaleDateString()} 
                            <span className={`ms-2 badge ${getVencimientoInfo(itemSeleccionado.vencimiento_med).clase}`}>
                              {getVencimientoInfo(itemSeleccionado.vencimiento_med).texto}
                            </span>
                          </div>
                        )}
                    </ul>
                    <button className="btn btn-primary w-100 rounded-pill mt-4 fw-bold" onClick={() => setShowDetalle(false)}>CERRAR</button>
                  </div>
                </div>
              </div>
            )}

            <ProductoModal show={showModal} onClose={() => setShowModal(false)} onGuardar={async (form) => {
                const url = datosEdicion ? `http://localhost:3001/api/productos/${datosEdicion.id}` : 'http://localhost:3001/api/productos';
                await api({
                  url,
                  method: datosEdicion ? 'PUT' : 'POST',
                  data: { ...form, categoria: 'medicamentos' }
                });
                setShowModal(false); 
                cargar();
            }} datosEdicion={datosEdicion} categoria="medicamentos" />
            <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={async () => { 
                await api.delete(`/productos/${idToDelete}`); 
                setShowConfirm(false); 
                cargar(); 
            }} />
        </div>
    );
};

export default MedicamentosPage;