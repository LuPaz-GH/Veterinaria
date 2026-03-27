import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory, faUser, faCalendarAlt, faSyncAlt,
  faPlusCircle, faEdit, faTrashAlt, faSearch,
  faSort, faFilePdf, faFileExcel, faFileInvoice,
  faTimes, faExclamationTriangle, faCheckCircle,
  faInfoCircle, faUndo, faEye, faEyeSlash,
  faPaw, faWallet, faUsers, faScissors, faBox,
  faHeartbeat, faUserTie
} from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AuditoriaPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(25);
  const [orden, setOrden] = useState({ campo: 'fecha', direccion: 'DESC' });
  const [filtros, setFiltros] = useState({ 
    buscar: '', 
    periodo: 'todo', 
    categoria: '', 
    accion: '', 
    mostrarEliminados: false 
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [editForm, setEditForm] = useState({
    producto: '', categoria: '', precio_venta: '', stock: ''
  });

  // URL de la imagen de fondo: Usamos una de alta calidad que contraste con el azul
  const backgroundImage = "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1964&auto=format&fit=crop";

  const cargarHistorial = useCallback(async (pageOverride, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const currentPagina = pageOverride || pagina;

      let fechaDesde = '';
      let fechaHasta = '';
      const hoy = new Date();

      if (filtros.periodo === 'hoy') {
        fechaDesde = hoy.toISOString().split('T')[0];
        fechaHasta = fechaDesde;
      } else if (filtros.periodo === 'semana') {
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(hoy.getDate() - 7);
        fechaDesde = haceUnaSemana.toISOString().split('T')[0];
        fechaHasta = hoy.toISOString().split('T')[0];
      } else if (filtros.periodo === 'mes') {
        fechaDesde = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fechaHasta = hoy.toISOString().split('T')[0];
      }

      const params = {
        pagina: currentPagina,
        limite: limite,
        buscar: filtros.buscar || undefined,
        // ✅ CORRECCIÓN: Enviar como 'modulo' para que coincida con la BD
        modulo: filtros.categoria || undefined,
        accion: filtros.accion || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        orden: orden.campo,
        direccion: orden.direccion,
        mostrarEliminados: filtros.mostrarEliminados ? 'true' : 'false'
      };

      const res = await api.get('/auditoria/historial', { params });
      const dataRecibida = res.data.datos || [];
      const totalRecibido = res.data.total || 0;

      setMovimientos(dataRecibida);
      setTotalRegistros(totalRecibido);
    } catch (err) {
      console.error("❌ Error en cargarHistorial:", err.response?.data || err);
      toast.error('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [pagina, limite, orden, filtros]);

  useEffect(() => { 
    cargarHistorial(); 
  }, [cargarHistorial]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      cargarHistorial(pagina, true); 
    }, 30000);
    return () => clearInterval(intervalo); 
  }, [cargarHistorial, pagina]);

  const getId = (m) => m.id || m._id || m.id_auditoria;

  const handleEditar = (m) => {
    setSelectedMovement(m);
    setEditForm({
      producto: m.producto || '',
      categoria: m.categoria || '',
      precio_venta: m.precio_venta || '',
      stock: m.stock || ''
    });
    setShowEditModal(true);
  };

  const handleBorrarClick = (m) => {
    setSelectedMovement(m);
    setShowDeleteModal(true);
  };

  const confirmarBorrar = async () => {
    const id = getId(selectedMovement);
    try {
      await api.patch(`/auditoria/${id}`, {
        eliminado: true,
        usuario_eliminacion: selectedMovement.responsable || 'admin'
      });
      toast.success('Registro eliminado 🗑️');
      setShowDeleteModal(false);
      cargarHistorial();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const guardarEdicion = async () => {
    const id = getId(selectedMovement);
    try {
      await api.put(`/auditoria/${id}`, {
        ...editForm,
        usuario_modificacion: selectedMovement.responsable || 'admin',
        accion: 'Editado'
      });
      toast.success('Registro actualizado ✅');
      setShowEditModal(false);
      cargarHistorial();
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFiltros(prev => ({
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const aplicarFiltros = () => { 
    setPagina(1); 
    cargarHistorial(1); 
  };
  
  const limpiarFiltros = () => {
    setFiltros({ 
      buscar: '', 
      periodo: 'todo', 
      categoria: '', 
      accion: '', 
      mostrarEliminados: false 
    });
    setPagina(1);
    cargarHistorial(1);
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(movimientos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, "Auditoria.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Historial de Auditoría", 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Fecha', 'Módulo', 'Acción', 'Elemento Afectado', 'Mascota', 'Responsable']],
      body: movimientos.map(m => [
        new Date(m.fecha).toLocaleString('es-AR', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
        }), 
        m.modulo || '-', 
        m.accion || '-',
        m.producto || m.servicio || '-',
        m.mascota || '-',
        m.responsable || '-'
      ])
    });
    doc.save("Auditoria.pdf");
  };

  const renderAccion = (accion, eliminado) => {
    if (eliminado) return <span className="badge rounded-pill bg-danger shadow-sm">ELIMINADO</span>;
    const colors = { 
      Creado: 'bg-success', 
      Editado: 'bg-primary', 
      Eliminado: 'bg-warning text-dark',
      Finalizado: 'bg-info text-dark' 
    };
    return <span className={`badge rounded-pill shadow-sm ${colors[accion] || 'bg-secondary'}`}>{accion}</span>;
  };

  const renderModuloBadge = (modulo) => {
    const mods = {
      productos: { color: 'bg-info text-dark', icon: faBox, label: 'PRODUCTOS' },
      estetica: { color: 'bg-danger', icon: faScissors, label: 'ESTÉTICA' },
      clientes: { color: 'bg-primary', icon: faUsers, label: 'CLIENTES' },
      mascotas: { color: 'bg-warning text-dark', icon: faPaw, label: 'MASCOTAS' },
      caja: { color: 'bg-success', icon: faWallet, label: 'CAJA' },
      turnos: { color: 'bg-secondary', icon: faCalendarAlt, label: 'TURNOS' },
      historial: { color: 'bg-purple text-white', icon: faHeartbeat, label: 'HISTORIAL' },
      empleados: { color: 'bg-dark text-white border border-light', icon: faUserTie, label: 'EMPLEADOS' },
    };
    const m = mods[modulo] || { color: 'bg-secondary', icon: faInfoCircle, label: modulo?.toUpperCase() || '-' };
    return <span className={`badge ${m.color} px-3 py-2 shadow-sm`}><FontAwesomeIcon icon={m.icon} className="me-1" /> {m.label}</span>;
  };

  const getElementoAfectado = (m) => {
    if (m.modulo === 'clientes') return m.producto || 'Cliente registrado';
    if (m.modulo === 'mascotas') return 'Mascota registrada';
    if (m.modulo === 'empleados') return m.producto || 'Empleado registrado';
    if (m.modulo === 'turnos' || m.modulo === 'estetica') return m.producto || m.servicio || 'Turno registrado';
    if (m.modulo === 'historial') return m.producto || 'Consulta registrada';
    return m.producto || m.servicio || '-';
  };

  const getMascota = (m) => {
    if (m.modulo === 'clientes' && m.mascota) return m.mascota;
    if (m.modulo === 'mascotas' || m.modulo === 'turnos' || m.modulo === 'estetica') {
      return m.mascota || '-';
    }
    return '-';
  };

  const totalPaginas = Math.ceil(totalRegistros / limite);

  return (
    <div className="container-fluid min-vh-100 p-4 position-relative" style={{ 
      background: '#0a0f1a',
      color: 'white',
    }}>
      {/* CAPA DE IMAGEN */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `linear-gradient(rgba(10, 15, 26, 0.4), rgba(10, 15, 26, 0.8)), url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        zIndex: 0
      }} />

      <div className="position-relative" style={{ zIndex: 1 }}>
        <ToastContainer position="top-right" theme="dark" />

        {/* Encabezado */}
        <div className="d-flex justify-content-between align-items-center mb-5">
          <div className="d-flex align-items-center">
            <div className="bg-info bg-opacity-25 p-3 rounded-circle me-3 border border-info border-opacity-50">
                <FontAwesomeIcon icon={faHistory} className="text-info fs-3" />
            </div>
            <div>
                <h1 className="fw-bold mb-0 text-shadow">Auditoría General</h1>
                <p className="text-info mb-0 opacity-100 fw-semibold small">Monitoreo de actividad en tiempo real</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-danger border-2 rounded-pill px-3 shadow bg-dark bg-opacity-25" onClick={exportarPDF}>
              <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
            </button>
            <button className="btn btn-outline-success border-2 rounded-pill px-3 shadow bg-dark bg-opacity-25" onClick={exportarExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="me-2" /> Excel
            </button>
            <button className="btn btn-info rounded-pill px-4 shadow-lg fw-bold text-dark" onClick={() => cargarHistorial()} disabled={loading}>
              <FontAwesomeIcon icon={faSyncAlt} className={loading ? 'fa-spin me-2' : 'me-2'} /> Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card border-0 shadow-lg rounded-4 mb-4" style={{ 
          background: 'rgba(255, 255, 255, 0.08)', 
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}>
          <div className="card-body py-4">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <div className="input-group shadow-sm">
                  <span className="input-group-text bg-white bg-opacity-10 border-0 text-info">
                    <FontAwesomeIcon icon={faSearch} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control bg-white bg-opacity-10 border-0 text-white py-2" 
                    placeholder="Buscar registro..." 
                    name="buscar" 
                    value={filtros.buscar} 
                    onChange={handleFiltroChange}
                    onKeyPress={(e) => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>
              </div>

              <div className="col-md-3">
                <select 
                  className="form-select bg-white bg-opacity-10 border-0 text-white py-2" 
                  name="categoria" 
                  value={filtros.categoria} 
                  onChange={handleFiltroChange}
                >
                  <option value="" className="text-dark">Todos los módulos</option>
                  <option value="productos" className="text-dark">📦 Productos / Stock</option>
                  <option value="estetica" className="text-dark">✂️ Estética</option>
                  <option value="clientes" className="text-dark">👥 Clientes</option>
                  <option value="mascotas" className="text-dark">🐾 Mascotas</option>
                  <option value="caja" className="text-dark">💰 Caja / Dinero</option>
                  <option value="turnos" className="text-dark">📅 Turnos / Consultas</option>
                  <option value="historial" className="text-dark">🏥 Historial Clínico</option>
                  <option value="empleados" className="text-dark">👔 Gestión Empleados</option>
                </select>
              </div>

              <div className="col-md-2">
                <select className="form-select bg-white bg-opacity-10 border-0 text-white py-2" name="accion" value={filtros.accion} onChange={handleFiltroChange}>
                  <option value="" className="text-dark">Todas las acciones</option>
                  <option value="Creado" className="text-dark">Creado</option>
                  <option value="Editado" className="text-dark">Editado</option>
                  <option value="Eliminado" className="text-dark">Eliminado</option>
                  <option value="Finalizado" className="text-dark">Finalizado</option>
                </select>
              </div>

              <div className="col-md-3 d-flex gap-3 align-items-center">
                <div className="form-check form-switch mb-0">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    name="mostrarEliminados" 
                    checked={filtros.mostrarEliminados} 
                    onChange={handleFiltroChange} 
                  />
                  <label className="form-check-label text-white small fw-bold">Ver eliminados</label>
                </div>
                <button className="btn btn-outline-light border-0 btn-sm bg-white bg-opacity-10 px-3" onClick={limpiarFiltros}>
                  <FontAwesomeIcon icon={faTimes} className="me-1" /> Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla principal */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-5" style={{ 
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead className="bg-white bg-opacity-10">
                <tr className="border-bottom border-white border-opacity-10">
                  <th className="ps-4 py-4 text-info text-uppercase fw-bold small">Módulo</th>
                  <th className="py-4 text-info text-uppercase fw-bold small">Acción</th>
                  <th className="py-4 text-info text-uppercase fw-bold small">Elemento Afectado</th>
                  <th className="py-4 text-info text-uppercase fw-bold small">Mascota</th>
                  <th className="py-4 text-info text-uppercase fw-bold small">Responsable</th>
                  <th className="py-4 text-info text-uppercase fw-bold small">Fecha</th>
                  <th className="py-4 text-center text-info text-uppercase fw-bold small">Estado</th>
                </tr>
              </thead>
              <tbody className="bg-transparent">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-info"></div></td></tr>
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted">No se encontraron registros</td></tr>
                ) : (
                  movimientos.map((m, i) => (
                    <tr key={getId(m) || i} className={`border-bottom border-white border-opacity-10 transition-all ${m.eliminado == 1 ? 'opacity-50' : ''}`}>
                      <td className="ps-4">{renderModuloBadge(m.modulo)}</td>
                      <td>{renderAccion(m.accion, m.eliminado)}</td>
                      <td className="fw-bold text-white">{getElementoAfectado(m)}</td>
                      <td>
                        <span className="text-white opacity-90">
                          {getMascota(m) !== '-' ? <><FontAwesomeIcon icon={faPaw} className="me-1 text-warning" /> {getMascota(m)}</> : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="bg-info bg-opacity-20 text-info rounded-circle d-flex align-items-center justify-content-center me-2 border border-info border-opacity-25" style={{width: '28px', height: '28px'}}>
                            <FontAwesomeIcon icon={faUser} style={{fontSize: '12px'}} />
                          </div>
                          <span className="small fw-semibold">{m.responsable || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="small text-white opacity-75">
                          <FontAwesomeIcon icon={faCalendarAlt} className="me-2" />
                          {new Date(m.fecha).toLocaleString('es-AR', { 
                            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
                          })}
                        </div>
                      </td>
                      <td className="text-center">
                        {m.eliminado == 1 ? (
                          <span className="text-danger small fw-bold">INACTIVO</span>
                        ) : (
                          <span className="text-success small fw-bold">ACTIVO</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="card-footer bg-transparent d-flex justify-content-between align-items-center py-4 border-top border-white border-opacity-10">
            <small className="text-white opacity-75 fw-semibold">
              Mostrando <span className="text-info">{movimientos.length}</span> de <span className="text-info">{totalRegistros}</span> registros
            </small>
            <div className="btn-group shadow-lg">
              <button className="btn btn-dark border-secondary px-3" disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>
                Anterior
              </button>
              <button className="btn btn-info px-4 text-dark fw-bold">{pagina}</button>
              <button className="btn btn-dark border-secondary px-3" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estilos adicionales */}
      <style>{`
        .text-shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.5); }
        .transition-all:hover { background: rgba(255,255,255,0.05) !important; transform: scale(1.002); }
        .form-check-input:checked { background-color: #0dcaf0; border-color: #0dcaf0; }
        .btn-outline-danger:hover { background-color: rgba(220, 53, 69, 0.2); }
        .btn-outline-success:hover { background-color: rgba(25, 135, 84, 0.2); }
        .bg-purple { background-color: #6f42c1 !important; }
      `}</style>

      {/* Modal Editar */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-secondary shadow-2xl">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-info fw-bold">Editar Registro</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <label className="text-info small mb-2">Descripción del Elemento</label>
                <input className="form-control mb-3 bg-black border-secondary text-white py-2" placeholder="Nombre..." name="producto" value={editForm.producto} onChange={(e) => setEditForm({...editForm, producto: e.target.value})} />
                
                <label className="text-info small mb-2">Módulo Destino</label>
                <select className="form-select bg-black border-secondary text-white py-2" name="categoria" value={editForm.categoria} onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}>
                  <option value="alimentos">🍎 Alimentos</option>
                  <option value="medicamentos">💊 Medicamentos</option>
                  <option value="petshop">🐾 Petshop</option>
                  <option value="estetica">✂️ Estética</option>
                </select>
              </div>
              <div className="modal-footer border-secondary">
                <button className="btn btn-link text-white text-decoration-none" onClick={() => setShowEditModal(false)}>Cerrar</button>
                <button className="btn btn-info px-4 fw-bold" onClick={guardarEdicion}>Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-0 shadow-2xl">
              <div className="modal-body text-center p-5">
                <div className="bg-warning bg-opacity-10 p-4 rounded-circle d-inline-block mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning" size="3x" />
                </div>
                <h4 className="text-white fw-bold">¿Confirmar eliminación?</h4>
                <p className="text-muted">Esta acción marcará el registro como eliminado en el historial.</p>
                <div className="bg-black bg-opacity-50 p-3 rounded-3 mb-4">
                    <span className="text-info fw-bold">{selectedMovement?.producto || selectedMovement?.servicio}</span>
                </div>
                <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-outline-light px-4 rounded-pill" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                    <button className="btn btn-warning text-dark px-4 rounded-pill fw-bold" onClick={confirmarBorrar}>Eliminar Registro</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaPage;