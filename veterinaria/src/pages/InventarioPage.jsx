// src/pages/InventarioPage.jsx
import React, { useState, useEffect } from 'react';
import InventarioModal from '../component/InventarioModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faMedkit, faUtensils, faShoppingBag, faPlus, faExclamationTriangle, faTrash, faPencilAlt, faMinusCircle, faPlusCircle } from '@fortawesome/free-solid-svg-icons';

const InventarioPage = () => {
  const [tabActual, setTabActual] = useState('medicamentos');
  const [showModal, setShowModal] = useState(false);
  const [itemAEditar, setItemAEditar] = useState(null);

  const [stock, setStock] = useState(() => {
    const saved = localStorage.getItem('inventario');
    return saved ? JSON.parse(saved) : {
      medicamentos: [{ id: 1, nombre: 'Amoxicilina 500mg', cantidad: 20, precio: '1200', info: '2026-12-01' }],
      alimentos: [{ id: 2, nombre: 'Royal Canin Adulto 15kg', cantidad: 5, precio: '45000', info: 'Perro' }],
      petshop: [{ id: 3, nombre: 'Pretal Talle L', cantidad: 12, precio: '4500', info: 'Reforzado' }]
    };
  });

  useEffect(() => {
    localStorage.setItem('inventario', JSON.stringify(stock));
  }, [stock]);

  const ajustarStock = (categoria, id, cambio) => {
    setStock(prev => ({
      ...prev,
      [categoria]: prev[categoria].map(item => 
        item.id === id ? { ...item, cantidad: Math.max(0, item.cantidad + cambio) } : item
      )
    }));
  };

  const guardarItem = (datos) => {
    if (itemAEditar) {
      setStock(prev => ({
        ...prev,
        [tabActual]: prev[tabActual].map(i => i.id === itemAEditar.id ? { ...datos, id: i.id } : i)
      }));
    } else {
      setStock(prev => ({
        ...prev,
        [tabActual]: [...prev[tabActual], { ...datos, id: Date.now() }]
      }));
    }
    setShowModal(false);
    setItemAEditar(null);
  };

  const eliminarItem = (id) => {
    if (window.confirm("¿Eliminar este producto?")) {
      setStock(prev => ({
        ...prev,
        [tabActual]: prev[tabActual].filter(i => i.id !== id)
      }));
    }
  };

  const prepararEdicion = (item) => {
    setItemAEditar(item);
    setShowModal(true);
  };

  return (
    <div className="container-fluid p-5 bg-light min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ color: '#663399', fontWeight: 'bold' }}>
          <FontAwesomeIcon icon={faBox} className="me-3 text-secondary" /> Gestión de Inventario
        </h1>
        <button className="btn btn-dark px-4" style={{borderRadius: '10px'}} onClick={() => { setItemAEditar(null); setShowModal(true); }}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Agregar Item
        </button>
      </div>

      <ul className="nav nav-pills nav-fill mb-4 bg-light rounded-3 shadow-sm border p-1">
        <li className="nav-item">
          <button className={`nav-link border-0 ${tabActual === 'medicamentos' ? 'active bg-primary text-white' : 'text-dark'}`} onClick={() => setTabActual('medicamentos')}>Medicamentos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link border-0 ${tabActual === 'alimentos' ? 'active bg-success text-white' : 'text-dark'}`} onClick={() => setTabActual('alimentos')}>Alimentos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link border-0 ${tabActual === 'petshop' ? 'active bg-info text-white' : 'text-dark'}`} onClick={() => setTabActual('petshop')}>Petshop</button>
        </li>
      </ul>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th className="text-center">Stock</th>
              <th className="text-center">Precio</th>
              <th>{tabActual === 'medicamentos' ? 'Vencimiento' : 'Detalles'}</th>
              <th className="text-center">Estado</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {stock[tabActual].map(item => (
              <tr key={item.id}>
                <td className="fw-bold">{item.nombre}</td>
                <td className="text-center">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <button className="btn btn-sm text-danger border-0" onClick={() => ajustarStock(tabActual, item.id, -1)}>
                      <FontAwesomeIcon icon={faMinusCircle} />
                    </button>
                    <span className="badge bg-light text-dark border px-3 py-2">{item.cantidad}</span>
                    <button className="btn btn-sm text-success border-0" onClick={() => ajustarStock(tabActual, item.id, 1)}>
                      <FontAwesomeIcon icon={faPlusCircle} />
                    </button>
                  </div>
                </td>
                <td className="text-center fw-bold text-success">$ {item.precio}</td>
                <td className="text-muted">{item.info}</td>
                <td className="text-center">
                  {item.cantidad < 10 ? 
                    <span className="badge bg-warning text-dark"><FontAwesomeIcon icon={faExclamationTriangle} /> Bajo</span> : 
                    <span className="badge bg-success">OK</span>
                  }
                </td>
                <td className="text-center">
                  <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-outline-primary btn-sm rounded-circle" onClick={() => prepararEdicion(item)}>
                      <FontAwesomeIcon icon={faPencilAlt} />
                    </button>
                    <button className="btn btn-outline-danger btn-sm rounded-circle" onClick={() => eliminarItem(item.id)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stock[tabActual].length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-4 text-muted">
                  No hay productos en esta categoría
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <InventarioModal 
        show={showModal} 
        onClose={() => { setShowModal(false); setItemAEditar(null); }}
        onGuardar={guardarItem}
        datosEdicion={itemAEditar}
        categoria={tabActual}
      />
    </div>
  );
};

export default InventarioPage;