import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag, faPlus, faEdit, faTrash, faSearch, faFilePdf, faFileExcel, faTag, faDollarSign, faBoxOpen, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PetshopPage = () => {
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);

    // 🔥 NUEVO Detalle
    const [showDetalle, setShowDetalle] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);

    const cargarProductos = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/productos/petshop');
            const data = await res.json();
            setProductos(Array.isArray(data) ? data : []);
            console.log('[Petshop] Productos cargados:', data.length);
        } catch (err) { 
            console.error("Error al cargar productos:", err); 
        }
    };

    useEffect(() => { cargarProductos(); }, []);

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(filtrados.map(p => ({ Nombre: p.nombre, Precio: p.precio_venta, Stock: p.stock })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Petshop");
        XLSX.writeFile(wb, "Stock_Petshop_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Petshop - Malfi Veterinaria", 14, 20);
        autoTable(doc, { startY: 30, head: [['Nombre', 'Precio', 'Stock']], body: filtrados.map(p => [p.nombre, `$${p.precio_venta}`, p.stock]) });
        doc.save("Stock_Petshop_Malfi.pdf");
    };

    const getStockBadge = (cantidad) => cantidad <= 0 ? 'bg-danger' : cantidad <= 5 ? 'bg-warning text-dark' : 'bg-success';
    const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{ 
            backgroundImage: `url('https://i.pinimg.com/736x/32/9f/4c/329f4c10c8d03b5c2428340c952e5615.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            {/* Overlay para contraste */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />

            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faShoppingBag} className="me-2"/> Petshop
                    </h1>
                    <div className="d-flex gap-2">
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}><FontAwesomeIcon icon={faFilePdf} /></button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}><FontAwesomeIcon icon={faFileExcel} /></button>
                        <button className="btn btn-light rounded-pill px-3 fw-bold shadow-sm" onClick={() => { setDatosEdicion(null); setShowModal(true); }}>+ Nuevo</button>
                    </div>
                </div>

                <div className="row justify-content-center mb-5">
                    <div className="col-md-6 col-lg-5">
                        <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                            <span className="input-group-text bg-white border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                            <input type="text" className="form-control border-0 py-2 ps-1" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="row g-4">
                    {filtrados.map(p => (
                        <div className="col-md-4 col-lg-3" key={p.id}>
                            <div 
                              className="card border-0 shadow-sm p-3 rounded-4 h-100 transition-card" 
                              style={{ 
                                  cursor: 'pointer',
                                  background: 'rgba(255, 255, 255, 0.75)', // Blanco transparente
                                  backdropFilter: 'blur(10px)',           // Desenfoque del fondo
                                  WebkitBackdropFilter: 'blur(10px)'      // Compatibilidad Safari
                              }}
                              onClick={() => { setItemSeleccionado(p); setShowDetalle(true); }}
                            >
                                <h5 className="fw-bold mb-1">{p.nombre}</h5>
                                <p className="text-success fw-bold mb-2">$ {p.precio_venta}</p>
                                <div className="d-flex justify-content-between align-items-center mt-auto">
                                    <span className={`badge ${getStockBadge(p.stock)} px-3 py-2 rounded-pill shadow-sm`}>{p.stock <= 0 ? 'AGOTADO' : `Stock: ${p.stock}`}</span>
                                    <div className="d-flex gap-1">
                                        <button className="btn btn-sm btn-outline-primary rounded-circle shadow-sm" style={{backgroundColor: 'white'}} onClick={(e) => { e.stopPropagation(); setDatosEdicion(p); setShowModal(true); }}><FontAwesomeIcon icon={faEdit} /></button>
                                        <button className="btn btn-sm btn-outline-danger rounded-circle shadow-sm" style={{backgroundColor: 'white'}} onClick={(e) => { e.stopPropagation(); setIdToDelete(p.id); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Detalle Producto */}
            {showDetalle && itemSeleccionado && (
              <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)', zIndex: 1060}}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                    <h4 className="fw-bold mb-4" style={{color:'#663399'}}><FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Detalle del Producto</h4>
                    <div className="text-center mb-4">
                      <div className="bg-light rounded-pill d-inline-flex p-4 shadow-sm mb-3"><FontAwesomeIcon icon={faShoppingBag} size="4x" className="text-primary" /></div>
                      <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
                    </div>
                    <ul className="list-group rounded-4 overflow-hidden border">
                      <div className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faDollarSign} className="text-success" /> <strong>Precio Venta:</strong> ${itemSeleccionado.precio_venta}</div>
                      <div className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faBoxOpen} className="text-primary" /> <strong>Stock Actual:</strong> {itemSeleccionado.stock} unidades</div>
                      <div className="list-group-item d-flex gap-3 py-3 align-items-center"><FontAwesomeIcon icon={faTag} className="text-muted" /> <strong>Categoría:</strong> Petshop</div>
                    </ul>
                    <button className="btn btn-primary w-100 rounded-pill mt-4 fw-bold" onClick={() => setShowDetalle(false)}>CERRAR</button>
                  </div>
                </div>
              </div>
            )}

            <ProductoModal 
              show={showModal} 
              onClose={() => setShowModal(false)} 
              onGuardar={async (form) => {
                try {
                  const url = datosEdicion 
                    ? `http://localhost:3001/api/productos/${datosEdicion.id}` 
                    : 'http://localhost:3001/api/productos';
                  
                  const method = datosEdicion ? 'PUT' : 'POST';
                  
                  console.log('[Petshop] Guardando producto con:', form);
                  
                  const res = await fetch(url, { 
                    method, 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                      ...form, 
                      categoria: 'petshop'  // Aseguramos que siempre sea petshop
                    }) 
                  });

                  if (!res.ok) {
                    const errText = await res.text();
                    console.error('[Petshop] Error al guardar:', errText);
                    alert('Error al guardar: ' + errText);
                    return;
                  }

                  console.log('[Petshop] Producto guardado OK');
                  setShowModal(false);
                  
                  // Recarga inmediata + pequeño delay para que el backend procese
                  await new Promise(r => setTimeout(r, 500));
                  await cargarProductos();
                } catch (err) {
                  console.error('[Petshop] Error en onGuardar:', err);
                  alert('Error de conexión al guardar');
                }
              }} 
              datosEdicion={datosEdicion} 
              categoria="petshop" 
            />
            
            <ConfirmModal 
              show={showConfirm} 
              onClose={() => setShowConfirm(false)} 
              onConfirm={async () => { 
                try {
                  await fetch(`http://localhost:3001/api/productos/${idToDelete}`, { method: 'DELETE' }); 
                  setShowConfirm(false); 
                  await cargarProductos();
                } catch (err) {
                  console.error('Error al eliminar:', err);
                }
              }} 
            />
        </div>
    );
};

export default PetshopPage;