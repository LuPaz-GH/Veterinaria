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
  faEnvelopeOpenText
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';

const GestionEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [empleadoEdit, setEmpleadoEdit] = useState(null);
  const [form, setForm] = useState({ nombre: '', usuario: '', password: '', rol: 'recepcionista' });

  // Estados para confirmación de eliminación
  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  // NUEVOS Estados para confirmación de "Atender Solicitud"
  const [showConfirmAtender, setShowConfirmAtender] = useState(false);
  const [idToMark, setIdToMark] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Estados para solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [showSolicitudes, setShowSolicitudes] = useState(false);

  useEffect(() => {
    fetchEmpleados();
    fetchSolicitudes();
  }, []);

  useEffect(() => {
    if (showSolicitudes) {
      fetchSolicitudes();
    }
  }, [showSolicitudes]);

  const fetchEmpleados = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/empleados');
      if (!res.ok) throw new Error('Error al cargar empleados');
      const data = await res.json();
      setEmpleados(data);
    } catch (err) {
      setError('No se pudieron cargar los empleados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSolicitudes = async () => {
    setLoadingSolicitudes(true);
    try {
      const res = await fetch('http://localhost:3001/api/recuperacion');
      if (!res.ok) {
        throw new Error('Error al cargar solicitudes - Status: ' + res.status);
      }
      const data = await res.json();
      setSolicitudes(data);
    } catch (err) {
      console.error('Error completo al cargar solicitudes:', err);
      setSolicitudes([]);
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  // Función para abrir el modal de confirmación de atención
  const prepararAtender = (id) => {
    setIdToMark(id);
    setShowConfirmAtender(true);
  };

  // Función que realmente hace el PUT al backend
  const confirmarAtendida = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/recuperacion/${idToMark}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'atendida' })
      });

      if (!res.ok) throw new Error('No se pudo actualizar');

      setShowConfirmAtender(false);
      setSuccessMessage('Solicitud marcada como atendida correctamente.');
      setShowSuccessModal(true);
      fetchSolicitudes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const resetPassword = (id, nombre) => {
    const nuevaClave = prompt(`Nueva contraseña temporal para ${nombre}:`);
    if (!nuevaClave || nuevaClave.trim() === '') return;

    fetch(`http://localhost:3001/api/empleados/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: nuevaClave })
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al resetear contraseña');
        setSuccessMessage(`Contraseña de ${nombre} reseteada a "${nuevaClave}".`);
        setShowSuccessModal(true);
        fetchEmpleados();
      })
      .catch(err => console.error(err));
  };

  const empleadosFiltrados = empleados.filter((emp) => {
    const termino = busqueda.toLowerCase();
    return (
      emp.nombre.toLowerCase().includes(termino) ||
      emp.usuario.toLowerCase().includes(termino) ||
      emp.rol.toLowerCase().includes(termino)
    );
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirModalNuevo = () => {
    setEmpleadoEdit(null);
    setForm({ nombre: '', usuario: '', password: '', rol: 'recepcionista' });
    setShowModal(true);
  };

  const abrirModalEditar = (emp) => {
    setEmpleadoEdit(emp);
    setForm({ nombre: emp.nombre, usuario: emp.usuario, password: '', rol: emp.rol });
    setShowModal(true);
  };

  const guardarEmpleado = async (e) => {
    e.preventDefault();
    try {
      const url = empleadoEdit 
        ? `http://localhost:3001/api/empleados/${empleadoEdit.id}` 
        : 'http://localhost:3001/api/empleados';
      const res = await fetch(url, {
        method: empleadoEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Error al guardar');
      await fetchEmpleados();
      setShowModal(false);
      setSuccessMessage(empleadoEdit ? 'Empleado actualizado' : 'Empleado creado');
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminar = (id) => {
    setIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmarEliminar = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/empleados/${idToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo eliminar');
      await fetchEmpleados();
      setShowConfirm(false);
      setSuccessMessage('Empleado eliminado con éxito');
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const getRolBadge = (rol) => {
    const colors = { admin: 'bg-dark', veterinario: 'bg-primary', recepcionista: 'bg-success', peluquero: 'bg-info' };
    return <span className={`badge ${colors[rol] || 'bg-secondary'} px-3 py-2 text-capitalize`}>{rol}</span>;
  };

  if (loading) return <div className="text-center py-5 fw-bold">Cargando empleados...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

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

        <div className="row mb-4">
            <div className="col-md-4">
              <button className="btn btn-primary shadow-sm rounded-pill px-4 fw-bold" onClick={abrirModalNuevo}>
                <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Nuevo Empleado
              </button>
            </div>
            <div className="col-md-5 ms-auto">
              <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white">
                <span className="input-group-text bg-white border-0 ps-3"><FontAwesomeIcon icon={faSearch} className="text-muted" /></span>
                <input type="text" className="form-control border-0 py-2" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </div>
            </div>
        </div>

        <div className="mb-5">
          <button className="btn btn-info shadow-lg rounded-pill px-5 py-3 fw-bold text-white" onClick={() => setShowSolicitudes(!showSolicitudes)}>
            <FontAwesomeIcon icon={faEnvelopeOpenText} size="lg" className="me-2" />
            Solicitudes de recuperación ({solicitudes.filter(s => s.estado === 'pendiente').length} pendientes)
          </button>
        </div>

        {/* TABLA EMPLEADOS */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden mb-5">
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
              {empleadosFiltrados.map(emp => (
                <tr key={emp.id} className="align-middle">
                  <td className="ps-4 fw-medium">{emp.nombre}</td>
                  <td>{emp.usuario}</td>
                  <td>{getRolBadge(emp.rol)}</td>
                  <td className="text-end pe-4">
                    <button className="btn btn-sm btn-outline-warning me-2 rounded-circle" onClick={() => resetPassword(emp.id, emp.nombre)} style={{width:'35px', height:'35px', backgroundColor:'white'}}><FontAwesomeIcon icon={faKey}/></button>
                    <button className="btn btn-sm btn-outline-warning me-2 rounded-circle" onClick={() => abrirModalEditar(emp)} style={{width:'35px', height:'35px', backgroundColor:'white'}}><FontAwesomeIcon icon={faPencilAlt}/></button>
                    <button className="btn btn-sm btn-outline-danger rounded-circle" onClick={() => eliminar(emp.id)} style={{width:'35px', height:'35px', backgroundColor:'white'}}><FontAwesomeIcon icon={faTrash}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TABLA SOLICITUDES */}
        {showSolicitudes && (
          <div className="mt-5 pb-5">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="card-header bg-info text-white py-3"><h5 className="mb-0 fw-bold">Solicitudes de Recuperación</h5></div>
              <div className="card-body p-0">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Nombre</th>
                      <th>Email</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th className="text-end pe-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudes.map(sol => (
                      <tr key={sol.id} className="align-middle">
                        <td className="ps-4">{sol.nombre}</td>
                        <td>{sol.email || '-'}</td>
                        <td>{new Date(sol.fecha).toLocaleString('es-AR')}</td>
                        <td><span className={`badge ${sol.estado === 'pendiente' ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2`}>{sol.estado}</span></td>
                        <td className="text-end pe-4">
                          {sol.estado === 'pendiente' && (
                            <button className="btn btn-sm btn-success shadow-sm rounded-pill px-3" onClick={() => prepararAtender(sol.id)}>
                              <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Atendida
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL REGISTRO/EDICION */}
      {showModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow rounded-4">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">{empleadoEdit ? '📝 Editar Empleado' : '👤 Nuevo Empleado'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={guardarEmpleado} className="modal-body p-4">
                <div className="mb-3"><label className="form-label fw-bold small">Nombre</label><input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required /></div>
                <div className="mb-3"><label className="form-label fw-bold small">Usuario</label><input type="text" className="form-control" name="usuario" value={form.usuario} onChange={handleChange} required /></div>
                <div className="mb-3"><label className="form-label fw-bold small">Password</label><input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} required={!empleadoEdit} /></div>
                <div className="mb-4">
                  <label className="form-label fw-bold small">Rol</label>
                  <select className="form-select" name="rol" value={form.rol} onChange={handleChange}>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="veterinario">Veterinario</option>
                    <option value="peluquero">Peluquero</option>
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
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2000 }}>
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
        onConfirm={confirmarEliminar}
        title="Eliminar Empleado"
        message="¿Estás seguro de que deseas eliminar a este empleado? Esta acción no se puede deshacer."
      />

      {/* MODAL CONFIRMAR ATENDER (Aquí está la mejora que pediste) */}
      <ConfirmModal 
        show={showConfirmAtender}
        onClose={() => setShowConfirmAtender(false)}
        onConfirm={confirmarAtendida}
        title="Marcar como Atendida"
        message="¿Confirmas que ya has gestionado esta solicitud de recuperación? Se marcará como completada en el sistema."
      />
    </div>
  );
};

export default GestionEmpleados;