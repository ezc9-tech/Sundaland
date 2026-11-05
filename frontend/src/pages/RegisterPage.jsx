import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";

function RegisterPage() {
  const [role, setRole] = useState("buyer");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    data.role = role;

    if (data.password !== data["confirm-password"]) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          role: data.role,
          firstName: data.first_name,
          lastName: data.last_name,
          phoneNumber: data.phone_number,
          address: data.address,
          dateOfBirth: data.date_of_birth,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to register");
      }

      toast.success("Waiting on admin approval, try to login in a minute!", {
        duration: 4000,
      });

      setTimeout(() => {
        navigate("/login");
      }, 4000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />

      <Container
        fluid
        className="d-flex align-items-center justify-content-center min-vh-100 bg-light py-4"
      >
        <Card
          style={{ width: "100%", maxWidth: "800px" }}
          className="shadow-sm border-0"
        >
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <img
                src="/logo.jpg"
                alt="Sundaland Logo"
                className="img-fluid mb-3 rounded"
                style={{ maxWidth: "400px" }}
              />
              <h2 className="fw-bold">Register</h2>
            </div>

            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="first_name">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="first_name"
                      placeholder="John"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="last_name">
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control
                      type="text"
                      name="last_name"
                      placeholder="Doe"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Email@gmail.com"
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="phone_number">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone_number"
                      placeholder="555-123-4567"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="date_of_birth">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control type="date" name="date_of_birth" required />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="address">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  type="text"
                  name="address"
                  placeholder="123 Main St"
                  required
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="password">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      placeholder="******"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="confirm-password">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirm-password"
                      placeholder="******"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4" controlId="role">
                <Form.Label>Role</Form.Label>
                <Form.Select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="buyer">Buyer</option>
                  <option value="seller">Seller</option>
                </Form.Select>
              </Form.Group>

              {role === "seller" && (
                <Form.Group className="mb-4" controlId="store-name">
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="store-name"
                    placeholder="Enter store name (Optional)"
                  />
                </Form.Group>
              )}

              <Button
                variant="primary"
                type="submit"
                className="w-100 mb-3 py-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Registering...
                  </>
                ) : (
                  "Register"
                )}
              </Button>

              <div className="text-center text-muted">
                Already have an account?{" "}
                <Link to="/login" className="text-decoration-none fw-semibold">
                  Login here!
                </Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default RegisterPage;
