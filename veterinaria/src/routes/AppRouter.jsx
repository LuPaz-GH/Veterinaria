import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import MascotasRouter from './MascotasRouter';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      {/* El /* es FUNDAMENTAL para que funcione el MascotasRouter */}
      <Route path="/mascotas/*" element={<MascotasRouter />} />
    </Routes>
  );
};

export default AppRouter;