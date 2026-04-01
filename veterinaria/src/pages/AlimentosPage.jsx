import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faBowlFood, faPlus, faEdit, faTrash, faSearch, faFilePdf, 
    faFileExcel, faInfoCircle, faDollarSign, faBox, faUserEdit, 
    faArrowLeft, faArrowRight, faTrashAlt, faHistory, faTrashRestore 
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../component/ConfirmModal';
import ProductoModal from '../component/ProductoModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

const AlimentosPage = () => {
    const [alimentos, setAlimentos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [datosEdicion, setDatosEdicion] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [idToDelete, setIdToDelete] = useState(null);
    const [showDetalle, setShowDetalle] = useState(false);
    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [limite] = useState(12);
    const [loading, setLoading] = useState(false);

    const [showPapelera, setShowPapelera] = useState(false);
    const [alimentosEliminados, setAlimentosEliminados] = useState([]);

    // FUNCIÓN DE CARGA Y BÚSQUEDA GLOBAL COMBINADA
    const cargarAlimentos = useCallback(async () => {
        setLoading(true);
        try {
            let res;
            if (busqueda.trim() !== '') {
                // Si hay texto, buscamos en todo el inventario
                res = await api.get(`/productos/buscar?q=${busqueda}&categoria=alimentos`);
                const data = res.data.productos || res.data || [];
                // Filtramos por categoría por si el backend devuelve todo
                setAlimentos(Array.isArray(data) ? data.filter(p => p.categoria === 'alimentos') : []);
            } else {
                // Si está vacío, paginación normal
                res = await api.get(`/productos/alimentos?pagina=${pagina}&limite=${limite}`);
                const data = res.data.productos || res.data || [];
                setAlimentos(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('❌ Error al cargar alimentos:', err);
            setAlimentos([]);
        } finally {
            setLoading(false);
        }
    }, [pagina, busqueda, limite]);

    // EFECTO CON DEBOUNCE PARA NO SATURAR EL SERVER
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            cargarAlimentos();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [cargarAlimentos]);

    const cargarPapelera = async () => {
        try {
            const res = await api.get('/productos/papelera/alimentos');
            setAlimentosEliminados(res.data);
        } catch (err) {
            console.error('❌ Error al cargar papelera:', err);
        }
    };

    const restaurarAlimento = async (id) => {
        try {
            await api.put(`/productos/restaurar/${id}`);
            cargarPapelera();
            cargarAlimentos();
        } catch (err) {
            console.error('❌ Error al restaurar:', err);
            alert('Error al restaurar el producto');
        }
    };

    const exportarExcel = () => {
        const ws = XLSX.utils.json_to_sheet(alimentos.map(a => ({
            Nombre: a.nombre,
            Precio: a.precio_venta,
            Stock: a.stock,
            Vencimiento: a.vencimiento_alimento ? new Date(a.vencimiento_alimento).toLocaleDateString() : 'N/A'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Alimentos");
        XLSX.writeFile(wb, "Stock_Alimentos_Malfi.xlsx");
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text("Inventario de Alimentos - Malfi", 14, 20);
        autoTable(doc, {
            startY: 30,
            head: [['Nombre', 'Precio', 'Stock', 'Vencimiento']],
            body: alimentos.map(a => [
                a.nombre,
                `$${a.precio_venta}`,
                a.stock,
                a.vencimiento_alimento ? new Date(a.vencimiento_alimento).toLocaleDateString() : 'N/A'
            ]),
            headStyles: { fillColor: [40, 167, 69] }
        });
        doc.save("Stock_Alimentos_Malfi.pdf");
    };

    const verificarVencimiento = (fecha) => {
        if (!fecha) return { texto: '', clase: '', vencido: false };
        const hoy = new Date();
        const fVenc = new Date(fecha);
        if (fVenc < hoy) return { texto: 'VENCIDO', clase: 'bg-danger text-white', vencido: true };
        if ((fVenc - hoy) / (1000 * 60 * 60 * 24) <= 30) return { texto: 'VENCE PRONTO', clase: 'bg-warning text-dark', vencido: false };
        return { texto: '', clase: '', vencido: false };
    };

    return (
        <div className="container-fluid min-vh-100 p-4 position-relative" style={{
            backgroundImage: `url('https://i.pinimg.com/736x/48/93/4a/48934a256d6b89731eb45e6808a6a4a5.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
        }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 0 }} />
            <div className="position-relative" style={{ zIndex: 1 }}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                    <h1 className="text-white fw-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.6)' }}>
                        <FontAwesomeIcon icon={faBowlFood} className="me-2" /> Alimentos
                    </h1>
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-danger rounded-pill px-3 shadow-sm" 
                            onClick={() => { cargarPapelera(); setShowPapelera(true); }}
                        >
                            <FontAwesomeIcon icon={faTrashAlt} className="me-2" /> Papelera
                        </button>
                        <button className="btn btn-danger rounded-pill px-3 shadow-sm" onClick={exportarPDF}>
                            <FontAwesomeIcon icon={faFilePdf} />
                        </button>
                        <button className="btn btn-success rounded-pill px-3 shadow-sm" onClick={exportarExcel}>
                            <FontAwesomeIcon icon={faFileExcel} />
                        </button>
                        <button className="btn btn-light rounded-pill px-3 fw-bold shadow-sm" onClick={() => {
                            setDatosEdicion(null);
                            setShowModal(true);
                        }}>+ Nuevo</button>
                    </div>
                </div>
                <div className="row justify-content-center mb-5">
                    <div className="col-md-6 col-lg-5">
                        <div className="input-group shadow-sm rounded-pill overflow-hidden bg-white border-0">
                            <span className="input-group-text bg-white border-0 ps-3">
                                <FontAwesomeIcon icon={faSearch} className="text-muted" />
                            </span>
                            <input
                                type="text"
                                className="form-control border-0 py-2 ps-1"
                                placeholder="Buscar en todo el stock de alimentos..."
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center text-white py-5">
                        <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="mt-2">Buscando...</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {alimentos.length > 0 ? (
                            alimentos.map(a => {
                                const infoVenc = verificarVencimiento(a.vencimiento_alimento);
                                return (
                                    <div className="col-md-4 col-lg-3" key={a.id}>
                                        <div
                                            className={`card border-0 shadow-sm p-3 rounded-4 h-100 transition-card ${infoVenc.vencido ? 'opacity-75' : ''}`}
                                            style={{
                                                cursor: 'pointer',
                                                background: 'rgba(255, 255, 255, 0.75)',
                                                backdropFilter: 'blur(10px)',
                                                WebkitBackdropFilter: 'blur(10px)'
                                            }}
                                            onClick={() => {
                                                setItemSeleccionado(a);
                                                setShowDetalle(true);
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start mb-1">
                                                <h6 className="fw-bold">{a.nombre}</h6>
                                                {infoVenc.texto && (
                                                    <span className={`badge ${infoVenc.clase} x-small`}>{infoVenc.texto}</span>
                                                )}
                                            </div>
                                            <p className="text-success fw-bold mb-1">${a.precio_venta}</p>
                                            <div className="d-flex justify-content-between align-items-center mt-auto">
                                                <span className={`badge ${a.stock <= 5 ? 'bg-warning text-dark' : 'bg-success'} px-3 py-2 rounded-pill`}>
                                                    Stock: {a.stock}
                                                </span>
                                                <div className="d-flex gap-1">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-circle"
                                                        style={{ backgroundColor: 'white' }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setDatosEdicion(a);
                                                            setShowModal(true);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger rounded-circle"
                                                        style={{ backgroundColor: 'white' }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setIdToDelete(a.id);
                                                            setShowConfirm(true);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-12 text-center text-white py-5">
                                <h3>No se encontraron resultados</h3>
                            </div>
                        )}
                    </div>
                )}

                {/* PAGINACIÓN: Solo visible si no se está buscando */}
                {busqueda.trim() === '' && (
                    <div className="d-flex justify-content-center align-items-center gap-3 mt-5 pb-4">
                        <button
                            className="btn btn-light rounded-circle shadow-sm"
                            disabled={pagina === 1}
                            onClick={() => setPagina(pagina - 1)}
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                        <span className="badge bg-white text-dark px-3 py-2 rounded-pill shadow-sm fw-bold">
                            Página {pagina}
                        </span>
                        <button
                            className="btn btn-light rounded-circle shadow-sm"
                            disabled={alimentos.length < limite}
                            onClick={() => setPagina(pagina + 1)}
                        >
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                    </div>
                )}
            </div>

            {/* MODAL PAPELERA */}
            {showPapelera && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1070 }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-0">
                            <div className="modal-header bg-danger text-white rounded-top-4 p-3">
                                <h5 className="modal-title fw-bold">
                                    <FontAwesomeIcon icon={faHistory} className="me-2" /> Papelera de Alimentos
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPapelera(false)}></button>
                            </div>
                            <div className="modal-body p-0">
                                <div className="table-responsive" style={{ maxHeight: '450px' }}>
                                    <table className="table table-hover mb-0">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Precio</th>
                                                <th>Borrado por</th>
                                                <th>Fecha</th>
                                                <th className="text-center">Restaurar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {alimentosEliminados.length > 0 ? (
                                                alimentosEliminados.map(ali => (
                                                    <tr key={ali.id}>
                                                        <td>
                                                            <div className="fw-bold">{ali.nombre}</div>
                                                            <small className="text-muted text-uppercase" style={{ fontSize: '10px' }}>Stock: {ali.stock}</small>
                                                        </td>
                                                        <td className="text-success fw-bold">${ali.precio_venta}</td>
                                                        <td><span className="badge bg-light text-dark">{ali.responsable_borrado || 'Admin'}</span></td>
                                                        <td style={{ fontSize: '13px' }}>{new Date(ali.fecha_borrado).toLocaleString()}</td>
                                                        <td className="text-center">
                                                            <button 
                                                                className="btn btn-sm btn-success rounded-circle shadow-sm"
                                                                onClick={() => restaurarAlimento(ali.id)}
                                                            >
                                                                <FontAwesomeIcon icon={faTrashRestore} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-5 text-muted">La papelera está vacía</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer border-0 p-3">
                                <button className="btn btn-dark rounded-pill px-4 fw-bold shadow-sm" onClick={() => setShowPapelera(false)}>CERRAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DETALLES */}
            {showDetalle && itemSeleccionado && (
                <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
                            <h4 className="fw-bold mb-4" style={{ color: '#1e5128' }}>
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Información de Alimento
                            </h4>
                            <div className="text-center mb-4">
                                <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-4 mb-3">
                                    <FontAwesomeIcon icon={faBowlFood} size="4x" className="text-success" />
                                </div>
                                <h2 className="fw-bold">{itemSeleccionado.nombre}</h2>
                            </div>
                            <ul className="list-group rounded-4 overflow-hidden border">
                                <div className="list-group-item d-flex gap-3 py-3">
                                    <FontAwesomeIcon icon={faDollarSign} className="text-success" />
                                    <strong>Precio:</strong> ${itemSeleccionado.precio_venta}
                                </div>
                                <div className="list-group-item d-flex gap-3 py-3">
                                    <FontAwesomeIcon icon={faBox} className="text-primary" />
                                    <strong>Stock:</strong> {itemSeleccionado.stock} unidades
                                </div>
                                <div className="list-group-item d-flex gap-3 py-3">
                                    <FontAwesomeIcon icon={faUserEdit} className="text-info" />
                                    <strong>Editado por:</strong> {itemSeleccionado.nombre_editor || 'Admin'}
                                </div>
                                {itemSeleccionado.vencimiento_alimento && (
                                    <div className="list-group-item d-flex gap-3 py-3">
                                        <FontAwesomeIcon icon={faInfoCircle} className="text-warning" />
                                        <strong>Vencimiento:</strong> {new Date(itemSeleccionado.vencimiento_alimento).toLocaleDateString()}
                                    </div>
                                )}
                            </ul>
                            <button className="btn btn-success w-100 rounded-pill mt-4 fw-bold" onClick={() => setShowDetalle(false)}>
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ProductoModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onGuardar={async form => {
                    try {
                        await api({
                            method: datosEdicion ? 'PUT' : 'POST',
                            url: datosEdicion ? `/productos/${datosEdicion.id}` : '/productos',
                            data: { ...form, categoria: 'alimentos' }
                        });
                        setShowModal(false);
                        cargarAlimentos();
                    } catch (err) {
                        console.error('Error al guardar:', err);
                    }
                }}
                datosEdicion={datosEdicion}
                categoria="alimentos"
            />

            <ConfirmModal
                show={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={async () => {
                    try {
                        await api.delete(`/productos/${idToDelete}`);
                        setShowConfirm(false);
                        cargarAlimentos();
                    } catch (err) {
                        console.error('Error al eliminar:', err);
                    }
                }}
            />
        </div>
    );
};

export default AlimentosPage;