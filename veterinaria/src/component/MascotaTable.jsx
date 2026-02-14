// src/component/MascotaTable.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

const MascotaTable = ({ 
  mascotas = [], 
  onEliminar = () => {}, 
  onEditar = () => {},
  busqueda = ""
}) => {
  const mascotasFiltradas = mascotas.filter(m => 
    m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    m.dueño?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle">
        <thead style={{ backgroundColor: '#663399', color: 'white' }}>
          <tr>
            <th>Nombre</th>
            <th>Especie</th>
            <th>Raza</th>
            <th>Dueño</th>
            <th className="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {mascotasFiltradas.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-muted py-4">
                {busqueda 
                  ? "No se encontraron mascotas con ese criterio" 
                  : "Aún no hay mascotas registradas"}
              </td>
            </tr>
          ) : (
            mascotasFiltradas.map(m => (
              <tr key={m.id}>
                <td className="fw-bold">{m.nombre || 'Sin nombre'}</td>
                <td>{m.especie || '-'}</td>
                <td>{m.raza || '-'}</td>
                <td>{m.dueño || 'Sin dueño asignado'}</td>
                <td className="text-center">
                  <button 
                    className="btn btn-primary btn-sm rounded-circle me-2 shadow-sm" 
                    style={{ width: '35px', height: '35px' }} 
                    onClick={() => onEditar(m)}
                  >
                    <FontAwesomeIcon icon={faPencilAlt} />
                  </button>
                  <button 
                    className="btn btn-danger btn-sm rounded-circle shadow-sm" 
                    style={{ width: '35px', height: '35px' }} 
                    onClick={() => onEliminar(m.id)}  // ← Solo llama a onEliminar (sin confirm aquí)
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MascotaTable;