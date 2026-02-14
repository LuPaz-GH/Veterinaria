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
            const res = await fetch('http://localhost:3001/api/productos/medicamentos');
            const data = await res.json();
            setMedicamentos(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { cargar(); }, []);

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
            backgroundImage: `url('https://i.pinimg.com/736x/24/04/85/24048509b8281e9319b3ce370e522a7b.jpg')`,
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
                    {filtrados.map(m => (
                        <div className="col-md-4 col-lg-3" key={m.id}>
                            <div className={`card border-0 shadow-sm p-3 rounded-4 h-100 border-start border-4 border-primary transition-card`} 
                                 style={{ 
                                     cursor: 'pointer', 
                                     background: 'rgba(255, 255, 255, 0.75)', 
                                     backdropFilter: 'blur(10px)',
                                     WebkitBackdropFilter: 'blur(10px)'
                                 }} 
                                 onClick={() => { setItemSeleccionado(m); setShowDetalle(true); }}>
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <h6 className="fw-bold">{m.nombre}</h6>
                                </div>
                                <p className="text-primary fw-bold mb-1">$ {m.precio_venta}</p>
                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                    {/* ✅ LÓGICA DE COLOR RECUPERADA AQUÍ */}
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
                    ))}
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
                    </ul>
                    <button className="btn btn-primary w-100 rounded-pill mt-4 fw-bold" onClick={() => setShowDetalle(false)}>CERRAR</button>
                  </div>
                </div>
              </div>
            )}

            <ProductoModal show={showModal} onClose={() => setShowModal(false)} onGuardar={async (form) => {
                const url = datosEdicion ? `http://localhost:3001/api/productos/${datosEdicion.id}` : 'http://localhost:3001/api/productos';
                await fetch(url, { method: datosEdicion ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, categoria: 'medicamentos' }) });
                setShowModal(false); cargar();
            }} datosEdicion={datosEdicion} categoria="medicamentos" />
            <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={async () => { await fetch(`http://localhost:3001/api/productos/${idToDelete}`, { method: 'DELETE' }); setShowConfirm(false); cargar(); }} />
        </div>
    );
};

export default MedicamentosPage;