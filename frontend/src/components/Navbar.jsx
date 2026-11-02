import { Link, useNavigate } from "react-router-dom";
import {
  Navbar as BootstrapNavbar,
  Container,
  Button,
  Nav,
} from "react-bootstrap";

function Navbar() {
  const navigate = useNavigate();

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <BootstrapNavbar bg="white" expand="sm" className="shadow-sm mb-4">
      <Container>
        <BootstrapNavbar.Brand
          as={Link}
          to="/"
          className="fw-bold fs-4 text-dark"
        >
          Sundaland
        </BootstrapNavbar.Brand>

        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />

        <BootstrapNavbar.Collapse
          id="basic-navbar-nav"
          className="justify-content-end"
        >
          <Nav className="align-items-center">
            {user && (
              <BootstrapNavbar.Text className="me-3 fw-medium text-dark">
                Welcome, {user.first_name || user.firstName}
              </BootstrapNavbar.Text>
            )}
            {user ? (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleLogout}
                className="px-4 fw-semibold mt-2 mt-sm-0"
              >
                Logout
              </Button>
            ) : (
              <>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="px-4 fw-semibold mt-2 mt-sm-0 me-2"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate("/register")}
                  className="px-4 fw-semibold mt-2 mt-sm-0"
                >
                  Register
                </Button>
              </>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}

export default Navbar;
