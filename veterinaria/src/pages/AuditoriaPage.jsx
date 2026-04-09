import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory, faUser, faCalendarAlt, faSyncAlt,
  faPlusCircle, faEdit, faTrashAlt, faSearch,
  faSort, faFilePdf, faFileExcel,
  faTimes, faExclamationTriangle, faCheckCircle,
  faInfoCircle, faUndo, faPaw, faWallet, faUsers, 
  faScissors, faBox, faHeartbeat, faUserTie, faTrash,
  faTrashRestore
} from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AuditoriaPage = ({ user }) => {
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

  // Papelera
  const [showPapeleraModal, setShowPapeleraModal] = useState(false);
  const [papeleraItems, setPapeleraItems] = useState([]);
  const [loadingPapelera, setLoadingPapelera] = useState(false);
  const [paginaPapelera, setPaginaPapelera] = useState(1);
  const itemsPorPaginaPapelera = 10;

  // Estado para confirmación de borrado permanente
  const [showBorrarPermanenteModal, setShowBorrarPermanenteModal] = useState(false);
  const [itemBorrarPermanente, setItemBorrarPermanente] = useState(null);

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
        modulo: filtros.categoria || undefined,
        accion: filtros.accion || undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        orden: orden.campo,
        direccion: orden.direccion,
        mostrarEliminados: filtros.mostrarEliminados ? 'true' : 'false'
      };

      const res = await api.get('/auditoria/historial', { params });
      
      // SE ELIMINÓ EL FILTRO ESPECÍFICO PARA QUE APAREZCAN TODOS LOS MOVIMIENTOS
      setMovimientos(res.data.datos || []);
      setTotalRegistros(res.data.total || 0);
    } catch (err) {
      console.error("❌ Error en cargarHistorial:", err.response?.data || err);
      toast.error('Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  }, [pagina, limite, orden, filtros]);

  const cargarPapelera = async () => {
    setLoadingPapelera(true);
    try {
      const res = await api.get('/auditoria/papelera');
      setPapeleraItems(res.data || []);
      setPaginaPapelera(1);
    } catch (err) {
      console.error("Error al cargar papelera:", err);
      toast.error('No se pudo cargar la papelera');
    } finally {
      setLoadingPapelera(false);
    }
  };

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

  const handleRestaurar = async (m) => {
    const id = getId(m);
    try {
      await api.patch(`/auditoria/${id}`, { eliminado: false });
      toast.success('Registro restaurado correctamente 🔄');
      cargarHistorial();
      if (showPapeleraModal) cargarPapelera();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo restaurar el registro');
    }
  };

  const handleBorrarPermanenteClick = (item) => {
    setItemBorrarPermanente(item);
    setShowBorrarPermanenteModal(true);
  };

  const confirmarBorrarPermanente = async () => {
    if (!itemBorrarPermanente) return;
    const id = getId(itemBorrarPermanente);
    try {
      await api.delete(`/auditoria/${id}`);
      toast.success('Registro eliminado permanentemente 🗑️');
      setShowBorrarPermanenteModal(false);
      setItemBorrarPermanente(null);
      cargarHistorial();
      cargarPapelera();
    } catch (error) {
      console.error("❌ Error en borrado permanente:", error);
      toast.error('No se pudo eliminar permanentemente');
    }
  };

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
        usuario_eliminacion: user?.nombre || 'admin'
      });
      toast.success('Registro enviado a la papelera 🗑️');
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
        usuario_modificacion: user?.nombre || 'admin',
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
    setPagina(1);
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
        new Date(m.fecha).toLocaleString('es-AR'), 
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
      Restaurado: 'bg-info text-dark',
      Finalizado: 'bg-info text-dark',
      'Borrado Permanente': 'bg-dark text-white'
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
    return m.producto || m.servicio || m.nombre || '-';
  };

  const getMascota = (m) => {
    return m.mascota || '-';
  };

  const totalPaginas = Math.ceil(totalRegistros / limite);

  const papeleraPaginada = papeleraItems.slice(
    (paginaPapelera - 1) * itemsPorPaginaPapelera,
    paginaPapelera * itemsPorPaginaPapelera
  );
  const totalPaginasPapelera = Math.ceil(papeleraItems.length / itemsPorPaginaPapelera);

  return (
    <div className="min-vh-100 p-4 p-md-5 position-relative" style={{ 
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.2)', zIndex: 0 }} />

      <div className="container-fluid position-relative" style={{ zIndex: 1 }}>
        <ToastContainer position="top-right" theme="dark" />

        {/* Encabezado */}
        <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
          <div className="d-flex align-items-center">
            <div className="bg-info bg-opacity-25 p-3 rounded-circle me-3 border border-info border-opacity-50">
                <FontAwesomeIcon icon={faHistory} className="text-info fs-3" />
            </div>
            <div>
                <h1 className="fw-bold mb-0 text-white" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>Auditoría General</h1>
                <p className="text-info mb-0 fw-bold small">Monitoreo de actividad en tiempo real</p>
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button className="btn btn-danger rounded-pill px-4 shadow d-flex align-items-center" onClick={exportarPDF}>
              <FontAwesomeIcon icon={faFilePdf} className="me-2" /> PDF
            </button>
            <button className="btn btn-success rounded-pill px-4 shadow d-flex align-items-center" onClick={exportarExcel}>
              <FontAwesomeIcon icon={faFileExcel} className="me-2" /> EXCEL
            </button>
            <button 
              className="btn btn-warning rounded-pill px-4 shadow d-flex align-items-center text-dark fw-bold"
              onClick={() => { setShowPapeleraModal(true); cargarPapelera(); }}
            >
              <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera
            </button>
            <button className="btn btn-info rounded-pill px-4 shadow fw-bold text-dark" onClick={() => cargarHistorial()} disabled={loading}>
              <FontAwesomeIcon icon={faSyncAlt} className={loading ? 'fa-spin me-2' : 'me-2'} /> Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="card border-0 shadow-lg rounded-4 mb-4" style={{ 
          background: 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <div className="card-body p-4">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <div className="input-group rounded-pill overflow-hidden border shadow-sm">
                  <span className="input-group-text bg-white border-0 ps-4 text-muted">
                    <FontAwesomeIcon icon={faSearch} />
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-0 py-2" 
                    placeholder="Buscar registro..." 
                    name="buscar" 
                    value={filtros.buscar} 
                    onChange={handleFiltroChange}
                    onKeyPress={(e) => e.key === 'Enter' && aplicarFiltros()}
                  />
                </div>
              </div>

              <div className="col-md-3">
                <select className="form-select rounded-pill border shadow-sm" name="categoria" value={filtros.categoria} onChange={handleFiltroChange}>
                  <option value="">Todos los módulos</option>
                  <option value="productos">📦 Productos</option>
                  <option value="clientes">👥 Clientes</option>
                  <option value="mascotas">🐾 Mascotas</option>
                  <option value="caja">💰 Caja</option>
                  <option value="turnos">📅 Turnos</option>
                  <option value="historial">🏥 Historial</option>
                  <option value="empleados">👔 Empleados</option>
                </select>
              </div>

              <div className="col-md-2">
                <select className="form-select rounded-pill border shadow-sm" name="accion" value={filtros.accion} onChange={handleFiltroChange}>
                  <option value="">Acciones</option>
                  <option value="Creado">Creado</option>
                  <option value="Editado">Editado</option>
                  <option value="Eliminado">Eliminado</option>
                  <option value="Restaurado">Restaurado</option>
                </select>
              </div>

              <div className="col-md-3 d-flex gap-2 align-items-center justify-content-end">
                <div className="form-check form-switch mb-0 me-2">
                  <input className="form-check-input" type="checkbox" name="mostrarEliminados" id="switchEliminados" checked={filtros.mostrarEliminados} onChange={handleFiltroChange} />
                  <label className="form-check-label text-dark small fw-bold" htmlFor="switchEliminados">Papelera</label>
                </div>
                <button className="btn btn-outline-secondary rounded-pill btn-sm px-3" onClick={limpiarFiltros}>Limpiar</button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla Principal */}
        <div className="rounded-4 shadow-lg overflow-hidden" style={{ 
          background: 'rgba(255, 255, 255, 0.75)', 
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.4)'
        }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="text-secondary border-bottom border-white" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>
                <tr>
                  <th className="ps-4 py-4 fw-bold">MÓDULO</th>
                  <th className="fw-bold">ACCIÓN</th>
                  <th className="fw-bold">ELEMENTO AFECTADO</th>
                  <th className="fw-bold">MASCOTA</th>
                  <th className="fw-bold">RESPONSABLE</th>
                  <th className="fw-bold">FECHA</th>
                  <th className="text-center pe-4 fw-bold">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="border-0">
                {loading ? (
                  <tr><td colSpan="7" className="text-center py-5"><div className="spinner-border text-primary"></div></td></tr>
                ) : movimientos.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-5 text-muted fw-bold">No se encontraron registros</td></tr>
                ) : (
                  movimientos.map((m, i) => (
                    <tr key={getId(m) || i} className={`border-bottom border-white border-opacity-50 ${m.eliminado == 1 ? 'opacity-50' : ''}`}>
                      <td className="ps-4">{renderModuloBadge(m.modulo)}</td>
                      <td>{renderAccion(m.accion, m.eliminado)}</td>
                      <td className="fw-bold text-dark">{getElementoAfectado(m)}</td>
                      <td className="fw-bold">
                        {getMascota(m) !== '-' ? (
                          <>
                            <FontAwesomeIcon icon={faPaw} className="me-1 text-primary opacity-50" /> 
                            {getMascota(m)}
                          </>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="badge bg-white text-dark border shadow-sm px-3 py-2 rounded-pill">
                            <FontAwesomeIcon icon={faUser} className="me-2 text-muted" />{m.responsable || '-'}
                        </span>
                      </td>
                      <td className="small text-muted fw-bold">
                        <FontAwesomeIcon icon={faCalendarAlt} className="me-1 opacity-50" />
                        {new Date(m.fecha).toLocaleString('es-AR', { 
                          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td className="text-center pe-4">
                        <div className="d-flex justify-content-center gap-2">
                          {m.eliminado == 1 ? (
                            <button className="btn btn-success btn-sm rounded-pill px-3 shadow-sm fw-bold" onClick={() => handleRestaurar(m)}>
                              <FontAwesomeIcon icon={faUndo} className="me-1" /> Restaurar
                            </button>
                          ) : (
                            <>
                              <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm" style={{width: '32px', height: '32px'}} onClick={() => handleEditar(m)}>
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button className="btn btn-outline-danger btn-sm rounded-circle shadow-sm" style={{width: '32px', height: '32px'}} onClick={() => handleBorrarClick(m)}>
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-center py-4 gap-3 bg-white bg-opacity-20 border-top border-white">
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-4 bg-white shadow-sm fw-bold" 
                    disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>← Anterior</button>
            <div className="px-5 py-2 bg-white bg-opacity-50 rounded-pill fw-bold text-dark border shadow-sm">
              Página {pagina} de {totalPaginas || 1}
            </div>
            <button className="btn btn-sm btn-outline-secondary rounded-pill px-4 bg-white shadow-sm fw-bold" 
                    disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>Siguiente →</button>
          </div>
        </div>
      </div>

      {/* Modal Papelera */}
      {showPapeleraModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 3000 }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content rounded-4 shadow border-0 overflow-hidden">
              <div className="modal-header bg-danger text-white rounded-top-4 border-0 py-3">
                <h4 className="modal-title fw-bold mb-0">
                  <FontAwesomeIcon icon={faTrash} className="me-2" /> PAPELERA DE AUDITORÍA
                </h4>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPapeleraModal(false)}></button>
              </div>

              <div className="modal-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Nombre / Elemento</th>
                        <th>Módulo</th>
                        <th>Borrado por</th>
                        <th>Fecha</th>
                        <th className="text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPapelera ? (
                        <tr><td colSpan="5" className="text-center py-5"><div className="spinner-border text-danger"></div></td></tr>
                      ) : papeleraItems.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-5 text-muted fw-bold">No hay registros en la papelera</td></tr>
                      ) : (
                        papeleraPaginada.map((item, index) => (
                          <tr key={getId(item) || index}>
                            <td className="ps-4 fw-bold">{getElementoAfectado(item)}</td>
                            <td>{renderModuloBadge(item.modulo)}</td>
                            <td><span className="badge bg-secondary">{item.responsable_borrado || item.responsable || 'Sistema'}</span></td>
                            <td className="small text-muted">
                              {new Date(item.fecha_formateada || item.fecha).toLocaleString('es-AR')}
                            </td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center gap-2">
                                <button className="btn btn-success rounded-circle shadow-sm p-2" onClick={() => handleRestaurar(item)}>
                                  <FontAwesomeIcon icon={faTrashRestore} />
                                </button>
                                <button className="btn btn-danger rounded-circle shadow-sm p-2" onClick={() => handleBorrarPermanenteClick(item)}>
                                  <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light">
                <button className="btn btn-dark rounded-pill px-5 py-2 fw-bold" onClick={() => setShowPapeleraModal(false)}>CERRAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para borrado permanente */}
      {showBorrarPermanenteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 3100 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-body text-center p-5">
                <div className="bg-danger bg-opacity-10 p-4 rounded-circle d-inline-block mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-danger" size="3x" />
                </div>
                <h4 className="fw-bold text-danger">¿Eliminar permanentemente?</h4>
                <p className="text-muted">
                  Esta acción <strong>NO se puede deshacer</strong>. El registro se borrará definitivamente de la base de datos.
                </p>
                <div className="bg-light p-3 rounded-3 mb-4 fw-bold text-dark">
                  {itemBorrarPermanente?.producto || itemBorrarPermanente?.servicio || 'Registro seleccionado'}
                </div>
                <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-outline-secondary px-4 rounded-pill" 
                      onClick={() => {
                        setShowBorrarPermanenteModal(false);
                        setItemBorrarPermanente(null);
                      }}
                    >
                      Cancelar
                    </button>
                    <button className="btn btn-danger px-4 rounded-pill fw-bold" onClick={confirmarBorrarPermanente}>
                      <FontAwesomeIcon icon={faTrash} className="me-2" /> Eliminar para siempre
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .bg-purple { background-color: #6f42c1 !important; }
        tr:hover { background-color: rgba(255,255,255,0.3) !important; transition: 0.2s; }
      `}</style>

      {/* Modal Editar */}
      {showEditModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-primary text-white rounded-top-4">
                <h5 className="modal-title fw-bold">Editar Registro</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <label className="fw-bold mb-2">Descripción del Elemento</label>
                <input className="form-control mb-3 rounded-3" placeholder="Nombre..." value={editForm.producto} onChange={(e) => setEditForm({...editForm, producto: e.target.value})} />
                <label className="fw-bold mb-2">Módulo</label>
                <select className="form-select rounded-3" value={editForm.categoria} onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}>
                  <option value="productos">📦 Productos</option>
                  <option value="clientes">👥 Clientes</option>
                  <option value="mascotas">🐾 Mascotas</option>
                  <option value="caja">💰 Caja</option>
                  <option value="turnos">📅 Turnos</option>
                  <option value="historial">🏥 Historial</option>
                </select>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-light rounded-pill px-4" onClick={() => setShowEditModal(false)}>Cerrar</button>
                <button className="btn btn-primary rounded-pill px-4 fw-bold" onClick={guardarEdicion}>Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-body text-center p-5">
                <div className="bg-warning bg-opacity-10 p-4 rounded-circle d-inline-block mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning" size="3x" />
                </div>
                <h4 className="fw-bold">¿Mover a la papelera?</h4>
                <p className="text-muted">Podrás restaurar este registro más tarde desde la papelera de auditoría.</p>
                <div className="bg-light p-3 rounded-3 mb-4 fw-bold">{selectedMovement?.producto || selectedMovement?.servicio || 'Registro seleccionado'}</div>
                <div className="d-flex gap-2 justify-content-center">
                    <button className="btn btn-outline-secondary px-4 rounded-pill" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                    <button className="btn btn-warning text-dark px-4 rounded-pill fw-bold" onClick={confirmarBorrar}>Eliminar</button>
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