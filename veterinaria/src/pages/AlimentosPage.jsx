import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBowlFood,
  faPlus,
  faEdit,
  faTrash,
  faSearch,
  faFilePdf,
  faFileExcel,
  faInfoCircle,
  faCalendarAlt,
  faDollarSign,
  faBox,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const AlimentosPage = () => {
  const [alimentos, setAlimentos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  // 🔥 NUEVO: Estados para Detalle
  const [showDetalle, setShowDetalle] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);

  const cargarAlimentos = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/productos/alimentos');
      const data = await res.json();
      setAlimentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    cargarAlimentos();
  }, []);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtrados.map(a => ({
        Nombre: a.nombre,
        Precio: a.precio_venta,
        Stock: a.stock,
        Vencimiento: a.vencimiento_alimento
          ? new Date(a.vencimiento_alimento).toLocaleDateString()
          : 'N/A'
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alimentos");
    XLSX.writeFile(wb, "Stock_Alimentos_Malfi.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventario de Alimentos - Malfi", 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Precio', 'Stock', 'Vencimiento']],
      body: filtrados.map(a => [
        a.nombre,
        `$${a.precio_venta}`,
        a.stock,
        a.vencimiento_alimento
          ? new Date(a.vencimiento_alimento).toLocaleDateString()
          : 'N/A'
      ]),
      headStyles: { fillColor: [40, 167, 69] }
    });
    doc.save("Stock_Alimentos_Malfi.pdf");
  };

  const verificarVencimiento = (fecha) => {
    if (!fecha) return { texto: '', clase: '', vencido: false };
    const hoy = new Date();
    const fVenc = new Date(fecha);
    if (fVenc < hoy) return { texto: 'VENCIDO', clase: 'bg-danger text-white', vencido: true };
    if ((fVenc - hoy) / (1000 * 60 * 60 * 24) <= 30)
      return { texto: 'VENCE PRONTO', clase: 'bg-warning text-dark', vencido: false };
    return { texto: '', clase: '', vencido: false };
  };

  const filtrados = alimentos.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      className="container-fluid min-vh-100 p-4 position-relative"
      style={{
        backgroundImage: `url('https://i.pinimg.com/736x/48/93/4a/48934a256d6b89731eb45e6808a6a4a5.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay para contraste sutil */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }}
      />

      <div className="position-relative" style={{ zIndex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
            <FontAwesomeIcon icon={faBowlFood} className="me-2" /> Alimentos
          </h1>
          <div className="d-flex gap-2">
            <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}>
              <FontAwesomeIcon icon={faFilePdf} />
            </button>
            <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}>
              <FontAwesomeIcon icon={faFileExcel} />
            </button>
            <button
              className="btn btn-light rounded-pill px-3 fw-bold shadow-sm"
              onClick={() => {
                setDatosEdicion(null);
                setShowModal(true);
              }}
            >
              + Nuevo
            </button>
          </div>
        </div>

        <div className="row justify-content-center mb-5">
          <div className="col-md-6 col-lg-5">
            <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
              <span className="input-group-text bg-white border-0 ps-3">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-0 py-2 ps-1"
                placeholder="Buscar alimento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="row g-4">
          {filtrados.map(a => {
            const infoVenc = verificarVencimiento(a.vencimiento_alimento);
            return (
              <div className="col-md-4 col-lg-3" key={a.id}>
                {/* MODIFICACIÓN: Transparencia aplicada aquí */}
                <div
                  className={`card border-0 shadow-sm p-3 rounded-4 h-100 transition-card ${
                    infoVenc.vencido ? 'opacity-75' : ''
                  }`}
                  style={{
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.75)', // Fondo blanco transparente
                    backdropFilter: 'blur(10px)', // Desenfoque del fondo
                    WebkitBackdropFilter: 'blur(10px)' // Compatibilidad Safari
                  }}
                  onClick={() => {
                    setItemSeleccionado(a);
                    setShowDetalle(true);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="fw-bold">{a.nombre}</h6>
                    {infoVenc.texto && (
                      <span className={`badge ${infoVenc.clase} x-small`}>{infoVenc.texto}</span>
                    )}
                  </div>
                  <p className="text-success fw-bold mb-1">$ {a.precio_venta}</p>
                  <div className="d-flex justify-content-between align-items-center mt-auto">
                    <span
                      className={`badge ${
                        a.stock <= 5 ? 'bg-warning text-dark' : 'bg-success'
                      } px-3 py-2 rounded-pill`}
                    >
                      Stock: {a.stock}
                    </span>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-outline-primary rounded-circle"
                        style={{ backgroundColor: 'white' }}
                        onClick={e => {
                          e.stopPropagation();
                          setDatosEdicion(a);
                          setShowModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger rounded-circle"
                        style={{ backgroundColor: 'white' }}
                        onClick={e => {
                          e.stopPropagation();
                          setIdToDelete(a.id);
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
          })}
        </div>
      </div>

      {/* Modal Detalle Alimento */}
      {showDetalle && itemSeleccionado && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg p-4">
              <h4 className="fw-bold mb-4" style={{ color: '#1e5128' }}>
                <FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Información de Alimento
              </h4>
              <div className="text-center mb-4">
                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-4 mb-3">
                  <FontAwesomeIcon icon={faBowlFood} size="4x" className="text-success" />
                </div>
                <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
              </div>
              <ul className="list-group rounded-4 overflow-hidden border">
                <div className="list-group-item d-flex gap-3 py-3">
                  <FontAwesomeIcon icon={faDollarSign} className="text-success" />
                  <strong>Precio:</strong> ${itemSeleccionado.precio_venta}
                </div>
                <div className="list-group-item d-flex gap-3 py-3">
                  <FontAwesomeIcon icon={faBox} className="text-primary" />
                  <strong>Stock:</strong> {itemSeleccionado.stock} unidades
                </div>
                <div className="list-group-item d-flex gap-3 py-3">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-danger" />
                  <strong>Vencimiento:</strong>{' '}
                  {itemSeleccionado.vencimiento_alimento
                    ? new Date(itemSeleccionado.vencimiento_alimento).toLocaleDateString()
                    : 'No registra'}
                </div>
              </ul>
              <button
                className="btn btn-success w-100 rounded-pill mt-4 fw-bold"
                onClick={() => setShowDetalle(false)}
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      <ProductoModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onGuardar={async form => {
          const url = datosEdicion
            ? `http://localhost:3001/api/productos/${datosEdicion.id}`
            : 'http://localhost:3001/api/productos';
          await fetch(url, {
            method: datosEdicion ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, categoria: 'alimentos' })
          });
          setShowModal(false);
          cargarAlimentos();
        }}
        datosEdicion={datosEdicion}
        categoria="alimentos"
      />

      <ConfirmModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={async () => {
          await fetch(`http://localhost:3001/api/productos/${idToDelete}`, { method: 'DELETE' });
          setShowConfirm(false);
          cargarAlimentos();
        }}
      />
    </div>
  );
};

export default AlimentosPage;