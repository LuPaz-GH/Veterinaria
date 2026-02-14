import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faPaw, faPlus, faTrash, faChevronDown } from '@fortawesome/free-solid-svg-icons';

const ClientesPage = () => {
  const [clientes, setClientes] = useState([
    { 
      id: 1, 
      nombre: 'Juan Perez', 
      dni: '12345678', 
      telefono: '3814445566',
      mascotas: [{ id: 101, nombre: 'Pepe', especie: 'Canino' }] 
    }
  ]);

  return (
    <div className="container mt-5 p-5 bg-white rounded-4 shadow">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 style={{ color: '#99cc33', fontWeight: 'bold' }}>
          <FontAwesomeIcon icon={faUser} className="me-3" /> Gestión de Clientes y Mascotas
        </h1>
        <button className="btn btn-success" style={{borderRadius: '10px'}}>
          <FontAwesomeIcon icon={faPlus} className="me-2" /> Nuevo Cliente
        </button>
      </div>

      <div className="table-responsive">
        <table className="table align-middle">
          <thead className="table-light">
            <tr>
              <th>Dueño</th>
              <th>DNI / Teléfono</th>
              <th>Mascotas Asociadas</th>
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="fw-bold">{c.nombre}</div>
                </td>
                <td>
                  <small className="text-muted d-block">DNI: {c.dni}</small>
                  <small className="text-muted">Tel: {c.telefono}</small>
                </td>
                <td>
                  {c.mascotas.map(m => (
                    <span key={m.id} className="badge bg-info me-1" style={{fontSize: '0.8rem'}}>
                      <FontAwesomeIcon icon={faPaw} className="me-1" /> {m.nombre}
                    </span>
                  ))}
                  <button className="btn btn-sm btn-outline-info ms-1 border-0" title="Agregar Mascota">
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </td>
                <td className="text-center">
                  <button className="btn btn-outline-danger btn-sm rounded-circle">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientesPage;