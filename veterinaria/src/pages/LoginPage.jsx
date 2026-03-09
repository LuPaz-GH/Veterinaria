import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaw, faUserShield, faUserMd, faUserEdit, 
  faCut, faArrowLeft, faUser, faLock, faCheckCircle 
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

const LoginPage = () => {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [credenciales, setCredenciales] = useState({ usuario: '', clave: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showRecuperacionAdmin, setShowRecuperacionAdmin] = useState(false);
  const [showRecuperacionEmpleado, setShowRecuperacionEmpleado] = useState(false);
  const [recuperacionForm, setRecuperacionForm] = useState({ email: '' });
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false);
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

  const roles = [
    { id: 'admin', nombre: 'Dueña/o', icono: faUserShield, color: '#663399' },
    { id: 'veterinario', nombre: 'Veterinario', icono: faUserMd, color: '#007bff' },
    { id: 'recepcionista', nombre: 'Recepcionista', icono: faUserEdit, color: '#28a745' },
    { id: 'peluquero', nombre: 'Peluquero', icono: faCut, color: '#ff69b4' }
  ];

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!rolSeleccionado) {
        setError("Debes seleccionar un rol antes de iniciar sesión.");
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: credenciales.usuario,
          password: credenciales.clave 
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }

      if (data.user?.rol !== rolSeleccionado.id) {
        setError(`Acceso denegado. Tu rol real es "${data.user?.rol}" y seleccionaste "${rolSeleccionado.id}".`);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.rol === 'admin') {
        navigate('/home');
      } else if (data.user.rol === 'veterinario') {
        navigate('/home'); 
      } else if (data.user.rol === 'peluquero') {
        navigate('/home');
      } else {
        navigate('/home');
      }

      window.location.reload();

    } catch (err) {
      setError('No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  // CORREGIDO: Función para el DUEÑO (Admin)
  const enviarRecuperacionAdmin = async (e) => {
    e.preventDefault();
    setEnviandoRecuperacion(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/recuperacion/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recuperacionForm.email.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setRecuperacionEnviada(true);
      } else {
        // Mostramos el error que viene del backend si el email no existe
        alert(data.message || 'No se pudo enviar el email de recuperación. Verifica el correo ingresado.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor de correos.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  // Función para EMPLEADOS (Formulario al dueño)
  const enviarRecuperacionEmpleado = async (e) => {
    e.preventDefault();
    setEnviandoRecuperacion(true);
    try {
      const payload = {
        nombre: rolSeleccionado ? `${rolSeleccionado.nombre} (desde login)` : 'Usuario',
        email: recuperacionForm.email.trim(),
        mensaje: `Solicitud de recuperación.\nUsuario intentado: ${credenciales.usuario || '(no ingresado)'}\nRol: ${rolSeleccionado?.nombre || 'No seleccionado'}`
      };

      const response = await fetch('http://localhost:3001/api/recuperacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setRecuperacionEnviada(true);
      } else {
        alert(result.message || 'No se pudo enviar la solicitud');
      }
    } catch (err) {
      alert('Error al conectar. Intenta WhatsApp.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  const whatsappLink = rolSeleccionado
    ? `https://wa.me/5493815192208?text=Hola%2C%20olvid%C3%A9%20mi%20usuario%20y%20contrase%C3%B1a%20como%20${encodeURIComponent(rolSeleccionado.nombre.toLowerCase())}`
    : 'https://wa.me/5493815192208';

  const isAdmin = rolSeleccionado?.id === 'admin';

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center" 
         style={{ background: 'linear-gradient(135deg, #663399 0%, #ff69b4 100%)' }}>
      
      <div className="card border-0 shadow-lg p-5 text-center position-relative" 
            style={{ borderRadius: '40px', background: 'rgba(255, 255, 255, 0.95)', maxWidth: '500px', width: '90%' }}>
        
        {!rolSeleccionado ? (
          <>
            <div className="bg-white rounded-circle d-inline-block p-3 mb-3 shadow-sm">
              <FontAwesomeIcon icon={faPaw} size="3x" style={{ color: '#663399' }} />
            </div>
            <h2 className="fw-bold mb-4">¿Quién ingresa?</h2>
            <div className="row g-3">
              {roles.map((r) => (
                <div className="col-6" key={r.id}>
                  <button className="btn w-100 p-3 rounded-4 border-0 shadow-sm"
                    style={{ background: 'white', color: r.color, border: `2px solid ${r.color}` }}
                    onClick={() => setRolSeleccionado(r)}>
                    <FontAwesomeIcon icon={r.icono} size="2x" className="mb-2" />
                    <div className="fw-bold small">{r.nombre}</div>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="btn shadow-sm rounded-circle position-absolute" 
              onClick={() => {
                setRolSeleccionado(null);
                setError('');
              }}
              style={{ top: '-20px', left: '-20px', background: 'white', width: '50px', height: '50px', color: rolSeleccionado.color, border: `2px solid ${rolSeleccionado.color}` }}>
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>
            <FontAwesomeIcon icon={rolSeleccionado.icono} size="4x" className="mb-3" style={{ color: rolSeleccionado.color }} />
            <h3 className="fw-bold mb-1">Ingreso {rolSeleccionado.nombre}</h3>
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            <form onSubmit={manejarLogin}>
              <div className="input-group mb-3">
                <span className="input-group-text bg-light border-0 rounded-start-pill text-muted"><FontAwesomeIcon icon={faUser} /></span>
                <input type="text" className="form-control bg-light border-0 rounded-end-pill py-3" placeholder="Usuario" 
                  value={credenciales.usuario} onChange={(e) => setCredenciales({ ...credenciales, usuario: e.target.value })} required />
              </div>
              <div className="input-group mb-4">
                <span className="input-group-text bg-light border-0 rounded-start-pill text-muted"><FontAwesomeIcon icon={faLock} /></span>
                <input type="password" className="form-control bg-light border-0 rounded-end-pill py-3" placeholder="Contraseña" 
                  value={credenciales.clave} onChange={(e) => setCredenciales({ ...credenciales, clave: e.target.value })} required />
              </div>
              <button type="submit" className="btn text-white w-100 rounded-pill py-3 fw-bold shadow"
                style={{ background: rolSeleccionado.color }} disabled={loading}>
                {loading ? 'Ingresando...' : 'INGRESAR'}
              </button>
            </form>

            <div className="mt-5 pt-4 border-top text-center small text-muted">
              {isAdmin ? (
                <p 
                  className="mb-3 fw-bold text-primary" 
                  style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                  onClick={() => {
                    setRecuperacionEnviada(false);
                    setShowRecuperacionAdmin(true);
                  }}
                >
                  ¿Olvidaste tus datos?
                </p>
              ) : (
                <p 
                  className="mb-3 fw-bold text-primary" 
                  style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                  onClick={() => {
                    setRecuperacionEnviada(false);
                    setShowRecuperacionEmpleado(true);
                  }}
                >
                  ¿Olvidaste tu usuario o contraseña?
                </p>
              )}

              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-success btn-lg rounded-pill px-5 py-3 shadow-lg fw-bold"
              >
                <FontAwesomeIcon icon={faWhatsapp} className="me-2" /> 
                Pedir ayuda por WhatsApp
              </a>
            </div>
          </>
        )}
      </div>

      {/* Modal para ADMIN: recuperación por email */}
      {showRecuperacionAdmin && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow-lg border-0 p-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-primary">Recuperar mi acceso</h5>
                <button type="button" className="btn-close" onClick={() => setShowRecuperacionAdmin(false)}></button>
              </div>
              <div className="modal-body">
                {recuperacionEnviada ? (
                  <div className="text-center py-5">
                    <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
                    <h4 className="fw-bold text-success">¡Enviado!</h4>
                    <p className="mt-3 text-muted">Revisa tu correo electrónico (incluida la carpeta de spam)</p>
                    <button className="btn btn-primary mt-4 px-5 rounded-pill" onClick={() => { setShowRecuperacionAdmin(false); setRecuperacionEnviada(false); }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={enviarRecuperacionAdmin}>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Email registrado</label>
                      <input 
                        type="email" 
                        className="form-control rounded-pill" 
                        value={recuperacionForm.email}
                        onChange={(e) => setRecuperacionForm({ email: e.target.value })} 
                        required 
                        placeholder="tu@email.com"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary w-100 rounded-pill fw-bold" 
                      disabled={enviandoRecuperacion}
                    >
                      {enviandoRecuperacion ? 'Enviando...' : 'Enviar link de recuperación'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para EMPLEADOS: solicitud manual */}
      {showRecuperacionEmpleado && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content rounded-4 shadow-lg border-0 p-4">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-primary">Solicitar recuperación de acceso</h5>
                <button type="button" className="btn-close" onClick={() => setShowRecuperacionEmpleado(false)}></button>
              </div>
              <div className="modal-body">
                {recuperacionEnviada ? (
                  <div className="text-center py-5">
                    <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
                    <h4 className="fw-bold text-success">¡Solicitud enviada!</h4>
                    <p className="mt-3 text-muted">
                      La dueña recibirá tu pedido y te contactará pronto.
                    </p>
                    <button className="btn btn-primary mt-4 px-5 rounded-pill" onClick={() => { setShowRecuperacionEmpleado(false); setRecuperacionEnviada(false); }}>
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <form onSubmit={enviarRecuperacionEmpleado}>
                    <div className="mb-4">
                      <label className="form-label fw-bold">Tu email (para que la dueña te responda)</label>
                      <input 
                        type="email" 
                        className="form-control rounded-pill py-3" 
                        placeholder="tu@email.com"
                        value={recuperacionForm.email}
                        onChange={(e) => setRecuperacionForm({ email: e.target.value })} 
                        required 
                      />
                    </div>
                    <div className="mb-4 small text-muted">
                      <p>Tu solicitud será registrada y la dueña recibirá una notificación automática.</p>
                    </div>
                    <button 
                      type="submit" 
                      className="btn btn-primary w-100 rounded-pill py-3 fw-bold" 
                      disabled={enviandoRecuperacion}
                    >
                      {enviandoRecuperacion ? 'Enviando...' : 'Enviar solicitud'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;