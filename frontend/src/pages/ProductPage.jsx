import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Container } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentUser] = useState(() => {
    const userString = localStorage.getItem("user");
    if (!userString) return null;
    try {
      return JSON.parse(userString);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  useEffect(() => {
    const loadProduct = async () => {
      const token = localStorage.getItem("token");
      if (!token || !currentUser) {
        navigate("/login");
        return;
      }
      if (currentUser.role !== "buyer") {
        navigate("/");
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:3000/api/products/${id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProduct();
  }, [id, navigate, currentUser]);

  if (isLoading) {
    return <p>Loading product...</p>;
  }
  if (!product) {
    return <p>Product not found.</p>;
  }
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <Navbar />
      <Container>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px" }}>
          <img
            src={product.pictureUrl}
            alt={product.name}
            style={{
              width: "100%",
              maxWidth: "450px",
              borderRadius: "8px",
              objectFit: "cover",
            }}
          />
          <div style={{ flex: 1, minWidth: "280px" }}>
            <h1 style={{ fontWeight: 700 }}>{product.name}</h1>
            <p style={{ color: "#6c757d" }}>Sold by {product.company.name}</p>
            <div style={{ fontSize: "28px", fontWeight: 600 }}>
              ${Number(product.price).toFixed(2)}
            </div>
            <p style={{ marginTop: "16px" }}>{product.description}</p>
            <p>{product.inventory} in stock</p>
            <button onClick={() => navigate(`/checkout/${product.id}`)}>
              Buy now
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}
export default ProductPage;
