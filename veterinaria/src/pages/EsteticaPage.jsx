import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faScissors, faPlus, faSearch, faCalendarAlt, faClock, faEdit, 
  faTrash, faCheckCircle, faFilePdf, faFileExcel, faPlay, faTimes, 
  faPaw, faUser, faTag, faExclamationTriangle, faInfoCircle, faCheck
} from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const EsteticaPage = () => {
  const [servicios, setServicios] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState(null);
  const [isNuevaMascota, setIsNuevaMascota] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para controlar qué tarjeta tiene el mouse encima
  const [hoverId, setHoverId] = useState(null);

  // Estados para los nuevos carteles GRANDES
  const [notificacion, setNotificacion] = useState({ show: false, mensaje: '', tipo: 'success' });
  const [confirmacion, setConfirmacion] = useState({ show: false, id: null, mensaje: '', nombreMascota: '' });

  const [formData, setFormData] = useState({
    mascota_id: '',
    tipo_servicio: 'Baño y Corte Completo',
    fecha: new Date().toISOString().slice(0, 16),
    nueva_mascota_nombre: '',
    nueva_mascota_especie: 'Perro',
    nueva_mascota_raza: '',
    nuevo_dueno_nombre: '',
    nuevo_dueno_telefono: ''
  });

  const opcionesServicios = [
    "Baño y Corte Completo", "Solo Baño", "Corte de Uñas", "Limpieza de Oídos y Glándulas",
    "Deslanado (Shedding)", "Baño Medicado / Antiparasitario", "Corte de Raza (Show Grooming)",
    "Hidratación de Manto", "Recorte Sanitario", "Spa Relajante"
  ];

  const mostrarAviso = (mensaje, tipo = 'success') => {
    setNotificacion({ show: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ show: false, mensaje: '', tipo: 'success' }), 3000);
  };

  const exportarExcel = () => {
    if (filtrados.length === 0) return mostrarAviso("No hay datos para exportar", "error");
    const datosExcel = filtrados.map(s => ({
      Mascota: s.mascota || 'Sin nombre',
      Dueño: s.dueno || 'Sin dueño',
      Servicio: s.tipo_servicio,
      Fecha: new Date(s.hora).toLocaleDateString('es-AR'),
      Hora: new Date(s.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      Estado: s.realizado === 0 ? 'Pendiente' : s.realizado === 1 ? 'En proceso' : 'Listo'
    }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Turnos Peluquería");
    XLSX.writeFile(wb, `Peluqueria_Malfi_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportarPDF = () => {
    if (filtrados.length === 0) return mostrarAviso("No hay datos para exportar", "error");
    const doc = new jsPDF();
    doc.text("Listado de Turnos de Peluquería - Malfi", 14, 15);
    const tablaData = filtrados.map(s => [
      s.mascota || 'Sin nombre',
      s.dueno || 'Sin dueño',
      s.tipo_servicio,
      new Date(s.hora).toLocaleDateString('es-AR') + " " + new Date(s.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      s.realizado === 0 ? 'Pendiente' : s.realizado === 1 ? 'En proceso' : 'Listo'
    ]);
    autoTable(doc, {
      startY: 25,
      head: [['Mascota', 'Dueño', 'Servicio', 'Fecha/Hora', 'Estado']],
      body: tablaData,
      theme: 'grid',
      headStyles: { fillColor: [106, 17, 203] }
    });
    doc.save(`Turnos_Peluqueria_${new Date().toLocaleDateString()}.pdf`);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const [resE, resM] = await Promise.all([
        fetch(`http://localhost:3001/api/estetica?t=${ts}`),
        fetch(`http://localhost:3001/api/mascotas?t=${ts}`)
      ]);
      if (!resE.ok || !resM.ok) throw new Error(`Error al cargar datos`);
      const dataE = await resE.json();
      const dataM = await resM.json();
      setServicios(Array.isArray(dataE) ? dataE : []);
      setMascotas(Array.isArray(dataM) ? dataM : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleGuardarTurno = async (e) => {
    e.preventDefault();
    const fechaMysql = formData.fecha.replace('T', ' ') + ':00';
    let body = { fecha: fechaMysql, tipo: 'estetica', tipo_servicio: formData.tipo_servicio, precio: 0 };
    if (!isNuevaMascota) {
      const mascotaSel = mascotas.find(m => m.id === parseInt(formData.mascota_id));
      body.mascota_id = parseInt(formData.mascota_id);
      body.dueno_id = mascotaSel?.dueno_id;
    } else {
      body.es_nueva_mascota = true;
      body.mascota_nombre = formData.nueva_mascota_nombre.trim();
      body.especie = formData.nueva_mascota_especie;
      body.raza = formData.nueva_mascota_raza.trim();
      body.dueno_nombre = formData.nuevo_dueno_nombre.trim();
      body.dueno_telefono = formData.nuevo_dueno_telefono.trim();
    }
    try {
      const url = datosEdicion ? `http://localhost:3001/api/turnos/${datosEdicion.turno_id}` : 'http://localhost:3001/api/turnos';
      const method = datosEdicion ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false); setDatosEdicion(null); setIsNuevaMascota(false); cargarDatos();
      mostrarAviso(datosEdicion ? "Turno actualizado correctamente" : "¡Turno registrado con éxito!", "success");
    } catch (err) { mostrarAviso("Error al procesar la solicitud", "error"); }
  };

  const handleEditar = (turno) => {
    setDatosEdicion(turno);
    setIsNuevaMascota(false);
    setFormData({
      mascota_id: turno.mascota_id || '',
      tipo_servicio: turno.tipo_servicio || 'Baño y Corte Completo',
      fecha: turno.hora ? turno.hora.substring(0, 16) : new Date().toISOString().slice(0, 16),
      nueva_mascota_nombre: '', nueva_mascota_especie: 'Perro', nueva_mascota_raza: '', nuevo_dueno_nombre: '', nuevo_dueno_telefono: ''
    });
    setShowModal(true);
  };

  const handleEliminarClick = (id, mascota) => {
    setConfirmacion({ show: true, id, nombreMascota: mascota, mensaje: `¿Estás seguro de eliminar permanentemente este turno?` });
  };

  const confirmarEliminar = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/estetica/${confirmacion.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setConfirmacion({ show: false, id: null, mensaje: '', nombreMascota: '' });
      cargarDatos(); mostrarAviso("Registro eliminado correctamente", "success");
    } catch (err) { mostrarAviso("No se pudo eliminar el turno", "error"); }
  };

  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const res = await fetch(`http://localhost:3001/api/estetica/${id}/estado`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realizado: nuevoEstado })
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
      await cargarDatos(); mostrarAviso("Estado actualizado", "success");
    } catch (err) { mostrarAviso("Error al cambiar el estado", "error"); }
  };

  const filtrados = servicios.filter(s =>
    (s.mascota || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.dueno || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const gruposPorFecha = filtrados.reduce((grupos, s) => {
    const d = new Date(s.hora);
    const key = !isNaN(d) ? d.toLocaleDateString('es-AR') : "Sin fecha";
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(s);
    return grupos;
  }, {});

  Object.keys(gruposPorFecha).forEach(key => {
    gruposPorFecha[key].sort((a, b) => new Date(a.hora) - new Date(b.hora));
  });

  const hoyStr = new Date().toLocaleDateString('es-AR');
  const fechasOrdenadas = Object.keys(gruposPorFecha).sort((a, b) => {
    if (a === hoyStr) return -1;
    if (b === hoyStr) return 1;
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    const hoyDate = new Date(new Date().setHours(0, 0, 0, 0));
    if (dateA > hoyDate && dateB <= hoyDate) return -1;
    if (dateA <= hoyDate && dateB > hoyDate) return 1;
    return dateA > hoyDate ? dateA - dateB : dateB - dateA;
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundImage: `url('https://i.pinimg.com/736x/1f/3b/91/1f3b91cfef7387bfbb4659808bcb6d2c.jpg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      position: 'relative',
      padding: '2rem' 
    }}>
      {/* Overlay más transparente para que se note la imagen */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', 
        zIndex: 0
      }} />
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* NOTIFICACIÓN */}
        {notificacion.show && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5000, pointerEvents: 'none' }}>
            <div style={{ background: 'white', color: '#333', padding: '3rem', borderRadius: '40px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'modalPopUp 0.4s ease-out', borderBottom: `10px solid ${notificacion.tipo === 'success' ? '#2ecc71' : '#e74c3c'}`, maxWidth: '450px', width: '90%' }}>
              <div style={{ background: notificacion.tipo === 'success' ? '#2ecc71' : '#e74c3c', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <FontAwesomeIcon icon={notificacion.tipo === 'success' ? faCheck : faTimes} size="3x" />
              </div>
              <h2 style={{ fontWeight: '900', fontSize: '1.8rem', textAlign: 'center', margin: 0 }}>{notificacion.mensaje}</h2>
            </div>
          </div>
        )}

        {/* CONFIRMACIÓN */}
        {confirmacion.show && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, backdropFilter: 'blur(10px)' }}>
            <div style={{ background: 'white', padding: '3rem', borderRadius: '40px', maxWidth: '550px', width: '95%', textAlign: 'center', color: '#333', animation: 'modalPopUp 0.3s ease-out' }}>
              <div style={{ color: '#e74c3c', marginBottom: '1.5rem' }}><FontAwesomeIcon icon={faExclamationTriangle} size="6x" /></div>
              <h2 style={{ marginBottom: '1rem', fontWeight: '900', fontSize: '2.2rem' }}>¿Eliminar Turno?</h2>
              <p style={{ color: '#666', fontSize: '1.3rem', marginBottom: '2.5rem' }}>Estás a punto de borrar el turno de <strong>{confirmacion.nombreMascota}</strong>.<br/>{confirmacion.mensaje}</p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <button onClick={() => setConfirmacion({ show: false, id: null, mensaje: '', nombreMascota: '' })} style={{ flex: 1, padding: '1.3rem', borderRadius: '20px', border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer' }}>CANCELAR</button>
                <button onClick={confirmarEliminar} style={{ flex: 1, padding: '1.3rem', borderRadius: '20px', border: 'none', background: '#e74c3c', color: 'white', fontWeight: '800', fontSize: '1.2rem', cursor: 'pointer', boxShadow: '0 10px 20px rgba(231, 76, 60, 0.3)' }}>ELIMINAR</button>
              </div>
            </div>
          </div>
        )}

        <style>
          {`@keyframes modalPopUp { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .card-estetica:hover { transform: translateY(-10px) scale(1.02); background: rgba(255,255,255,0.9) !important; }`}
        </style>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'white', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}><FontAwesomeIcon icon={faScissors} style={{ marginRight: '0.8rem' }} />Peluquería Canina</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarExcel} style={{ background: '#28a745', color: 'white', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><FontAwesomeIcon icon={faFileExcel} style={{ marginRight: '5px' }} /> Excel</button>
            <button onClick={exportarPDF} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><FontAwesomeIcon icon={faFilePdf} style={{ marginRight: '5px' }} /> PDF</button>
            <button onClick={() => { setDatosEdicion(null); setIsNuevaMascota(false); setShowModal(true); }} style={{ background: '#fff', color: '#2575fc', border: 'none', padding: '0.8rem 1.8rem', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}><FontAwesomeIcon icon={faPlus} style={{ marginRight: '5px' }} /> Nuevo Turno</button>
          </div>
        </header>

        <div style={{ marginBottom: '2rem', maxWidth: '600px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.8)', borderRadius: '50px', overflow: 'hidden', backdropFilter: 'blur(12px)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <span style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center' }}><FontAwesomeIcon icon={faSearch} style={{color: '#333'}} /></span>
            <input type="text" placeholder="Buscar por mascota o dueño..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ flex: 1, padding: '1rem', border: 'none', background: 'transparent', color: '#000', fontWeight: '500', fontSize: '1.1rem', outline: 'none' }} />
          </div>
        </div>

        {!loading && !error && (
          fechasOrdenadas.map(fecha => (
            <div key={fecha} style={{ marginBottom: '3rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', color: '#2575fc', fontWeight: 'bold', padding: '0.6rem 1.5rem', borderRadius: '50px', marginBottom: '1.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.8rem' }} />{fecha === hoyStr ? "HOY" : fecha}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {gruposPorFecha[fecha].map(s => (
                  <div 
                    key={s.id} 
                    onMouseEnter={() => setHoverId(s.id)}
                    onMouseLeave={() => setHoverId(null)}
                    className="card-estetica"
                    style={{ 
                        background: 'rgba(255, 255, 255, 0.75)', 
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        color: '#000', 
                        borderRadius: '25px', 
                        padding: '1.8rem', 
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
                        transition: 'all 0.3s ease',
                        border: '1px solid rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <h5 style={{ margin: 0, color: '#2d0a4e', fontSize: '1.5rem', fontWeight: '800' }}>{s.mascota || 'Sin nombre'}</h5>
                      <span style={{ padding: '0.5rem 1.2rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '900', background: s.realizado === 0 ? '#ffc107' : s.realizado === 1 ? '#007bff' : '#28a745', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{s.realizado === 0 ? 'PENDIENTE' : s.realizado === 1 ? 'EN PROCESO' : 'LISTO'}</span>
                    </div>
                    <p style={{fontSize: '1.1rem', marginBottom: '8px'}}>Dueño: <strong>{s.dueno || 'Sin dueño'}</strong></p>
                    <p style={{ color: '#444', fontWeight: '500', marginBottom: '8px' }}><FontAwesomeIcon icon={faClock} /> {new Date(s.hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p style={{ fontStyle: 'italic', marginBottom: '20px', color: '#4b0082', fontWeight: '700' }}>{s.tipo_servicio}</p>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      {s.realizado === 0 && <button onClick={() => cambiarEstado(s.id, 1)} style={{ flex: 1, background: '#007bff', color: 'white', border: 'none', padding: '12px', borderRadius: '15px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 12px rgba(0,123,255,0.3)' }}><FontAwesomeIcon icon={faPlay} /> INICIAR</button>}
                      {s.realizado === 1 && <button onClick={() => cambiarEstado(s.id, 2)} style={{ flex: 1, background: '#28a745', color: 'white', border: 'none', padding: '12px', borderRadius: '15px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 12px rgba(40,167,69,0.3)' }}><FontAwesomeIcon icon={faCheckCircle} /> FINALIZAR</button>}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', borderTop: '2px solid rgba(0,0,0,0.05)', paddingTop: '15px' }}>
                      <button onClick={() => handleEditar(s)} style={{ flex: 1, background: '#ffc107', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}><FontAwesomeIcon icon={faEdit} /> Editar</button>
                      <button onClick={() => handleEliminarClick(s.id, s.mascota)} style={{ flex: 1, background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}><FontAwesomeIcon icon={faTrash} /> Borrar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '30px', width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', animation: 'modalPopUp 0.3s ease-out' }}>
              <div style={{ background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800' }}>{datosEdicion ? '📝 Editar Turno' : '📅 Nuevo Turno'}</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}><FontAwesomeIcon icon={faTimes} /></button>
              </div>
              <form onSubmit={handleGuardarTurno} style={{ padding: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', fontWeight: '700', color: '#444' }}><FontAwesomeIcon icon={faPaw} style={{ color: '#2575fc' }} /> Mascota</label>
                  <select value={isNuevaMascota ? 'nueva' : formData.mascota_id} onChange={(e) => { if (e.target.value === 'nueva') { setIsNuevaMascota(true); setFormData({ ...formData, mascota_id: '' }); } else { setIsNuevaMascota(false); setFormData({ ...formData, mascota_id: e.target.value }); } }} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid #e2e8f0', background: '#fff', fontSize: '1rem' }} required>
                    <option value="">Seleccione una mascota...</option>
                    {mascotas.map(m => (<option key={m.id} value={m.id}>{m.nombre} (Dueño: {m.dueno_nombre})</option>))}
                    <option value="nueva" style={{ fontWeight: 'bold', color: '#2575fc' }}>+ REGISTRAR NUEVO CLIENTE</option>
                  </select>
                </div>
                {isNuevaMascota && (
                  <div style={{ background: '#f8f4ff', padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem', border: '2px solid #e2e8f0' }}>
                    <h5 style={{ margin: '0 0 1.2rem 0', color: '#6a11cb', fontWeight: '800' }}><FontAwesomeIcon icon={faUser} /> Datos del Nuevo Cliente</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                      <input placeholder="Nombre Mascota *" value={formData.nueva_mascota_nombre} onChange={e => setFormData({ ...formData, nueva_mascota_nombre: e.target.value })} style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} required={isNuevaMascota} />
                      <select value={formData.nueva_mascota_especie} onChange={e => setFormData({ ...formData, nueva_mascota_especie: e.target.value })} style={{ padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}><option value="Perro">Perro</option><option value="Gato">Gato</option></select>
                    </div>
                    <input placeholder="Nombre del Dueño *" value={formData.nuevo_dueno_nombre} onChange={e => setFormData({ ...formData, nuevo_dueno_nombre: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '15px' }} required={isNuevaMascota} />
                    <input placeholder="Teléfono" value={formData.nuevo_dueno_telefono} onChange={e => setFormData({ ...formData, nuevo_dueno_telefono: e.target.value })} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                  </div>
                )}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', fontWeight: '700', color: '#444' }}><FontAwesomeIcon icon={faTag} style={{ color: '#2575fc' }} /> Servicio</label>
                  <select value={formData.tipo_servicio} onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid #e2e8f0', background: '#fff' }}>
                    {opcionesServicios.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.8rem', fontWeight: '700', color: '#444' }}><FontAwesomeIcon icon={faCalendarAlt} style={{ color: '#2575fc' }} /> Fecha y Hora</label>
                  <input type="datetime-local" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} style={{ width: '100%', padding: '1rem', borderRadius: '15px', border: '2px solid #e2e8f0', background: '#fff' }} required />
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '1rem', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
                  <button type="submit" style={{ flex: 2, padding: '1rem', background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 117, 252, 0.4)' }}>{datosEdicion ? 'GUARDAR CAMBIOS' : 'CONFIRMAR TURNO'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EsteticaPage;