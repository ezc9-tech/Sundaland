import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Container, Row, Col, Card, Table, Badge, Button, Spinner, Alert } from "react-bootstrap";

const LOW_STOCK_LIMIT = 5;

function SellerDashboardPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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

  const canSell = currentUser?.role === "seller" || currentUser?.role === "admin";

  useEffect(() => {
    const fetchProducts = async () => {
      const token = localStorage.getItem("token");

      if (!token || !currentUser) {
        navigate("/login");
        return;
      }

      if (!canSell) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:3000/api/products/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch your products");
        }

        const data = await response.json();
        setProducts(data.products || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [navigate, currentUser, canSell]);

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:3000/api/products/${product.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      toast.success("Product deleted.");
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const approvedCount = products.filter((p) => p.approved).length;
  const pendingCount = products.length - approvedCount;
  const lowStockCount = products.filter((p) => p.inventory <= LOW_STOCK_LIMIT).length;

  const stats = [
    { label: "Total Listings", value: products.length, variant: "primary" },
    { label: "Approved", value: approvedCount, variant: "success" },
    { label: "Pending Approval", value: pendingCount, variant: "warning" },
    { label: "Low Stock", value: lowStockCount, variant: "danger" },
  ];

  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <Toaster position="top-center" />

      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="fw-bold">Seller Dashboard</h1>
            <h2 className="h5 text-muted">Manage your product listings</h2>
          </div>
          {canSell && (
            <Button as={Link} to="/create-listing" variant="primary">
              + New Listing
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" role="status" />
            <p className="mt-3 text-muted">Loading your listings...</p>
          </div>
        ) : !canSell ? (
          <Alert variant="warning" className="border-0 shadow-sm">
            Only sellers can view the dashboard.
          </Alert>
        ) : (
          <>
            <Row xs={2} lg={4} className="g-3 mb-4">
              {stats.map((stat) => (
                <Col key={stat.label}>
                  <Card className="border-0 shadow-sm text-center h-100">
                    <Card.Body>
                      <div className={`display-6 fw-bold text-${stat.variant}`}>{stat.value}</div>
                      <div className="text-muted small">{stat.label}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {products.length === 0 ? (
              <Alert variant="info" className="text-center py-4 border-0 shadow-sm">
                You haven't created any listings yet.
              </Alert>
            ) : (
              <Card className="border-0 shadow-sm">
                <Table responsive hover className="mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Inventory</th>
                      <th>Status</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="fw-semibold">{product.name}</td>
                        <td>${Number(product.price).toFixed(2)}</td>
                        <td>
                          {product.inventory}{" "}
                          {product.inventory <= LOW_STOCK_LIMIT && (
                            <Badge bg="danger">Low</Badge>
                          )}
                        </td>
                        <td>
                          {product.approved ? (
                            <Badge bg="success">Approved</Badge>
                          ) : (
                            <Badge bg="warning" text="dark">Pending</Badge>
                          )}
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="me-2"
                            onClick={() => navigate(`/products/${product.id}/edit-listing`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleDelete(product)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

export default SellerDashboardPage;