import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

const DueñoTable = ({ dueños, onEliminar, onEditar }) => {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead style={{ backgroundColor: '#663399', color: 'white' }}>
          <tr>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {dueños.map(d => (
            <tr key={d.id}>
              <td className="fw-bold">{d.nombre}</td>
              <td>{d.dni}</td>
              <td>{d.telefono}</td>
              <td>{d.direccion}</td>
              <td className="text-center">
                <button className="btn btn-primary btn-sm rounded-circle me-2 shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => onEditar(d)}>
                  <FontAwesomeIcon icon={faPencilAlt} />
                </button>
                <button className="btn btn-danger btn-sm rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => onEliminar(d.id)}>
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DueñoTable;