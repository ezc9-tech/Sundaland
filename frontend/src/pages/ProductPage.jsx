import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { Container } from "react-bootstrap";
import { useParams, useNavigate, Link } from "react-router-dom";

function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [similar, setSimilar] = useState([]);

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
        navigate("/login", { state: { from: `/product/${id}` } });
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

  useEffect(() => {
    if(!product) return;
    const loadSimilarProducts = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/products");
        if(!response.ok) return;
        const data = await response.json();
        const words = product.name.toLowerCase().split(" ");
        const results = [];
        for(const otherProduct of data.products) {
          if(otherProduct.id === product.id) continue;
          let score = 0;
          if (product.tag && otherProduct.tag === product.tag) {
            score += 3;
          }
          if (otherProduct.companyId === product.companyId) {
            score += 2;
          }
          const otherWords = otherProduct.name.toLowerCase().split(" ");
          for(const word of words) {
            if (otherWords.includes(word)) {
              score += 1;
            }
          }
          if(score > 0) {
            results.push({product: otherProduct, score: score});
          }
        }
        results.sort((a, b) => b.score - a.score);
        setSimilar(results.slice(0, 6).map((r) => r.product));
      } catch (error) {
        console.log(error);
      }
    };
    loadSimilarProducts();
  },[product]);

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
            src={product.pictureUrl || "https://via.placeholder.com/300x200?text=No+Image"}
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
            <div style={{ marginBottom: "16px"}}>
              <button
                onClick={() => setQuantity(quantity - 1)}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span style={{ margin: "0 12px"}}>{quantity}</span>
              <button
               onClick={() => setQuantity(quantity + 1)}
               disabled={quantity >= product.inventory}
               >
                +
               </button>
            </div>
            <button onClick={() => navigate(`/checkout/${product.id}?quantity=${quantity}`)}
              disabled={product.inventory < 1}
            >
              Buy now
            </button>
          </div>
        </div>
        {similar.length > 0 && (
          <div style={{marginTop: "56px", paddingBottom: "48px"}}>
            <h2 style={{ fontWeight: 700}}>Similar products</h2>
            <div
              style={{
                display: "flex",
                gap: "20px",
                overflowX: "auto",
                paddingBottom: "12px",
                marginTop: "20px",
              }}
            >
              {similar.map((otherProduct)=> (
                <Link
                  key={otherProduct.id}
                  to={`/product/${otherProduct.id}`}
                  style={{
                    flex: "0 0 200px",
                    textDecoration: "none",
                    color: "#212529",
                    backgroundColor: "white",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={otherProduct.pictureUrl || "https://via.placeholder.com/300x200?text=No+Image"}
                    alt={otherProduct.name}
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover"}}
                  />
                  <div style={{padding: "12px"}}>
                    <div style={{fontWeight: 600}}>{otherProduct.name}</div>
                    <div style={{color: "#6c757d", fontSize: "14px"}}>
                      Sold by {otherProduct.company.name}
                    </div>
                    <div>${Number(otherProduct.price).toFixed(2)}</div>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        )}
      </Container>
    </div>
  );
}
export default ProductPage;
