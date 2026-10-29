import { useState, useEffect} from "react";
import { useNavigate, Link,} from "react-router-dom";
import Navbar from "../components/Navbar";
import { Container, Alert, Button } from "react-bootstrap";

function BuyerPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const visibleProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()),
  );

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
    const loadProducts = async () => {
      const token = localStorage.getItem("token");
      if (!token || !currentUser) {
        navigate("/login");
        return;
      }
      if (currentUser.role !== "buyer") {
        navigate ("/");
        return;
      }
      
      try {
        const response = await fetch("http://localhost:3000/api/products");
        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, [navigate, currentUser]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <Navbar />
      <Container>
        <div className="d-flex justify-content-between align-items-center">
          <h1 style={{ fontWeight: 700 }}>Shop</h1>
          <Button variant="primary" onClick={() => navigate("/orders")}>
            My orders
          </Button>
          <Button variant="primary" disabled>View cart</Button>
        </div>
        <input
          type="search"
          placeholder="Search products"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isLoading && <p>Loading products...</p>}
        {!isLoading && visibleProducts.length === 0 && (
          <Alert variant="info" style={{ marginTop: "20px" }}>
            No products available.
          </Alert>
        )}
        {visibleProducts.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {visibleProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                style={{
                  textDecoration: "none",
                  color: "#212529",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={product.pictureUrl ||
          "https://via.placeholder.com/300x200?text=No+Image"}
                  alt={product.name}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                  }}
                />
                <div style={{ padding: "12px" }}>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div>${Number(product.price).toFixed(2)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
export default BuyerPage;
