import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCheckCircle, faPaw, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newUsuario, setNewUsuario] = useState('');  // ← Nuevo campo para usuario
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      setError('Enlace de recuperación inválido o incompleto. Volvé a solicitar uno nuevo desde el login.');
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (!newUsuario.trim()) {
      setError('El nuevo usuario no puede estar vacío.');
      return;
    }

    if (newUsuario.trim().length < 4) {
      setError('El nuevo usuario debe tener al menos 4 caracteres.');
      return;
    }

    setLoading(true);

    try {
      console.log('[RESET] Intentando cambiar contraseña y usuario...');
      console.log('[RESET] Token:', token.substring(0, 10) + '...');
      console.log('[RESET] Email:', email);
      console.log('[RESET] Nuevo usuario propuesto:', newUsuario.trim());

      const response = await fetch('http://localhost:3001/api/recuperacion/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword: password,
          newUsuario: newUsuario.trim()  // ← Enviamos también el nuevo usuario
        })
      });

      console.log('[RESET] Estado HTTP:', response.status);

      const data = await response.json();
      console.log('[RESET] Respuesta completa:', data);

      if (!response.ok) {
        throw new Error(data.message || `Error del servidor: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'No se pudo actualizar la cuenta');
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setNewUsuario('');

    } catch (err) {
      console.error('[RESET] Error completo:', err);
      setError(err.message || 'Error al conectar con el servidor. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div 
        className="container-fluid min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: 'linear-gradient(135deg, #663399 0%, #ff69b4 100%)' }}
      >
        <div className="card border-0 shadow-lg p-5 text-center" 
             style={{ borderRadius: '40px', background: 'rgba(255, 255, 255, 0.95)', maxWidth: '500px', width: '90%' }}>
          
          <FontAwesomeIcon icon={faPaw} size="4x" className="mb-4" style={{ color: '#663399' }} />
          <FontAwesomeIcon icon={faCheckCircle} size="5x" className="text-success mb-3" />
          <h3 className="fw-bold mb-3 text-success">¡Cuenta actualizada con éxito!</h3>
          <p className="text-muted mb-4">
            Ya podés iniciar sesión con tu nuevo usuario y contraseña.<br />
            ¡Gracias por confiar en Malfi Veterinaria! 🐶
          </p>
          <button 
            className="btn btn-primary rounded-pill py-3 px-5 fw-bold shadow"
            style={{ background: '#663399', border: 'none' }}
            onClick={() => navigate('/')}
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="container-fluid min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'linear-gradient(135deg, #663399 0%, #ff69b4 100%)' }}
    >
      <div className="card border-0 shadow-lg p-5" 
           style={{ borderRadius: '40px', background: 'rgba(255, 255, 255, 0.95)', maxWidth: '500px', width: '90%' }}>
        
        <button 
          className="btn shadow-sm rounded-circle position-absolute" 
          onClick={() => navigate('/')}
          style={{ top: '-20px', left: '-20px', background: 'white', width: '50px', height: '50px', color: '#663399', border: '2px solid #663399' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>

        <FontAwesomeIcon icon={faLock} size="4x" className="mb-4" style={{ color: '#663399' }} />
        <h3 className="fw-bold mb-1 text-center">Crear nueva contraseña</h3>
        <p className="text-muted text-center mb-4 small">
          Ingresá tu nueva contraseña y usuario (opcional) para el acceso de Dueña/o
        </p>

        {error && <div className="alert alert-danger mb-4 text-center">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label fw-bold">Nuevo usuario (opcional)</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-0 rounded-start-pill text-muted">
                <FontAwesomeIcon icon={faUser} />
              </span>
              <input
                type="text"
                className="form-control rounded-end-pill py-3 bg-light border-0"
                placeholder="Nuevo nombre de usuario"
                value={newUsuario}
                onChange={(e) => setNewUsuario(e.target.value)}
              />
            </div>
            <small className="text-muted">Si no querés cambiarlo, dejalo en blanco.</small>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Nueva contraseña</label>
            <input
              type="password"
              className="form-control rounded-pill py-3 bg-light border-0"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold">Repetir contraseña</label>
            <input
              type="password"
              className="form-control rounded-pill py-3 bg-light border-0"
              placeholder="Confirmá tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn text-white w-100 rounded-pill py-3 fw-bold shadow"
            style={{ background: '#663399' }}
            disabled={loading || !token || !email}
          >
            {loading ? 'Cambiando...' : 'Cambiar contraseña y usuario'}
          </button>
        </form>

        <p className="text-center text-muted small mt-4">
          El enlace expira en 1 hora. Si ya pasó, solicitá uno nuevo desde el login.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;