// src/pages/HomePage.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faPaw } from '@fortawesome/free-solid-svg-icons';

const HomePage = ({ user }) => {
  const esAdmin = user?.rol === 'admin';
  const esVeterinario = user?.rol === 'veterinario';
  const esAdminOVet = esAdmin || esVeterinario;
  const esPeluquero = user?.rol === 'peluquero';

  // Configuración por rol - Ahora con fondos SEPARADOS para admin y veterinario
  const config = esPeluquero
    ? {
        saludo: '¡Hola, Peluquero/a!',
        fondoImagen:
          'https://i.pinimg.com/1200x/f0/1a/6e/f01a6e96fee46bd114f7b2cbaf37d437.jpg', // Fondo lindo para peluquería (cambiá si querés)
        colorCard: '#ff50f6',
        textoPrincipal: '¡Bienvenido/a a la peluquería de Malfi!',
      }
    : esAdmin
    ? {
        saludo: '¡Hola Dueña!',
        fondoImagen:
          'https://i.pinimg.com/1200x/5f/72/97/5f7297fbc4c41a5a442add8e1d9514bb.jpg', // ← Golden retriever lindo (el que te gustó)
        colorCard: '#663399',
        textoPrincipal: '¡Bienvenido/a al panel de la dueña!',
      }
    : esVeterinario
    ? {
        saludo: '¡Hola Doc!',
        fondoImagen:
          'https://i.pinimg.com/1200x/6d/c4/3f/6dc43fd9935782fd4cdeacc246771397.jpg', // Fondo veterinario (perro en consulta, profesional)
        colorCard: '#663399',
        textoPrincipal: '¡Bienvenido/a al panel veterinario!',
      }
    : {
        saludo: '¡Bienvenido/a a la recepción!',
        fondoImagen:
          'https://i.pinimg.com/736x/ed/80/6b/ed806bf01396dcc39b78c656eb23fc57.jpg', // Fondo recepción
        colorCard: '#1e5128',
        textoPrincipal: '¡Bienvenido/a a la recepción!',
      };

  return (
    <div className="flex-grow-1">
      {/* HERO FULL SCREEN */}
      <div
        className="position-relative d-flex align-items-center justify-content-center"
        style={{
          backgroundImage: `
            linear-gradient(
              135deg,
              rgba(138, 36, 121, 0.25) 0%,
              rgba(248,241,239,0.25) 100%
            ),
            url('${config.fondoImagen}')
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        {/* OVERLAY SUAVE */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(236, 230, 230, 0.15)',
            zIndex: 1,
          }}
        />

        {/* CONTENIDO */}
        <div className="container-fluid py-5 position-relative" style={{ zIndex: 2 }}>
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10 text-center text-dark">
              <h1
                className="display-3 fw-bold mb-3"
                style={{ textShadow: '0 2px 8px rgba(197, 12, 188, 0.77)' }}
              >
                {config.saludo}
              </h1>

              <p className="fs-2 fw-light mb-5">
                {config.textoPrincipal}
              </p>

              <div className="row g-4 justify-content-center">
                {/* CARD TURNOS */}
                <div className="col-md-5 col-lg-4">
                  <div
                    className="card border-0 shadow-lg p-4 text-center"
                    style={{
                      borderRadius: '2rem',
                      backdropFilter: 'blur(12px)',
                      background: 'rgba(255,255,255,0.95)',
                      border: `3px solid ${config.colorCard}`,
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center gap-3 mb-3"
                      style={{ color: config.colorCard }}
                    >
                      <FontAwesomeIcon icon={faCalendarAlt} size="2x" />
                      <h4 className="fw-bold mb-0">Turnos de Hoy</h4>
                    </div>
                    <p
                      className="display-4 fw-bold mb-0"
                      style={{ color: config.colorCard }}
                    >
                      8
                    </p>
                  </div>
                </div>

                {/* CARD PACIENTES */}
                <div className="col-md-5 col-lg-4">
                  <div
                    className="card border-0 shadow-lg p-4 text-center"
                    style={{
                      borderRadius: '2rem',
                      backdropFilter: 'blur(12px)',
                      background: 'rgba(255,255,255,0.95)',
                      border: `3px solid ${config.colorCard}`,
                    }}
                  >
                    <div
                      className="d-flex align-items-center justify-content-center gap-3 mb-3"
                      style={{ color: config.colorCard }}
                    >
                      <FontAwesomeIcon icon={faPaw} size="2x" />
                      <h4 className="fw-bold mb-0">Pacientes Totales</h4>
                    </div>
                    <p
                      className="display-4 fw-bold mb-0"
                      style={{ color: config.colorCard }}
                    >
                      124
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;