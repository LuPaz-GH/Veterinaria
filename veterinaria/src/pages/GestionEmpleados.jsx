import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faPlus,
  faEdit,
  faTrash,
  faFilePdf,
  faFileExcel,
  faSearch,
  faUserPlus,
  faPencilAlt,
  faCheckCircle,
  faKey,
  faTrashRestore,
  faTimes,
  faChevronLeft,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';

const GestionEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [empleadoEdit, setEmpleadoEdit] = useState(null);
  const [form, setForm] = useState({ nombre: '', usuario: '', email: '', password: '', rol: 'recepcionista' });

  // Estados para papelera
  const [showPapelera, setShowPapelera] = useState(false);
  const [empleadosEliminados, setEmpleadosEliminados] = useState([]);

  // Estados para confirmación
  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ✅ ESTADOS PARA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);
  const [empleadosPorPagina] = useState(5); // Mostramos 5 empleados por página

  useEffect(() => {
    fetchEmpleados();
    fetchEliminados();
  }, []);

  const fetchEmpleados = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/empleados');
      if (!res.ok) throw new Error('Error al cargar empleados');
      const data = await res.json();
      setEmpleados(data.filter(emp => emp.activo === 1));
      setPaginaActual(1); // Resetear a primera página al recargar
    } catch (err) {
      setError('No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
    }
  };

  const fetchEliminados = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/empleados/papelera');
      if (!res.ok) throw new Error('Error al cargar papelera');
      const data = await res.json();
      setEmpleadosEliminados(data);
    } catch (err) {
      console.error("Error cargando papelera", err);
    }
  };

  const resetPassword = (id, nombre) => {
    const nuevaClave = prompt(`Nueva contraseña temporal para ${nombre}:`);
    if (!nuevaClave || nuevaClave.trim() === '') return;
    const token = localStorage.getItem('token');
    fetch(`http://localhost:3001/api/empleados/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ password: nuevaClave })
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al resetear');
        setSuccessMessage(`Contraseña de ${nombre} reseteada.`);
        setShowSuccessModal(true);
        fetchEmpleados();
      })
      .catch(err => alert(err.message));
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = empleadoEdit 
        ? `http://localhost:3001/api/empleados/${empleadoEdit.id}` 
        : 'http://localhost:3001/api/empleados';
      const res = await fetch(url, {
        method: empleadoEdit ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, activo: 1 })
      });
      if (!res.ok) throw new Error('Error al guardar');
      fetchEmpleados();
      setShowModal(false);
      setSuccessMessage(empleadoEdit ? 'Empleado actualizado' : 'Empleado creado');
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarLogico = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/empleados/${idToDelete}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ activo: 0 })
      });
      if (!res.ok) throw new Error('Error al mover a papelera');
      fetchEmpleados();
      fetchEliminados();
      setShowConfirm(false);
      setSuccessMessage('Empleado movido a la papelera');
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const restaurarEmpleado = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/empleados/restaurar/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      fetchEmpleados();
      fetchEliminados();
      setSuccessMessage('Empleado restaurado con éxito');
      setShowSuccessModal(true);
    } catch (err) {
      alert("Error al restaurar");
    }
  };

  const eliminarPermanente = async (id) => {
    if (!window.confirm("¿Eliminar permanentemente? Esta acción no tiene vuelta atrás.")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/empleados/permanente/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchEliminados();
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const getRolBadge = (rol) => {
    const colors = { admin: 'bg-dark', veterinario: 'bg-primary', recepcionista: 'bg-success' };
    return <span className={`badge ${colors[rol] || 'bg-secondary'} px-3 py-2 text-capitalize`}>{rol}</span>;
  };

  // ✅ LÓGICA DE FILTRADO
  const empleadosFiltrados = empleados.filter(emp => 
    emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    emp.rol.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ✅ LÓGICA DE PAGINACIÓN
  const indiceUltimoEmpleado = paginaActual * empleadosPorPagina;
  const indicePrimerEmpleado = indiceUltimoEmpleado - empleadosPorPagina;
  const empleadosPaginaActual = empleadosFiltrados.slice(indicePrimerEmpleado, indiceUltimoEmpleado);
  const totalPaginas = Math.ceil(empleadosFiltrados.length / empleadosPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  // Resetear a página 1 cuando cambia la búsqueda
  React.useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  if (loading) return <div className="text-center py-5 fw-bold text-white">Cargando...</div>;

  return (
    <div className="min-vh-100 p-5 position-relative" style={{ 
        backgroundImage: `url('https://i.pinimg.com/736x/24/74/75/2474750b4d6ca9ce1b27d9f54769db69.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.2)', zIndex: 0 }} />

      <div className="position-relative" style={{ zIndex: 1 }}>
        <h1 className="fw-bold text-white mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
          <FontAwesomeIcon icon={faUsers} className="me-2" /> Gestión de Empleados
        </h1>

        <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <button className="btn btn-primary shadow-sm rounded-pill px-4 fw-bold me-3" onClick={() => { setEmpleadoEdit(null); setForm({nombre:'', usuario:'', email:'', password:'', rol:'recepcionista'}); setShowModal(true); }}>
                <FontAwesomeIcon icon={faUserPlus} className="me-2" /> + Nuevo
              </button>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-danger rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowPapelera(true)}>
                <FontAwesomeIcon icon={faTrash} className="me-2" /> Papelera
              </button>
              
              <button className="btn btn-danger rounded-circle shadow-sm" style={{width:'45px', height:'45px'}}><FontAwesomeIcon icon={faFilePdf}/></button>
              <button className="btn btn-success rounded-circle shadow-sm" style={{width:'45px', height:'45px'}}><FontAwesomeIcon icon={faFileExcel}/></button>
              
              <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white ms-2" style={{width: '300px'}}>
                <span className="input-group-text bg-white border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                <input type="text" className="form-control border-0 py-2" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-4">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4 py-3">Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th className="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleadosPaginaActual.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted">
                    {empleadosFiltrados.length === 0 ? 'No se encontraron empleados' : 'No hay empleados en esta página'}
                  </td>
                </tr>
              ) : (
                empleadosPaginaActual.map(emp => (
                  <tr key={emp.id} className="align-middle">
                    <td className="ps-4 fw-medium">{emp.nombre}</td>
                    <td>{emp.usuario}</td>
                    <td>{getRolBadge(emp.rol)}</td>
                    <td className="text-end pe-4">
                      <button className="btn btn-sm btn-outline-warning me-2 rounded-circle" onClick={() => resetPassword(emp.id, emp.nombre)} style={{width:'35px', height:'35px', backgroundColor: 'white'}}><FontAwesomeIcon icon={faKey}/></button>
                      <button className="btn btn-sm btn-outline-primary me-2 rounded-circle" onClick={() => { setEmpleadoEdit(emp); setForm({nombre:emp.nombre, usuario:emp.usuario, email: emp.email || '', password:'', rol:emp.rol}); setShowModal(true); }} style={{width:'35px', height:'35px', backgroundColor: 'white'}}><FontAwesomeIcon icon={faPencilAlt}/></button>
                      <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => { setIdToDelete(emp.id); setShowConfirm(true); }} style={{width:'35px', height:'35px', backgroundColor: 'white'}}><FontAwesomeIcon icon={faTrash}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ CONTROLES DE PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div className="text-white">
              <small>
                Mostrando {empleadosPaginaActual.length} de {empleadosFiltrados.length} empleados
                {busqueda && ` (filtrados de ${empleados.length} totales)`}
              </small>
            </div>
            
            <nav aria-label="Paginación de empleados">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                  <button className="page-link rounded-start-pill" onClick={paginaAnterior} disabled={paginaActual === 1}>
                    <FontAwesomeIcon icon={faChevronLeft} size="xs" /> Anterior
                  </button>
                </li>
                
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((numero) => (
                  <li key={numero} className={`page-item ${paginaActual === numero ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cambiarPagina(numero)}>
                      {numero}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                  <button className="page-link rounded-end-pill" onClick={paginaSiguiente} disabled={paginaActual === totalPaginas}>
                    Siguiente <FontAwesomeIcon icon={faChevronRight} size="xs" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* MODAL PAPELERA */}
      {showPapelera && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 2100 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-5 overflow-hidden">
              <div className="modal-header text-white px-4 py-3" style={{ backgroundColor: '#dc3545' }}>
                <h5 className="modal-title fw-bold">
                  <FontAwesomeIcon icon={faTrashRestore} className="me-2" /> Papelera de Empleados
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPapelera(false)}></button>
              </div>
              <div className="modal-body p-4">
                <table className="table align-middle">
                  <thead>
                    <tr className="text-muted small text-uppercase">
                      <th>Nombre</th>
                      <th>Rol</th>
                      <th className="text-end">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleadosEliminados.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-4 text-muted">No hay empleados en la papelera</td></tr>
                    ) : (
                      empleadosEliminados.map(emp => (
                        <tr key={emp.id}>
                          <td className="fw-bold">{emp.nombre}</td>
                          <td>{getRolBadge(emp.rol)}</td>
                          <td className="text-end">
                            <button className="btn btn-success rounded-circle me-2" title="Restaurar" onClick={() => restaurarEmpleado(emp.id)} style={{width:'35px', height:'35px'}}>
                              <FontAwesomeIcon icon={faTrashRestore} size="sm" />
                            </button>
                            <button className="btn btn-outline-danger rounded-circle" title="Eliminar Permanente" onClick={() => eliminarPermanente(emp.id)} style={{width:'35px', height:'35px'}}>
                              <FontAwesomeIcon icon={faTimes} size="sm" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer border-0 p-3">
                <button className="btn btn-dark px-4 rounded-pill fw-bold" onClick={() => setShowPapelera(false)}>CERRAR</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO/EDICION */}
      {showModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{empleadoEdit ? '📝 Editar Empleado' : '👤 Nuevo Empleado'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={guardarEmpleado} className="modal-body p-4">
                <div className="mb-3"><label className="form-label fw-bold">Nombre</label><input type="text" className="form-control" value={form.nombre} onChange={(e)=>setForm({...form, nombre: e.target.value})} required /></div>
                <div className="mb-3"><label className="form-label fw-bold">Usuario</label><input type="text" className="form-control" value={form.usuario} onChange={(e)=>setForm({...form, usuario: e.target.value})} required /></div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Email <span className="text-danger">*</span></label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={form.email} 
                    onChange={(e)=>setForm({...form, email: e.target.value})} 
                    required 
                    placeholder="empleado@ejemplo.com"
                  />
                  <div className="form-text">Se usará para recuperación de contraseña</div>
                </div>
                <div className="mb-3"><label className="form-label fw-bold">Password</label><input type="password" className="form-control" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} required={!empleadoEdit} /></div>
                <div className="mb-4">
                  <label className="form-label fw-bold">Rol</label>
                  <select className="form-select" value={form.rol} onChange={(e)=>setForm({...form, rol: e.target.value})}>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="veterinario">Veterinario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-100 py-2 fw-bold rounded-pill">GUARDAR</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ÉXITO */}
      {showSuccessModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 3000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 text-center p-4">
              <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
              <h4 className="fw-bold text-success">¡Éxito!</h4>
              <p className="text-muted">{successMessage}</p>
              <button className="btn btn-success px-5 py-2 rounded-pill fw-bold" onClick={() => setShowSuccessModal(false)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR */}
      <ConfirmModal 
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={eliminarLogico}
        title="Mover a Papelera"
        message="¿Estás seguro de que deseas mover a este empleado a la papelera?"
      />
    </div>
  );
};

export default GestionEmpleados;