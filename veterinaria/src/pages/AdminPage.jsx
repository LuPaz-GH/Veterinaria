import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faChartLine, faUsersCog, faExclamationCircle, faWallet, faPaw } from '@fortawesome/free-solid-svg-icons';

const AdminPage = () => {
  return (
    <div className="container mt-5 p-5 bg-white rounded-4 shadow">
      <div className="mb-4">
        <h1 className="fw-bold mb-0" style={{ color: '#343a40' }}>
          <FontAwesomeIcon icon={faUserShield} className="me-3" /> Panel Administrativo
        </h1>
        <p className="text-muted">Control total de Malfi Veterinaria</p>
      </div>

      <div className="row g-4 mb-5">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-primary text-white text-center" style={{borderRadius: '25px'}}>
            <FontAwesomeIcon icon={faWallet} size="2x" className="mb-2" />
            <h2 className="fw-bold">$ 452.800</h2>
            <p className="mb-0 small opacity-75">Ventas Totales del Mes</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-success text-white text-center" style={{borderRadius: '25px'}}>
            <FontAwesomeIcon icon={faPaw} size="2x" className="mb-2" />
            <h2 className="fw-bold">124</h2>
            <p className="mb-0 small opacity-75">Nuevos Pacientes</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-4 bg-danger text-white text-center" style={{borderRadius: '25px'}}>
            <FontAwesomeIcon icon={faExclamationCircle} size="2x" className="mb-2" />
            <h2 className="fw-bold">8</h2>
            <p className="mb-0 small opacity-75">Alertas de Stock Crítico</p>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm p-4" style={{borderRadius: '25px', backgroundColor: '#f8f9fa'}}>
        <h5 className="fw-bold mb-3"><FontAwesomeIcon icon={faUsersCog} className="me-2"/> Gestión de Staff</h5>
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Luciana Malfi</td>
                <td><span className="badge bg-dark text-white">Admin / Dueña</span></td>
                <td><span className="text-success">● Activo</span></td>
                <td className="text-center"><button className="btn btn-sm btn-outline-secondary">Editar Permisos</button></td>
              </tr>
              <tr>
                <td>Dr. Ricardo Gómez</td>
                <td><span className="badge bg-info text-white">Veterinario</span></td>
                <td><span className="text-success">● Activo</span></td>
                <td className="text-center"><button className="btn btn-sm btn-outline-secondary">Ver Agenda</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;