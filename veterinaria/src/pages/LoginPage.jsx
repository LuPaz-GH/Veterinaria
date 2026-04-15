import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaw, faUserShield, faUserMd, faUserEdit, 
  faCut, faArrowLeft, faUser, faLock, faCheckCircle 
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import api from '../services/api';

const LoginPage = ({ setUser }) => {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [credenciales, setCredenciales] = useState({ usuario: '', clave: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showRecuperacionAdmin, setShowRecuperacionAdmin] = useState(false);
  const [showRecuperacionEmpleado, setShowRecuperacionEmpleado] = useState(false);

  // ✅ ACTUALIZADO: ahora solo necesitamos el email para recuperación
  const [recuperacionForm, setRecuperacionForm] = useState({ email: '', usuario: '' });
  const [recuperacionEnviada, setRecuperacionEnviada] = useState(false);
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

  // ======================== ROLES ========================
  const roles = [
    { id: 'admin', nombre: 'Dueña/o', icono: faUserShield, color: '#663399' },
    { id: 'veterinario', nombre: 'Veterinario', icono: faUserMd, color: '#007bff' },
    { id: 'recepcionista', nombre: 'Recepcionista', icono: faUserEdit, color: '#28a745' },
    // { id: 'peluquero', nombre: 'Peluquero', icono: faCut, color: '#ff69b4' } // OCULTO TEMPORALMENTE
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

      console.log('🔐 [Login] Intentando login con:', { usuario: credenciales.usuario, rol: rolSeleccionado.id });

      const response = await api.post('/login', {
        usuario: credenciales.usuario,
        password: credenciales.clave 
      });

      const data = response.data;

      console.log('📥 [Login] Respuesta del servidor:', data);

      const esExitoso = response.status === 200 && (data.success !== false);
      
      if (!esExitoso || !data.user) {
        setError(data.message || 'Usuario o contraseña incorrectos');
        console.warn('⚠️ [Login] Login fallido:', data.message);
        setLoading(false);
        return;
      }

      const rolBackend = data.user.rol?.toLowerCase().trim();
      const rolSeleccionadoId = rolSeleccionado.id?.toLowerCase().trim();

      console.log('🔍 [Login] Comparación de roles:', { backend: rolBackend, seleccionado: rolSeleccionadoId });

      if (rolBackend && rolSeleccionadoId && rolBackend !== rolSeleccionadoId) {
        console.warn('⚠️ [Login] Rol no coincide exactamente, pero se permite acceso:', { backend: rolBackend, seleccionado: rolSeleccionadoId });
      }

      const userParaGuardar = {
        ...data.user,
        rol: rolBackend || data.user.rol
      };

      const tokenLimpio = data.token?.trim();
      
      if (tokenLimpio) {
        localStorage.setItem('token', tokenLimpio);
        console.log('✅ [Login] Token guardado:', tokenLimpio.substring(0, 20) + '...');
      } else {
        console.warn('⚠️ [Login] No se recibió token del backend');
      }
      
      localStorage.setItem('user', JSON.stringify(userParaGuardar));
      console.log('✅ [Login] User guardado en localStorage:', userParaGuardar);

      if (setUser) {
        console.log('🔄 [Login] Llamando a setUser con:', userParaGuardar);
        setUser(userParaGuardar);
      } else {
        console.warn('⚠️ [Login] setUser no está definido - ¿se pasó como prop en App.js?');
      }

      setTimeout(() => {
        console.log('🚀 [Login] Redirigiendo a /home');
        navigate('/home', { replace: true });
      }, 100);

    } catch (err) {
      console.error('❌ [Login] Error completo:', err);
      console.error('❌ [Login] err.response:', err.response);
      
      if (err.response?.status === 401) {
        setError('Usuario o contraseña incorrectos');
      } else if (err.response?.status === 400) {
        setError('Datos incompletos');
      } else if (err.response?.status === 404) {
        setError('Endpoint /login no encontrado. Verifica la URL del backend.');
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('No se pudo conectar al servidor. Verifica que el backend esté corriendo en http://localhost:3001');
      } else {
        setError(`Error: ${err.message || 'Intentalo de nuevo'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Recuperación solo con email (flujo final deseado)
  const enviarRecuperacionPorEmail = async (e) => {
    e.preventDefault();
    setEnviandoRecuperacion(true);
    setError('');

    try {
      const response = await api.post('/recuperacion/forgot-password-email', {
        email: recuperacionForm.email.trim()
      });

      if (response.status === 200) {
        setRecuperacionEnviada(true);
      } else {
        alert(response.data.message || 'No se pudo enviar el link.');
      }
    } catch (err) {
      console.error('❌ [Recuperación por Email] Error:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  // ✅ NUEVO: función que usa usuario + email alternativo (se mantiene por compatibilidad)
  const enviarRecuperacionPorUsuario = async (e) => {
    e.preventDefault();
    setEnviandoRecuperacion(true);
    setError('');

    try {
      const response = await api.post('/recuperacion/forgot-password-usuario', {
        usuario: recuperacionForm.usuario.trim(),
        emailDestino: recuperacionForm.email.trim()
      });

      if (response.status === 200) {
        setRecuperacionEnviada(true);
      } else {
        alert(response.data.message || 'No se pudo enviar el link. Verificá el usuario ingresado.');
      }
    } catch (err) {
      console.error('❌ [Recuperación] Error:', err);
      alert('Error de conexión con el servidor.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  // Función original para empleados (se mantiene por compatibilidad, no se renderiza ahora)
  const enviarRecuperacionEmpleado = async (e) => {
    e.preventDefault();
    setEnviandoRecuperacion(true);
    try {
      const payload = {
        nombre: rolSeleccionado ? `${rolSeleccionado.nombre} (desde login)` : 'Usuario',
        email: recuperacionForm.email.trim(),
        mensaje: `Solicitud de recuperación.\nUsuario intentado: ${credenciales.usuario || '(no ingresado)'}\nRol: ${rolSeleccionado?.nombre || 'No seleccionado'}`
      };

      const response = await api.post('/recuperacion', payload);
      const result = response.data;

      if (response.status === 200 && result.success) {
        setRecuperacionEnviada(true);
      } else {
        alert(result.message || 'No se pudo enviar la solicitud');
      }
    } catch (err) {
      console.error('❌ [Recuperación Empleado] Error:', err);
      alert('Error al conectar. Intenta WhatsApp.');
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  const whatsappLink = rolSeleccionado
    ? `https://wa.me/5493815192208?text=Hola%2C%20olvid%C3%A9%20mi%20usuario%20y%20contrase%C3%B1a%20como%20${encodeURIComponent(rolSeleccionado.nombre.toLowerCase())}`
    : 'https://wa.me/5493815192208';

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
            
            <div className="d-flex flex-column align-items-center gap-3">
              <div className="row w-100 g-3 justify-content-center">
                <div className="col-6 col-md-5">
                  <button className="btn w-100 p-3 rounded-4 border-0 shadow-sm"
                    style={{ background: 'white', color: roles[0].color, border: `2px solid ${roles[0].color}` }}
                    onClick={() => setRolSeleccionado(roles[0])}>
                    <FontAwesomeIcon icon={roles[0].icono} size="2x" className="mb-2" />
                    <div className="fw-bold small">{roles[0].nombre}</div>
                  </button>
                </div>
                
                <div className="col-6 col-md-5">
                  <button className="btn w-100 p-3 rounded-4 border-0 shadow-sm"
                    style={{ background: 'white', color: roles[1].color, border: `2px solid ${roles[1].color}` }}
                    onClick={() => setRolSeleccionado(roles[1])}>
                    <FontAwesomeIcon icon={roles[1].icono} size="2x" className="mb-2" />
                    <div className="fw-bold small">{roles[1].nombre}</div>
                  </button>
                </div>
              </div>

              <div className="col-6 col-md-5 mx-auto">
                <button className="btn w-100 p-3 rounded-4 border-0 shadow-sm"
                  style={{ background: 'white', color: roles[2].color, border: `2px solid ${roles[2].color}` }}
                  onClick={() => setRolSeleccionado(roles[2])}>
                  <FontAwesomeIcon icon={roles[2].icono} size="2x" className="mb-2" />
                  <div className="fw-bold small">{roles[2].nombre}</div>
                </button>
              </div>
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
              <p 
                className="mb-3 fw-bold text-primary" 
                style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                onClick={() => {
                  setRecuperacionEnviada(false);
                  setRecuperacionForm({ email: '', usuario: '' }); 
                  setShowRecuperacionAdmin(true);
                }}
              >
                ¿Olvidaste tu usuario o contraseña?
              </p>

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

      {/* ==================== MODAL DE RECUPERACIÓN (ACTUALIZADO - SOLO EMAIL) ==================== */}
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
                  <div className="text-center py-4">
                    <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
                    <h4 className="fw-bold text-success">¡Link enviado!</h4>
                    
                    <p className="mt-3 text-muted">
                      Te enviamos un email con el enlace para recuperar tu acceso.
                    </p>

                    <div className="alert alert-warning mt-4 small">
                      <strong>Importante:</strong><br />
                      Si no ves el email en tu bandeja de entrada:<br />
                      • Revisá la carpeta de <strong>Spam</strong> o <strong>Correo no deseado</strong><br />
                      • Mirá en la pestaña <strong>"Otros"</strong> (en Outlook)<br />
                      • A veces tarda unos minutos en llegar
                    </div>

                    <button 
                      className="btn btn-primary mt-3 px-5 rounded-pill" 
                      onClick={() => { 
                        setShowRecuperacionAdmin(false); 
                        setRecuperacionEnviada(false); 
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  // ✅ FORMULARIO ACTUALIZADO: solo se pide el email
                  <form onSubmit={enviarRecuperacionPorEmail}>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Email</label>
                      <input
                        type="email"
                        className="form-control rounded-pill py-2"
                        placeholder="tu@email.com"
                        value={recuperacionForm.email}
                        onChange={(e) => setRecuperacionForm({ ...recuperacionForm, email: e.target.value })}
                        required
                      />
                      <div className="form-text text-muted">
                        Te enviaremos el enlace a este email. Puede ser uno diferente al registrado.
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-100 rounded-pill fw-bold py-3"
                      disabled={enviandoRecuperacion}
                    >
                      {enviandoRecuperacion ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal empleados - se mantiene por compatibilidad (no se renderiza en el flujo actual) */}
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
                        onChange={(e) => setRecuperacionForm({ ...recuperacionForm, email: e.target.value })} 
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