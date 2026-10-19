import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConstructionPage from "./pages/UnderConstructionPage";
import AdminPage from "./pages/AdminPage";
import CreateProductPage from "./pages/CreateProductPage";
import BuyerPage from "./pages/BuyerPage";
import ProductPage from "./pages/ProductPage";
import PaymentPage from "./pages/PaymentPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin-dashboard" element={<AdminPage />} />
        <Route path="*" element={<ConstructionPage />} />
        <Route path="/create-listing" element={<CreateProductPage />} />
        <Route path="/buyer-dashboard" element={<BuyerPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/checkout/:id" element={<PaymentPage/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
