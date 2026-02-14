import { Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';

const LoginRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
    </Routes>
  );
};

export default LoginRoutes;