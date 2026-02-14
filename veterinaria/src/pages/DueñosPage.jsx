import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faPlus,
  faEdit,
  faTrash,
  faFilePdf,
  faFileExcel,
  faSearch
} from '@fortawesome/free-solid-svg-icons';
import DueñoModal from '../component/DueñoModal';
import ConfirmModal from '../component/ConfirmModal';
// Librerías para exportar
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const DueñosPage = () => {
  // Estados principales
  const [duenos, setDuenos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [idAEliminar, setIdAEliminar] = useState(null);

  // 1. Cargar lista de dueños desde el Backend
  const cargarDuenos = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/duenos');
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      setDuenos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando dueños:", error);
      setDuenos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDuenos(); }, []);

  // --- LÓGICA DEL BUSCADOR (CORREGIDA) ---
  const duenosFiltrados = duenos.filter((d) => {
    const termino = busqueda.toLowerCase();
    // CORREGIDO: Manejo de nulos para evitar error toString()
    const nombre = (d.nombre || "").toLowerCase();
    const dni = d.dni ? d.dni.toString() : "";
    const tel = (d.telefono || "");

    return (
      nombre.includes(termino) ||
      dni.includes(termino) ||
      tel.includes(termino)
    );
  });

  // --- EXPORTAR A PDF ---
  const exportarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Malfi Veterinaria - Reporte de Dueños", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 28);

      const tableColumn = ["Nombre", "DNI", "Teléfono", "Dirección"];
      const tableRows = duenosFiltrados.map(d => [
        d.nombre,
        d.dni,
        d.telefono || '-',
        d.direccion || '-'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [102, 51, 153] }, // Morado Malfi
        styles: { fontSize: 10 },
      });

      doc.save(`dueños_malfi_${Date.now()}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF.");
    }
  };

  // --- EXPORTAR A EXCEL ---
  const exportarExcel = () => {
    const datosExcel = duenosFiltrados.map(d => ({
      Nombre: d.nombre,
      DNI: d.dni,
      Teléfono: d.telefono || '-',
      Dirección: d.direccion || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dueños");
    XLSX.writeFile(workbook, "Dueños_Malfi.xlsx");
  };

  // 2. Guardar (POST o PUT)
  const handleGuardar = async (formData) => {
    const esEdicion = !!datosEdicion;
    const url = esEdicion
      ? `http://localhost:3001/api/duenos/${datosEdicion.id}`
      : 'http://localhost:3001/api/duenos';

    try {
      const response = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        setDatosEdicion(null);
        cargarDuenos();
      }
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  const prepararEdicion = (dueño) => {
    setDatosEdicion(dueño);
    setShowModal(true);
  };

  const handleConfirmarEliminacion = async () => {
    if (!idAEliminar) return;
    try {
      const response = await fetch(`http://localhost:3001/api/duenos/${idAEliminar}`, { method: 'DELETE' });
      if (response.ok) {
        setShowConfirm(false);
        setIdAEliminar(null);
        cargarDuenos();
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const fondoAnimal = `url('https://i.pinimg.com/736x/57/76/08/57760846a23fa84c8a70fae35462446f.jpg')`;

  return (
    <div
      className="container-fluid p-4 p-md-5 min-vh-100 position-relative"
      style={{
        backgroundImage: fondoAnimal,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay sutil para ver mejor la imagen de fondo */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(30, 81, 40, 0.4)', zIndex: 1 }} />

      <div className="position-relative" style={{ zIndex: 2 }}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <h1 className="fw-bold text-white" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
            <FontAwesomeIcon icon={faUsers} className="me-3" />
            Gestión de Dueños
          </h1>
          <div className="d-flex gap-2">
            <button className="btn btn-danger rounded-pill px-4 shadow-sm" onClick={exportarPDF}>
              <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
            </button>
            <button className="btn btn-success rounded-pill px-4 shadow-sm" onClick={exportarExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="me-2" /> Excel
            </button>
          </div>
        </div>

        <div className="row mb-4 align-items-center">
          <div className="col-md-4">
            <button
              className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm"
              onClick={() => { setDatosEdicion(null); setShowModal(true); }}
            >
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              + Nuevo Dueño
            </button>
          </div>

          <div className="col-md-5 ms-auto">
            <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0" style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(5px)' }}>
              <span className="input-group-text bg-transparent border-0 ps-3">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-0 py-2 ps-1 bg-transparent"
                placeholder="Buscar por nombre, DNI o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* TABLA TRANSPARENTE (GLASSMORPHISM) */}
        <div className="table-responsive shadow-lg rounded-4 overflow-hidden" 
             style={{ 
                 background: 'rgba(255, 255, 255, 0.8)', 
                 backdropFilter: 'blur(12px)',
                 border: '1px solid rgba(255, 255, 255, 0.3)'
             }}>
          <table className="table table-hover align-middle mb-0 bg-transparent">
            <thead style={{ backgroundColor: '#663399', color: 'white' }}>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-5 fw-bold text-dark">Cargando dueños...</td></tr>
              ) : duenosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-5 text-muted">
                    <h5>{busqueda ? `No hay resultados para "${busqueda}"` : "No hay dueños registrados"}</h5>
                  </td>
                </tr>
              ) : (
                duenosFiltrados.map((dueno) => (
                  <tr key={dueno.id}>
                    <td className="fw-bold">{dueno.nombre}</td>
                    <td>{dueno.dni}</td>
                    <td>{dueno.telefono || '-'}</td>
                    <td>{dueno.direccion || '-'}</td>
                    <td className="text-center">
                      <button className="btn btn-white btn-sm rounded-circle me-2 shadow-sm text-primary border" onClick={() => prepararEdicion(dueno)} title="Editar">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn btn-white btn-sm rounded-circle shadow-sm text-danger border" onClick={() => { setIdAEliminar(dueno.id); setShowConfirm(true); }} title="Eliminar">
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

      <DueñoModal 
        show={showModal} 
        onClose={() => { setShowModal(false); setDatosEdicion(null); }} 
        onGuardar={handleGuardar} 
        datosEdicion={datosEdicion} 
      />
      
      <ConfirmModal 
        show={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        onConfirm={handleConfirmarEliminacion} 
        title="Eliminar Dueño" 
        message="¿Estás seguro de que deseas eliminar permanentemente a este cliente?" 
        confirmText="Sí, eliminar" 
        cancelText="Cancelar" 
        confirmColor="danger" 
      />
    </div>
  );
};

export default DueñosPage;