import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarCheck, faWallet, faPaw, faHeart, 
  faStethoscope, faFileMedical, faSyringe, faUsers, 
  faClipboardList, faScissors, faShower 
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import DueñoDashboard from './DueñoDashboard'; 
import VeterinarioDashboard from './VeterinarioDashboard';
import RecepcionistaDashboard from './RecepcionistaDashboard';
// import PeluqueroDashboard from './PeluqueroDashboard'; // Descomentar si tenés este componente

const HomePage = ({ user, onLogout }) => {
  // === DEBUG: Verificar qué está llegando ===
  console.log('🔍 HomePage - User object:', user);
  console.log('🔑 HomePage - Rol raw:', user?.rol);
  console.log('🔑 HomePage - Rol normalizado:', user?.rol?.toLowerCase()?.trim());

  // Normalizar el rol para evitar problemas de mayúsculas/espacios
  const rolNormalizado = user?.rol?.toLowerCase().trim();

  const isVeterinario = rolNormalizado === 'veterinario';
  const isRecepcionista = rolNormalizado === 'recepcionista';
  const isPeluquero = rolNormalizado === 'peluquero';
  const isDueño = rolNormalizado === 'admin' || rolNormalizado === 'dueño';

  // === DEBUG: Verificar detección de roles ===
  console.log('✅ isVeterinario:', isVeterinario);
  console.log('✅ isRecepcionista:', isRecepcionista);
  console.log('✅ isPeluquero:', isPeluquero);
  console.log('✅ isDueño:', isDueño);

  let theme;

  if (isVeterinario) {
    theme = {
      bgImage: `url('https://i.pinimg.com/1200x/99/cf/63/99cf63eb91f07a1be59bfe48c26d1c0d.jpg')`,
      greeting: '¡Hola Doc! 🩺',
      subGreeting: 'Listo para cuidar patitas hoy',
      button1Text: 'Agenda de Consultas',
      button1Icon: faCalendarCheck,
      button1To: '/turnos',
      button2Text: 'Historial Clínico',
      button2Icon: faFileMedical,
      button2To: '/historial',
      messageTitle: 'Mensaje del día',
      messageIcon: faStethoscope,
      messageText: '"Cada diagnóstico preciso salva una vida. ¡Seguí cuidando con pasión y ciencia!"',
      reminderTitle: 'Recordatorio rápido',
      reminderIcon: faSyringe,
      reminderText: 'Revisá el stock de vacunas, antipulgas y medicamentos antes de empezar las consultas.'
    };
  } else if (isRecepcionista) {
    theme = {
      bgImage: `url('https://i.pinimg.com/736x/5d/3e/22/5d3e224d350b39355f767713ec47e654.jpg')`,
      greeting: '¡Hola Recepcionista! 📞',
      subGreeting: 'Gestión y atención al cliente Malfi',
      button1Text: 'Agenda de Turnos',
      button1Icon: faCalendarCheck,
      button1To: '/turnos',
      button2Text: 'Gestión de Dueños',
      button2Icon: faUsers,
      button2To: '/duenos',
      messageTitle: 'Atención al Cliente',
      messageIcon: faClipboardList,
      messageText: '"Una sonrisa en recepción es el primer paso para una mascota sana. ¡Buen trabajo!"',
      reminderTitle: 'Pendientes de hoy',
      reminderIcon: faPaw,
      reminderText: 'No olvides confirmar los turnos de la tarde y revisar los ingresos en caja.'
    };
  } else if (isPeluquero) {
    theme = {
      bgImage: `url('https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=2071&auto=format&fit=crop')`,
      greeting: '¡Hola Peluquero! ✂️',
      subGreeting: 'Dejando a nuestras mascotas más lindas que nunca',
      button1Text: 'Mis Turnos de Hoy',
      button1Icon: faCalendarCheck,
      button1To: '/estetica',
      button2Text: 'Nueva Ficha Estética',
      button2Icon: faScissors,
      button2To: '/estetica',
      messageTitle: 'Estilo y Cuidado',
      messageIcon: faShower,
      messageText: '"Un buen baño y un corte con amor hacen maravillas. ¡A brillar!"',
      reminderTitle: 'Tip de Peluquería',
      reminderIcon: faHeart,
      reminderText: 'No olvides revisar si alguna mascota tiene la piel sensible antes del baño medicado.'
    };
  } else {
    // Default para dueño/admin
    theme = {
      bgImage: `url('https://i.pinimg.com/1200x/5f/72/97/5f7297fbc4c41a5a442add8e1d9514bb.jpg')`,
      greeting: '¡Hola Dueña Vicky! 💜',
      subGreeting: 'Bienvenida al corazón de Malfi Veterinaria 🐾',
      button1Text: 'Agenda de Turnos',
      button1Icon: faCalendarCheck,
      button1To: '/turnos',
      button2Text: 'Caja del Día',
      button2Icon: faWallet,
      button2To: '/caja',
      messageTitle: 'Mensaje del día',
      messageIcon: faHeart,
      messageText: '"Cada patita que curamos nos llena el corazón. ¡Seguí brillando con todo el amor!"',
      reminderTitle: 'Recordatorio rápido',
      reminderIcon: faPaw,
      reminderText: 'Revisá el stock de vacunas y antipulgas antes de cerrar. ¡Todo bajo control!'
    };
  }

  // === RETURNS ESPECÍFICOS POR ROL ===
  
  if (isVeterinario) {
    return <VeterinarioDashboard onLogout={onLogout} />;
  }

  if (isRecepcionista) {
    return <RecepcionistaDashboard onLogout={onLogout} />;
  }

  // if (isPeluquero) {
  //   return <PeluqueroDashboard onLogout={onLogout} />; // Descomentar si tenés este componente
  // }

  // === RETURN GENÉRICO PARA DUEÑO/ADMIN ===
  return (
    <div 
      className="min-vh-100 d-flex align-items-center justify-content-center p-5"
      style={{
        backgroundImage: theme.bgImage,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div 
        className="text-center text-white p-5 rounded-5 shadow-2xl backdrop-blur"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.5)', 
          backdropFilter: 'blur(15px)', 
          maxWidth: '1200px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <h1 className="fw-bold mb-2" style={{ fontSize: '3.5rem', textShadow: '2px 4px 10px rgba(0,0,0,0.5)' }}>
          {theme.greeting}
        </h1>
        <p className="lead fs-3 mb-5 opacity-90 italic">
          {theme.subGreeting}
        </p>

        <div className="d-flex flex-wrap justify-content-center gap-4 mb-5">
          <Link 
            to={theme.button1To}
            className={`btn btn-xl px-5 py-3 rounded-pill shadow-lg fw-bold d-flex align-items-center justify-content-center transition-all ${isVeterinario ? 'btn-info text-white' : isPeluquero ? 'btn-danger text-white' : 'btn-success text-white'}`}
            style={{ fontSize: '1.4rem', minWidth: '300px' }}
          >
            <FontAwesomeIcon icon={theme.button1Icon} className="me-3 fs-2" />
            {theme.button1Text}
          </Link>

          <Link 
            to={theme.button2To}
            className={`btn btn-xl px-5 py-3 rounded-pill shadow-lg fw-bold d-flex align-items-center justify-content-center transition-all ${isRecepcionista ? 'btn-warning text-dark' : isPeluquero ? 'btn-light text-danger' : 'btn-primary text-white'}`}
            style={{ fontSize: '1.4rem', minWidth: '300px' }}
          >
            <FontAwesomeIcon icon={theme.button2Icon} className="me-3 fs-2" />
            {theme.button2Text}
          </Link>
        </div>

        <div className="row g-4 justify-content-center mb-5">
          <div className="col-md-6">
            <div className="card bg-dark bg-opacity-50 text-white border-0 shadow-lg p-4 rounded-4 h-100 backdrop-blur">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon icon={theme.messageIcon} size="2x" className="me-3" style={{ color: '#00d2ff' }} />
                <h4 className="mb-0">{theme.messageTitle}</h4>
              </div>
              <p className="fs-5 mb-0 italic">"{theme.messageText.replace(/"/g, '')}"</p>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card bg-dark bg-opacity-50 text-white border-0 shadow-lg p-4 rounded-4 h-100 backdrop-blur">
              <div className="d-flex align-items-center justify-content-center mb-3">
                <FontAwesomeIcon icon={theme.reminderIcon} size="2x" className="me-3" style={{ color: '#00ff88' }} />
                <h4 className="mb-0">{theme.reminderTitle}</h4>
              </div>
              <p className="fs-5 mb-0">{theme.reminderText}</p>
            </div>
          </div>
        </div>

        {isDueño && (
          <div className="mt-2 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <DueñoDashboard />
          </div>
        )}

        {(isVeterinario || isRecepcionista || isPeluquero) && (
          <div className="mt-4">
            <Link 
              to="/clientes"
              className="btn btn-outline-light btn-lg px-5 py-2 rounded-pill shadow fw-bold transition-all"
            >
              <FontAwesomeIcon icon={faPaw} className="me-2" />
              {isPeluquero ? 'Lista de Clientes' : isRecepcionista ? 'Lista de Pacientes' : 'Ver Pacientes'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;