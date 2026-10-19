import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConstructionPage from './pages/UnderConstructionPage';
import AdminPage from './pages/AdminPage';
import CreateProductPage from "./pages/CreateProductPage";

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/register" element={<RegisterPage/>} />
        <Route path="/admin-dashboard" element={<AdminPage/>} />
        <Route path="/create-listing" element={<CreateProductPage />} />
        <Route path="*" element={<ConstructionPage/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
