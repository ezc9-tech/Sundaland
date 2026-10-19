import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";

const EMPTY_FORM = {
  name: "",
  price: "",
  description: "",
  pictureUrl: "",
  inventory: "0",
  companyId: "", // TEMPORARY
};

function CreateProductPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const token = localStorage.getItem("token");

  // Not logged in -> send to login
  if (!token || !currentUser) {
    navigate("/login");
    return null;
  }

  const canCreate = currentUser.role === "seller" || currentUser.role === "admin";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          description: form.description.trim(),
          pictureUrl: form.pictureUrl.trim() || undefined,
          inventory: Number(form.inventory),
          companyId: Number(form.companyId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing");
      }

      toast.success("Listing created! It will appear once approved.");
      setForm(EMPTY_FORM);
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
              <h1 className="fw-bold">New Listing</h1>
              <h2 className="h5 text-muted">Add a product to sell</h2>
            </div>

            {!canCreate ? (
              <Alert variant="warning" className="border-0 shadow-sm">
                Only sellers can create product listings.
              </Alert>
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

                    <Form.Group className="mb-3" controlId="pictureUrl">
                      <Form.Label>Picture URL (optional)</Form.Label>
                      <Form.Control
                        type="url"
                        name="pictureUrl"
                        value={form.pictureUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/photo.jpg"
                      />
                    </Form.Group>

                    {/*TEMPORARY*/}
                    <Form.Group className="mb-4" controlId="companyId">
                      <Form.Label>Company ID</Form.Label>
                      <Form.Control
                        type="number"
                        name="companyId"
                        value={form.companyId}
                        onChange={handleChange}
                        min="1"
                        required
                      />
                    </Form.Group>

                    <div className="d-grid">
                      <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Creating...
                          </>
                        ) : (
                          "Create Listing"
                        )}
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

export default CreateProductPage;
