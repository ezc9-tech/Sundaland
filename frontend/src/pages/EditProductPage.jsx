import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";

function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    pictureUrl: "",
    inventory: "0",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`http://localhost:3000/api/products/mine/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load product");
        }

        const p = data.product;
        setForm({
          name: p.name,
          price: String(p.price),
          description: p.description,
          pictureUrl: p.pictureUrl || "",
          inventory: String(p.inventory),
        });
      } catch (error) {
        toast.error(error.message);
        navigate("/seller-dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`http://localhost:3000/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          description: form.description.trim(),
          pictureUrl: form.pictureUrl.trim(),
          inventory: Number(form.inventory),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update product");
      }

      toast.success("Listing updated!");
      setTimeout(() => navigate("/seller-dashboard"), 800);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <Toaster position="top-center" />

      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <div className="mb-4">
              <h1 className="fw-bold">Edit Listing</h1>
              <h2 className="h5 text-muted">
                Changing the name or description sends it back for approval.
              </h2>
            </div>

            {isLoading ? (
              <div className="text-center my-5">
                <Spinner animation="border" variant="primary" role="status" />
              </div>
            ) : (
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3" controlId="name">
                      <Form.Label>Product Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        maxLength={100}
                        pattern="[A-Za-z0-9 ]+"
                        title="Letters, numbers, and spaces only"
                        required
                      />
                      <Form.Text muted>Letters, numbers, and spaces only.</Form.Text>
                    </Form.Group>

                    <Row>
                      <Col xs={6}>
                        <Form.Group className="mb-3" controlId="price">
                          <Form.Label>Price ($)</Form.Label>
                          <Form.Control
                            type="number"
                            name="price"
                            value={form.price}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col xs={6}>
                        <Form.Group className="mb-3" controlId="inventory">
                          <Form.Label>Inventory</Form.Label>
                          <Form.Control
                            type="number"
                            name="inventory"
                            value={form.inventory}
                            onChange={handleChange}
                            min="0"
                            step="1"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3" controlId="description">
                      <Form.Label>Description</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={4}
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        maxLength={1000}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-4" controlId="pictureUrl">
                      <Form.Label>Picture URL (optional)</Form.Label>
                      <Form.Control
                        type="url"
                        name="pictureUrl"
                        value={form.pictureUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/photo.jpg"
                      />
                    </Form.Group>

                    <div className="d-grid gap-2">
                      <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <Button as={Link} to="/seller-dashboard" variant="outline-secondary">
                        Cancel
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default EditProductPage;