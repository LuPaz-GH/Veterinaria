import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUser, faPaw, faPlus, faEdit, faTrash, faSearch, 
  faIdCard, faPhoneAlt, faMapMarkerAlt, faChevronRight, faUserPlus, faInfoCircle, faSpinner, faTimes, faArrowRight,
  faThLarge, faList, faPrint, faChevronLeft, faDog, faPlusCircle, faSave, faArrowLeft, faTrashRestore, faHistory,
  faFilePdf, faFileExcel // Nuevos íconos
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal'; 
import api from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ClientesPage = () => {
  const [duenos, setDuenos] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [eliminados, setEliminados] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [vistaCards, setVistaCards] = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const clientesPorPagina = 6;

  const [showDuenoModal, setShowDuenoModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDetalle, setShowDetalle] = useState(false);
  const [showPapelera, setShowPapelera] = useState(false); 
  const [showNuevaMascotaForm, setShowNuevaMascotaForm] = useState(false);

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [itemEliminar, setItemEliminar] = useState({ id: null, tipo: '' });
  const [datosEdicion, setDatosEdicion] = useState(null);

  const [formDueno, setFormDueno] = useState({ nombre: '', dni: '', telefono: '', direccion: '' });
  const [listaMascotasAlta, setListaMascotasAlta] = useState([{ nombre: '', especie: 'Perro', raza: '' }]);
  const [nuevaMascotaExtra, setNuevaMascotaExtra] = useState({ nombre: '', especie: 'Perro', raza: '' });

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resD, resM] = await Promise.all([api.get('/duenos'), api.get('/mascotas')]);
      setDuenos(Array.isArray(resD.data) ? resD.data : []);
      setMascotas(Array.isArray(resM.data) ? resM.data : []);
    } catch (err) { console.error("Error cargando datos:", err); } 
    finally { setLoading(false); }
  };

  const cargarPapelera = async () => {
    try {
      const [resD, resM] = await Promise.all([
        api.get('/duenos/papelera'),
        api.get('/mascotas/papelera')
      ]);
      const d = (resD.data || []).map(item => ({ ...item, tipoPapelera: 'dueño' }));
      const m = (resM.data || []).map(item => ({ ...item, tipoPapelera: 'mascota' }));
      setEliminados([...d, ...m]);
    } catch (err) { console.error("Error al cargar papelera"); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const restaurarItem = async (id, tipo) => {
    try {
      const url = tipo === 'dueño' ? `/duenos/restaurar/${id}` : `/mascotas/restaurar/${id}`;
      await api.put(url);
      cargarDatos();
      cargarPapelera();
    } catch (err) { alert("No se pudo restaurar."); }
  };

  const agregarCampoMascota = () => {
    setListaMascotasAlta([...listaMascotasAlta, { nombre: '', especie: 'Perro', raza: '' }]);
  };

  const quitarCampoMascota = (index) => {
    if (listaMascotasAlta.length > 1) {
      setListaMascotasAlta(listaMascotasAlta.filter((_, i) => i !== index));
    }
  };

  const actualizarMascotaAlta = (index, campo, valor) => {
    const nuevaLista = [...listaMascotasAlta];
    nuevaLista[index][campo] = valor;
    setListaMascotasAlta(nuevaLista);
  };

  const handleAgregarMascotaFicha = async (e) => {
    e.preventDefault();
    if (!nuevaMascotaExtra.nombre) return alert("El nombre es obligatorio.");
    try {
      await api.post('/mascotas', { ...nuevaMascotaExtra, dueno_id: clienteSeleccionado.id });
      setNuevaMascotaExtra({ nombre: '', especie: 'Perro', raza: '' });
      setShowNuevaMascotaForm(false);
      cargarDatos();
    } catch (err) { alert("Error al agregar mascota"); }
  };

  const handleGuardarAltaUnificada = async (e) => {
    e.preventDefault();
    if (!formDueno.nombre || !formDueno.dni || !formDueno.telefono || !formDueno.direccion) {
        alert("Todos los campos son obligatorios.");
        return;
    }
    const mascotasValidas = listaMascotasAlta.filter(m => m.nombre.trim() !== "");
    if (!datosEdicion && mascotasValidas.length === 0) {
        alert("Debes registrar al menos una mascota.");
        return;
    }
    try {
      if (datosEdicion) {
        await api.put(`/duenos/${datosEdicion.id}`, formDueno);
      } else {
        const resD = await api.post('/duenos', formDueno);
        const nuevoDuenoId = resD.data.id;
        await Promise.all(mascotasValidas.map(m => api.post('/mascotas', { ...m, dueno_id: nuevoDuenoId })));
      }
      setShowDuenoModal(false);
      cargarDatos();
    } catch (err) { 
        if (err.response && err.response.status === 409) {
            alert("⚠️ Atención: Ya existe un cliente registrado con ese DNI o Nombre.");
        } else {
            alert("Error al procesar el registro."); 
        }
    }
  };

  const confirmarEliminar = async () => {
    try {
      const url = itemEliminar.tipo === 'dueno' ? `/duenos/${itemEliminar.id}` : `/mascotas/${itemEliminar.id}`;
      await api.delete(url);
      setShowConfirm(false);
      if (itemEliminar.tipo === 'dueno') setShowDetalle(false);
      cargarDatos();
    } catch (err) { alert("Error al eliminar."); }
  };

  // =============================================
  // FUNCIONES DE EXPORTACIÓN
  // =============================================
  const exportarExcel = () => {
    const dataExcel = filtrados.map(c => ({
      Dueño: c.nombre,
      DNI: c.dni,
      Teléfono: c.telefono,
      Dirección: c.direccion,
      Mascotas: c.mascotasAsociadas.map(m => m.nombre).join(', ')
    }));
    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Listado_Clientes_Malfi.xlsx");
  };

  const exportarPDFGeneral = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Listado de Clientes - Malfi Veterinaria", 14, 20);
    const columns = ["Dueño", "DNI", "Teléfono", "Mascotas"];
    const rows = filtrados.map(c => [
      c.nombre,
      c.dni,
      c.telefono,
      c.mascotasAsociadas.map(m => m.nombre).join(', ')
    ]);
    autoTable(doc, { head: [columns], body: rows, startY: 30 });
    doc.save("Clientes_Malfi.pdf");
  };

  const exportarComprobanteCliente = (cliente) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
    doc.setFillColor(106, 17, 203); doc.rect(0, 0, 80, 25, 'F');
    doc.setTextColor(255); doc.text("MALFI VETERINARIA", 40, 12, { align: "center" });
    doc.save(`Ficha_${cliente.nombre}.pdf`);
  };

  const clientesUnificados = duenos.map(d => ({
    ...d,
    mascotasAsociadas: mascotas.filter(m => m.dueno_id === d.id)
  }));

  const filtrados = clientesUnificados.filter(c => {
    const term = busqueda.toLowerCase();
    return (c.nombre || "").toLowerCase().includes(term) || (c.dni || "").toString().includes(term) || c.mascotasAsociadas.some(m => (m.nombre || "").toLowerCase().includes(term));
  });

  const totalPaginas = Math.ceil(filtrados.length / clientesPorPagina);
  const clientesPaginados = filtrados.slice((paginaActual - 1) * clientesPorPagina, paginaActual * clientesPorPagina);

  return (
    <div className="min-vh-100 p-4" style={{ backgroundImage: `url('https://i.pinimg.com/1200x/66/e6/e4/66e6e4b662ecc5582f38e8b465a251fb.jpg')`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' }}>
      <div style={{ maxWidth: '1250px', margin: '0 auto' }}>
        
        <header className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
          <h1 className="text-white fw-black display-4 mb-0" style={{ textShadow: '0 10px 20px rgba(0,0,0,0.4)', letterSpacing: '-2px' }}>Clientes <span style={{ color: '#ff69b4' }}>&</span> Pacientes</h1>
          
          <div className="d-flex gap-2 align-items-center">
              {/* BOTONES DE EXPORTACIÓN AGREGADOS */}
              <button className="btn btn-danger rounded-pill px-3 fw-bold shadow-lg text-white" onClick={exportarPDFGeneral} title="Exportar a PDF">
                <FontAwesomeIcon icon={faFilePdf} className="me-1" /> PDF
              </button>
              <button className="btn btn-success rounded-pill px-3 fw-bold shadow-lg text-white" onClick={exportarExcel} title="Exportar a Excel">
                <FontAwesomeIcon icon={faFileExcel} className="me-1" /> EXCEL
              </button>

              <button className="btn btn-warning rounded-pill px-3 fw-bold shadow-lg text-white" onClick={() => { cargarPapelera(); setShowPapelera(true); }} style={{ border: '2px solid rgba(255,255,255,0.4)' }}>
                <FontAwesomeIcon icon={faTrash} className="me-1" /> PAPELERA
              </button>

              <div className="bg-white bg-opacity-20 p-1 rounded-pill d-flex shadow-lg" style={{ backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <button className={`btn rounded-pill px-3 py-2 ${vistaCards ? 'bg-white text-primary shadow-sm' : 'text-white border-0'}`} onClick={() => {setVistaCards(true); setPaginaActual(1);}}><FontAwesomeIcon icon={faThLarge} /></button>
                <button className={`btn rounded-pill px-3 py-2 ${!vistaCards ? 'bg-white text-primary shadow-sm' : 'text-white border-0'}`} onClick={() => {setVistaCards(false); setPaginaActual(1);}}><FontAwesomeIcon icon={faList} /></button>
              </div>

              <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-lg" onClick={() => { setDatosEdicion(null); setFormDueno({nombre:'', dni:'', telefono:'', direccion:''}); setListaMascotasAlta([{ nombre: '', especie: 'Perro', raza: '' }]); setShowDuenoModal(true); }}>
                <FontAwesomeIcon icon={faUserPlus} className="me-2" /> NUEVO REGISTRO
              </button>
          </div>
        </header>

        <div className="mb-5 d-flex justify-content-center">
            <div className="input-group shadow-lg rounded-pill overflow-hidden border-0" style={{ maxWidth: '500px', background: 'white' }}>
                <span className="input-group-text bg-white border-0 ps-4 text-primary"><FontAwesomeIcon icon={faSearch} /></span>
                <input type="text" className="form-control border-0 py-3 bg-white text-dark" placeholder="Buscar..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }} />
            </div>
        </div>

        {loading ? <div className="text-center py-5"><FontAwesomeIcon icon={faSpinner} spin size="4x" color="white" /></div> : (
          <>
            {vistaCards ? (
              <div className="row g-4">
                  {clientesPaginados.map(cliente => (
                    <div className="col-md-6 col-lg-4" key={cliente.id}>
                        <div className="card border-0 shadow-lg p-3 rounded-4 bg-white bg-opacity-95" style={{ minHeight: '260px', cursor: 'pointer' }} onClick={() => { setClienteSeleccionado(cliente); setShowDetalle(true); setShowNuevaMascotaForm(false); }}>
                            <div className="card-body p-0 d-flex flex-column text-dark">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <div className="d-flex align-items-center">
                                        <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '50px', height: '50px', background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', color: 'white' }}><FontAwesomeIcon icon={faUser} /></div>
                                        <div className="ms-3"><h5 className="fw-bold mb-0">{cliente.nombre}</h5><span className="small text-muted">DNI: {cliente.dni}</span></div>
                                    </div>
                                    <button className="btn btn-sm text-primary" onClick={(e) => { e.stopPropagation(); exportarComprobanteCliente(cliente); }}><FontAwesomeIcon icon={faPrint}/></button>
                                </div>
                                <div className="mb-3"><div className="d-flex flex-wrap gap-2">{cliente.mascotasAsociadas.map(m => (<div key={m.id} className="bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-pill small fw-bold"><FontAwesomeIcon icon={faPaw} className="me-2" />{m.nombre}</div>))}</div></div>
                                <div className="mt-auto d-flex justify-content-between align-items-center pt-3 border-top">
                                    <div className="small fw-bold text-primary">VER FICHA <FontAwesomeIcon icon={faArrowRight} /></div>
                                    <div className="d-flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button className="btn btn-sm btn-light rounded-circle shadow-sm" onClick={() => { setDatosEdicion(cliente); setFormDueno(cliente); setShowDuenoModal(true); }}><FontAwesomeIcon icon={faEdit} className="text-primary" /></button>
                                        <button className="btn btn-sm btn-light rounded-circle shadow-sm" onClick={() => { setItemEliminar({id: cliente.id, tipo: 'dueno'}); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} className="text-danger" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ))}
              </div>
            ) : (
                <div className="card border-0 shadow-xl rounded-4 overflow-hidden bg-white">
                    <table className="table table-hover align-middle mb-0 text-dark">
                        <thead className="table-dark">
                            <tr><th className="ps-4">Dueño</th><th>Pacientes</th><th>Teléfono</th><th className="text-end pe-4">Acciones</th></tr>
                        </thead>
                        <tbody>
                            {clientesPaginados.map(c => (
                                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => { setClienteSeleccionado(c); setShowDetalle(true); }}>
                                    <td className="ps-4 py-3"><div className="fw-bold">{c.nombre}</div><small className="text-muted">{c.dni}</small></td>
                                    <td>{c.mascotasAsociadas.map(m => <span key={m.id} className="badge bg-primary bg-opacity-10 text-primary me-1 px-2 py-1">{m.nombre}</span>)}</td>
                                    <td>{c.telefono}</td>
                                    <td className="text-end pe-4" onClick={e => e.stopPropagation()}>
                                        <button className="btn btn-sm text-primary me-2" onClick={() => { setDatosEdicion(c); setFormDueno(c); setShowDuenoModal(true); }}><FontAwesomeIcon icon={faEdit}/></button>
                                        <button className="btn btn-sm text-danger" onClick={() => { setItemEliminar({id: c.id, tipo: 'dueno'}); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PAGINACIÓN */}
            {totalPaginas > 1 && (
                <div className="d-flex justify-content-center mt-5 gap-2 pb-5">
                    <button className="btn btn-light rounded-pill px-4 shadow-sm fw-bold" disabled={paginaActual === 1} onClick={() => setPaginaActual(paginaActual - 1)}>
                        <FontAwesomeIcon icon={faChevronLeft} className="me-2" /> Anterior
                    </button>
                    {[...Array(totalPaginas)].map((_, i) => (
                        <button key={i} className={`btn rounded-circle shadow-sm fw-bold ${paginaActual === i+1 ? 'btn-primary' : 'btn-light'}`} style={{width:'45px', height:'45px'}} onClick={() => setPaginaActual(i+1)}>
                            {i+1}
                        </button>
                    ))}
                    <button className="btn btn-light rounded-pill px-4 shadow-sm fw-bold" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(paginaActual + 1)}>
                        Siguiente <FontAwesomeIcon icon={faChevronRight} className="ms-2" />
                    </button>
                </div>
            )}
          </>
        )}

        {/* MODAL PAPELERA */}
        {showPapelera && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1200 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content border-0 shadow-2xl bg-white" style={{ borderRadius: '40px', overflow: 'hidden' }}>
                        <div className="p-4 bg-danger text-white text-center">
                            <h3 className="fw-black mb-0 text-uppercase"><FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Reciclaje</h3>
                        </div>
                        <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className="table table-hover align-middle text-dark">
                                <thead className="bg-light"><tr><th>Nombre</th><th>Tipo</th><th className="text-center">Borrado por</th><th>Fecha</th><th className="text-center">Restaurar</th></tr></thead>
                                <tbody>
                                    {eliminados.length === 0 ? <tr><td colSpan="5" className="text-center py-5 text-muted small">La papelera está vacía</td></tr> : eliminados.map(e => (
                                        <tr key={`${e.tipoPapelera}-${e.id}`}>
                                            <td><div className="fw-bold">{e.nombre}</div><small className="text-muted">{e.dni ? `DNI: ${e.dni}` : e.raza}</small></td>
                                            <td><span className={`badge ${e.tipoPapelera === 'dueño' ? 'bg-primary' : 'bg-info'}`}>{e.tipoPapelera.toUpperCase()}</span></td>
                                            <td className="text-center"><span className="badge bg-light text-dark border">{e.responsable_borrado || 'Sistema'}</span></td>
                                            <td><small>{new Date(e.fecha_borrado).toLocaleString('es-AR')}</small></td>
                                            <td className="text-center"><button className="btn btn-success rounded-circle shadow-sm" style={{width:'40px', height:'40px'}} onClick={() => restaurarItem(e.id, e.tipoPapelera)}><FontAwesomeIcon icon={faTrashRestore} /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer justify-content-center border-0 pb-4 bg-white">
                            <button className="btn text-white px-5 py-2 fw-bold" style={{ backgroundColor: '#2C3E50', borderRadius: '25px' }} onClick={() => setShowPapelera(false)}>CERRAR</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DETALLE */}
        {showDetalle && clienteSeleccionado && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1050 }}>
                <div className="modal-dialog modal-xl modal-dialog-centered">
                    <div className="modal-content border-0 rounded-5 shadow-2xl overflow-hidden bg-white">
                        <div className="row g-0">
                            <div className="col-md-4 p-5 text-white d-flex flex-column justify-content-between" style={{ background: 'linear-gradient(180deg, #6a11cb 0%, #2575fc 100%)' }}>
                                <div>
                                    <div className="text-center mb-4"><div className="bg-white rounded-circle d-inline-flex p-4 shadow-lg mb-3 text-primary"><FontAwesomeIcon icon={faUser} size="4x" /></div><h2 className="fw-black">{clienteSeleccionado.nombre}</h2></div>
                                    <div className="mt-4"><p className="bg-black bg-opacity-20 p-3 rounded-4 mb-2 d-flex align-items-center"><FontAwesomeIcon icon={faIdCard} className="me-3"/> DNI: {clienteSeleccionado.dni}</p><p className="bg-black bg-opacity-20 p-3 rounded-4 mb-2 d-flex align-items-center"><FontAwesomeIcon icon={faPhoneAlt} className="me-3"/> {clienteSeleccionado.telefono}</p><p className="bg-black bg-opacity-20 p-3 rounded-4 mb-4 d-flex align-items-center"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-3"/> Dir: {clienteSeleccionado.direccion}</p></div>
                                </div>
                                <button className="btn rounded-pill shadow-lg border-0 d-flex align-items-center justify-content-center transition-all fw-bold py-3 text-white" onClick={() => setShowDetalle(false)} style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" /> VOLVER AL LISTADO
                                </button>
                            </div>
                            <div className="col-md-8 p-5 bg-white text-dark">
                                <div className="d-flex justify-content-between align-items-center mb-4"><h3 className="fw-black text-primary mb-0">PACIENTES ASOCIADOS</h3><button className="btn btn-success rounded-pill px-4 shadow-sm fw-bold" onClick={() => setShowNuevaMascotaForm(true)}>+ AGREGAR MASCOTA</button></div>
                                {showNuevaMascotaForm && (
                                    <div className="p-4 rounded-4 mb-4 bg-light border-start border-5 border-success">
                                        <div className="row g-2">
                                            <div className="col-md-4"><input type="text" className="form-control" placeholder="Nombre" value={nuevaMascotaExtra.nombre} onChange={e => setNuevaMascotaExtra({...nuevaMascotaExtra, nombre: e.target.value})} /></div>
                                            <div className="col-md-3"><select className="form-select" value={nuevaMascotaExtra.especie} onChange={e => setNuevaMascotaExtra({...nuevaMascotaExtra, especie: e.target.value})}><option value="Perro">Perro 🐶</option><option value="Gato">Gato 🐱</option><option value="Otro">Otro 🐾</option></select></div>
                                            <div className="col-md-3"><input type="text" className="form-control" placeholder="Raza" value={nuevaMascotaExtra.raza} onChange={e => setNuevaMascotaExtra({...nuevaMascotaExtra, raza: e.target.value})} /></div>
                                            <div className="col-md-2"><button className="btn btn-success w-100 h-100" onClick={handleAgregarMascotaFicha}><FontAwesomeIcon icon={faSave}/></button></div>
                                        </div>
                                    </div>
                                )}
                                <div className="row g-3 overflow-auto" style={{ maxHeight: '450px' }}>
                                    {mascotas.filter(m => m.dueno_id === clienteSeleccionado.id).map(m => (
                                        <div key={m.id} className="col-md-6">
                                            <div className="card border-0 shadow-sm rounded-4 p-4 bg-light border-start border-5 border-info h-100">
                                                <div className="d-flex justify-content-between align-items-start mb-3"><div className="bg-info bg-opacity-10 p-3 rounded-4 text-info"><FontAwesomeIcon icon={faPaw} size="2x" /></div><button className="btn btn-light rounded-circle shadow-sm" onClick={() => { setItemEliminar({id: m.id, tipo: 'mascota'}); setShowConfirm(true); }}><FontAwesomeIcon icon={faTrash} className="text-danger"/></button></div>
                                                <h4 className="fw-bold mb-1">{m.nombre}</h4>
                                                <div className="text-muted fw-bold small text-uppercase">{m.especie} • {m.raza || 'Mestizo'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL REGISTRO */}
        {showDuenoModal && (
            <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100 }}>
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <form className="modal-content rounded-5 border-0 shadow-2xl bg-white overflow-hidden text-dark" onSubmit={handleGuardarAltaUnificada}>
                        <div className="p-4 text-center text-white" style={{ background: 'linear-gradient(45deg, #6a11cb, #2575fc)' }}><h3 className="fw-black mb-0">REGISTRO DE CLIENTE</h3></div>
                        <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <h6 className="text-primary fw-bold mb-3 border-bottom pb-2">DATOS DEL RESPONSABLE</h6>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6"><label className="small fw-bold text-muted">Nombre Completo *</label><input type="text" className="form-control rounded-4 shadow-sm" value={formDueno.nombre} onChange={e => setFormDueno({...formDueno, nombre: e.target.value})} required /></div>
                                <div className="col-md-6"><label className="small fw-bold text-muted">Documento (DNI) *</label><input type="text" className="form-control rounded-4 shadow-sm" value={formDueno.dni} onChange={e => setFormDueno({...formDueno, dni: e.target.value})} required /></div>
                                <div className="col-md-6"><label className="small fw-bold text-muted">Teléfono *</label><input type="text" className="form-control rounded-4 shadow-sm" value={formDueno.telefono} onChange={e => setFormDueno({...formDueno, telefono: e.target.value})} required /></div>
                                <div className="col-md-6"><label className="small fw-bold text-muted">Dirección *</label><input type="text" className="form-control rounded-4 shadow-sm" value={formDueno.direccion} onChange={e => setFormDueno({...formDueno, direccion: e.target.value})} required /></div>
                            </div>
                            {!datosEdicion && (
                                <>
                                    <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2"><h6>PACIENTES *</h6><button type="button" className="btn btn-sm btn-outline-info rounded-pill px-3 fw-bold" onClick={agregarCampoMascota}><FontAwesomeIcon icon={faPlusCircle} /> Agregar otra</button></div>
                                    {listaMascotasAlta.map((m, index) => (
                                        <div key={index} className="p-3 rounded-4 mb-3 border bg-light">
                                            <div className="row g-2">
                                                <div className="col-md-4"><label className="x-small fw-bold">NOMBRE *</label><input type="text" className="form-control" value={m.nombre} onChange={e => actualizarMascotaAlta(index, 'nombre', e.target.value)} required /></div>
                                                <div className="col-md-4"><label className="x-small fw-bold">ESPECIE</label><select className="form-select" value={m.especie} onChange={e => actualizarMascotaAlta(index, 'especie', e.target.value)}><option value="Perro">Perro 🐶</option><option value="Gato">Gato 🐱</option><option value="Otro">Otro 🐾</option></select></div>
                                                <div className="col-md-4"><label className="x-small fw-bold">RAZA</label><div className="d-flex gap-2"><input type="text" className="form-control" value={m.raza} onChange={e => actualizarMascotaAlta(index, 'raza', e.target.value)} />{listaMascotasAlta.length > 1 && <button type="button" className="btn btn-outline-danger btn-sm border-0" onClick={() => quitarCampoMascota(index)}><FontAwesomeIcon icon={faTimes}/></button>}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                        <div className="p-4 bg-light d-flex gap-3"><button type="button" className="btn btn-white w-100 rounded-pill border" onClick={() => setShowDuenoModal(false)}>CANCELAR</button><button type="submit" className="btn btn-success w-100 rounded-pill py-3 fw-bold text-white shadow-sm">FINALIZAR REGISTRO</button></div>
                    </form>
                </div>
            </div>
        )}

        <ConfirmModal show={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmarEliminar} title="¿ESTÁS SEGURO?" message="Esta acción moverá el registro a la papelera." />
      </div>
    </div>
  );
};

export default ClientesPage;