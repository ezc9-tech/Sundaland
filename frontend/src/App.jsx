import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ConstructionPage from './pages/UnderConstructionPage';
import HomePage from './pages/HomePage';

function App() {


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage/>} />
        <Route path="/register" element={<RegisterPage/>} />
        <Route path="/" element={<HomePage/>} />
        <Route path="*" element={<ConstructionPage/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
