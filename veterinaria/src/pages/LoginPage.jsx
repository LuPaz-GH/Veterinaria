import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaw, faUserShield, faUserMd, faUserEdit, faCut, faArrowLeft, 
  faUser, faLock // Iconos agregados para evitar ReferenceError
} from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const navigate = useNavigate();
  const [rolSeleccionado, setRolSeleccionado] = useState(null);
  const [credenciales, setCredenciales] = useState({ usuario: '', clave: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: credenciales.usuario,
          password: credenciales.clave 
        })
      });

      // Verificamos si la respuesta es JSON para evitar el error de SyntaxError: Unexpected token '<'
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("El servidor no respondió con JSON. Revisa que el backend esté corriendo.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Usuario o contraseña incorrectos');
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirección por rol
      if (data.user.rol === 'admin') {
        navigate('/admin');
      } else if (data.user.rol === 'peluquero') {
        navigate('/estetica');
      } else {
        navigate('/home');
      }

      window.location.reload();
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
                  <button 
                    className="btn w-100 p-3 rounded-4 border-0 shadow-sm"
                    style={{ background: 'white', color: r.color, border: `2px solid ${r.color}` }}
                    onClick={() => setRolSeleccionado(r)}
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={r.icono} size="2x" className="mb-2" />
                    <div className="fw-bold small">{r.nombre}</div>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button 
              className="btn shadow-sm rounded-circle position-absolute" 
              onClick={() => setRolSeleccionado(null)}
              disabled={loading}
              style={{ top: '-20px', left: '-20px', background: 'white', width: '50px', height: '50px', color: rolSeleccionado.color, border: `2px solid ${rolSeleccionado.color}` }}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </button>

            <FontAwesomeIcon icon={rolSeleccionado.icono} size="4x" className="mb-3" style={{ color: rolSeleccionado.color }} />
            <h3 className="fw-bold mb-1">Ingreso {rolSeleccionado.nombre}</h3>
            <p className="text-muted mb-4 small">Introduce tus credenciales</p>

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <form onSubmit={manejarLogin}>
              <div className="input-group mb-3">
                <span className="input-group-text bg-light border-0 rounded-start-pill text-muted">
                  <FontAwesomeIcon icon={faUser} />
                </span>
                <input 
                  type="text" 
                  className="form-control bg-light border-0 rounded-end-pill py-3" 
                  placeholder="Usuario" 
                  value={credenciales.usuario}
                  onChange={(e) => setCredenciales({ ...credenciales, usuario: e.target.value })}
                  required 
                  disabled={loading}
                />
              </div>

              <div className="input-group mb-4">
                <span className="input-group-text bg-light border-0 rounded-start-pill text-muted">
                  <FontAwesomeIcon icon={faLock} />
                </span>
                <input 
                  type="password" 
                  className="form-control bg-light border-0 rounded-end-pill py-3" 
                  placeholder="Contraseña" 
                  value={credenciales.clave}
                  onChange={(e) => setCredenciales({ ...credenciales, clave: e.target.value })}
                  required 
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="btn text-white w-100 rounded-pill py-3 fw-bold shadow"
                style={{ background: rolSeleccionado.color }}
                disabled={loading}
              >
                {loading ? 'Ingresando...' : 'INGRESAR'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;