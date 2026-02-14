import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserPlus, 
  faUsers, 
  faTrash, 
  faPencilAlt, 
  faCheckCircle, 
  faSearch 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';

const GestionEmpleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState(''); // Nuevo estado para el buscador

  const [showModal, setShowModal] = useState(false);
  const [empleadoEdit, setEmpleadoEdit] = useState(null);
  const [form, setForm] = useState({ nombre: '', usuario: '', password: '', rol: 'recepcionista' });

  const [showConfirm, setShowConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchEmpleados();
  }, []);

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

  // --- LÓGICA DE FILTRADO ---
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
    if (!form.nombre || !form.usuario || (!empleadoEdit && !form.password)) {
      alert('Por favor, completa todos los campos requeridos.');
      return;
    }

    try {
      const url = empleadoEdit 
        ? `http://localhost:3001/api/empleados/${empleadoEdit.id}` 
        : 'http://localhost:3001/api/empleados';
      
      const method = empleadoEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el empleado');
      }

      await fetchEmpleados();
      setShowModal(false);
      setEmpleadoEdit(null);
      setSuccessMessage(empleadoEdit ? 'Empleado actualizado con éxito' : 'Empleado creado con éxito');
      setShowSuccessModal(true);

    } catch (err) {
      alert(err.message);
      console.error('Error detallado:', err);
    }
  };

  const eliminar = (id) => {
    setIdToDelete(id);
    setShowConfirm(true);
  };

  const confirmarEliminar = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/empleados/${idToDelete}`, { 
        method: 'DELETE' 
      });
      if (!res.ok) throw new Error('No se pudo eliminar el empleado');
      await fetchEmpleados();
      setShowConfirm(false);
      setIdToDelete(null);
      setSuccessMessage('Empleado eliminado con éxito');
      setShowSuccessModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const getRolBadge = (rol) => {
    const colors = {
      admin: 'bg-dark text-white',
      veterinario: 'bg-primary text-white',
      recepcionista: 'bg-success text-white',
      peluquero: 'bg-info text-white'
    };
    return (
      <span className={`badge ${colors[rol] || 'bg-secondary'} px-3 py-2 text-capitalize`}>
        {rol}
      </span>
    );
  };

  if (loading) return <div className="text-center py-5 fw-bold">Cargando empleados...</div>;
  if (error) return <div className="alert alert-danger m-5">{error}</div>;

  return (
    <div className="min-vh-100 p-5 position-relative" style={{ 
        backgroundImage: `url('https://i.pinimg.com/736x/24/74/75/2474750b4d6ca9ce1b27d9f54769db69.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
    }}>
      {/* Overlay para suavizar el fondo y dar contraste */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.2)', zIndex: 0 }} />

      <div className="position-relative" style={{ zIndex: 1 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="fw-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                <FontAwesomeIcon icon={faUsers} className="me-2" /> Gestión de Empleados
            </h1>
        </div>

        {/* BARRA DE BUSQUEDA Y BOTON NUEVO */}
        <div className="row mb-4 align-items-center">
            <div className="col-md-4">
            <button className="btn btn-primary shadow-sm rounded-pill px-4 fw-bold" onClick={abrirModalNuevo}>
                <FontAwesomeIcon icon={faUserPlus} className="me-2" /> Nuevo Empleado
            </button>
            </div>
            
            <div className="col-md-5 ms-auto">
            <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                <span className="input-group-text bg-white border-0 ps-3">
                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                </span>
                <input 
                type="text" 
                className="form-control border-0 py-2 ps-1" 
                placeholder="Buscar por nombre, usuario o rol..." 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
                />
            </div>
            </div>
        </div>

        {/* TABLA CON FONDO SÓLIDO PARA MEJORAR VISIBILIDAD */}
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: '#ffffff' }}>
            <div className="card-body p-0">
            <table className="table table-hover mb-0">
                <thead className="table-light">
                <tr>
                    <th className="ps-4 py-3">Nombre</th>
                    <th className="py-3">Usuario</th>
                    <th className="py-3">Rol</th>
                    <th className="text-end pe-4 py-3">Acciones</th>
                </tr>
                </thead>
                <tbody>
                {empleadosFiltrados.length === 0 ? (
                    <tr>
                    <td colSpan="4" className="text-center py-5 text-muted">
                        {busqueda ? `No se encontraron resultados para "${busqueda}"` : "No hay empleados registrados."}
                    </td>
                    </tr>
                ) : (
                    empleadosFiltrados.map(emp => (
                    <tr key={emp.id} className="align-middle">
                        <td className="ps-4 fw-medium">{emp.nombre}</td>
                        <td>{emp.usuario}</td>
                        <td>{getRolBadge(emp.rol)}</td>
                        <td className="text-end pe-4">
                        <button 
                            className="btn btn-sm btn-outline-warning me-2 rounded-circle shadow-sm" 
                            onClick={() => abrirModalEditar(emp)}
                            title="Editar"
                            style={{width: '35px', height: '35px', backgroundColor: 'white'}}
                        >
                            <FontAwesomeIcon icon={faPencilAlt} />
                        </button>
                        <button 
                            className="btn btn-sm btn-outline-danger rounded-circle shadow-sm" 
                            onClick={() => eliminar(emp.id)}
                            title="Eliminar"
                            style={{width: '35px', height: '35px', backgroundColor: 'white'}}
                        >
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
      </div>

      {/* Modal de formulario (nuevo/editar) */}
      {showModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow rounded-4">
              <div className="modal-header bg-light border-0">
                <h5 className="modal-title fw-bold">
                  {empleadoEdit ? '📝 Editar Empleado' : '👤 Registrar Nuevo Empleado'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={guardarEmpleado}>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-uppercase">Nombre Completo</label>
                    <input type="text" className="form-control rounded-3" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Juan Pérez" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-uppercase">Nombre de Usuario</label>
                    <input type="text" className="form-control rounded-3" name="usuario" value={form.usuario} onChange={handleChange} placeholder="Ej: juan.vet" required disabled={empleadoEdit} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-uppercase">Contraseña {empleadoEdit ? '(opcional)' : '(requerida)'}</label>
                    <input type="password" className="form-control rounded-3" name="password" value={form.password} onChange={handleChange} required={!empleadoEdit} />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-uppercase">Rol en la Veterinaria</label>
                    <select className="form-select rounded-3" name="rol" value={form.rol} onChange={handleChange}>
                      <option value="recepcionista">Recepcionista</option>
                      <option value="veterinario">Veterinario</option>
                      <option value="peluquero">Peluquero</option>
                      <option value="admin">Administrador (Dueño)</option>
                    </select>
                  </div>
                  <div className="d-grid">
                    <button type="submit" className="btn btn-primary py-2 fw-bold rounded-pill">
                      {empleadoEdit ? 'GUARDAR CAMBIOS' : 'CREAR EMPLEADO'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {showSuccessModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 2000 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 text-center p-4">
              <div className="mb-4">
                <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
                <h4 className="fw-bold text-success mb-2">¡Éxito!</h4>
                <p className="text-muted mb-0">{successMessage}</p>
              </div>
              <button className="btn btn-success px-5 py-2 rounded-pill fw-bold shadow-sm" onClick={() => setShowSuccessModal(false)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmarEliminar}
        title="Eliminar Empleado"
        message="¿Estás seguro de que deseas eliminar a este empleado? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default GestionEmpleados;