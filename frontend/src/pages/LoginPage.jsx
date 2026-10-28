import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Container, Card, Form, Button, Spinner } from "react-bootstrap";

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to login");
      }

      if (!result.token || !result.user) {
        throw new Error("Login response is missing user or token data");
      }

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      toast.success("Logged in successfully!");

      const userRole = result.user.role;

      let destination = "/";

      switch (userRole) {
        case "admin":
          destination = "/admin-dashboard";
          break;
        case "buyer":
          destination = "/buyer-dashboard";
          break;
        case "seller":
          destination = "/seller-dashboard";
          break;
        default:
          destination = "/"; 
      }

      setTimeout(() => {
        navigate(destination);
      }, 1000);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Container fluid className="d-flex align-items-center justify-content-center vh-100 bg-light">

        <Card style={{ width: '100%', maxWidth: '800px' }} className="shadow-sm border-0">
          <Card.Body className="p-4 p-md-5">
            <div className="text-center mb-4">
              <img 
                src="/logo.jpg" 
                alt="Sundaland Logo" 
                className="img-fluid mb-3 rounded" 
                style={{ maxWidth: '400px' }} 
              />
              <h2 className="fw-bold">Login</h2>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Email@gmail.com"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="******"
                  required
                />
              </Form.Group>

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
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
              
              <div className="text-center text-muted">
                Don't have an account? <Link to="/register" className="text-decoration-none fw-semibold">Register here!</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default LoginPage;