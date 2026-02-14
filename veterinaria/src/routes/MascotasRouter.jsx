import { Routes, Route } from 'react-router-dom';
import MascotasPage from '../pages/MascotasPage';

const MascotasRouter = () => {
  return (
    <Routes>
      {/* Esto cargará la MascotasPage cuando estés en /mascotas */}
      <Route path="/" element={<MascotasPage />} />
    </Routes>
  );
};

export default MascotasRouter;