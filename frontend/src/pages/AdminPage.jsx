import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { Container, Spinner, Alert } from "react-bootstrap";
import UserTable from "../components/UserTable";
import ProductsTable from "../components/ProductsTable";
import PaginationBar from "../components/PaginationBar";
import SearchBar from "../components/SearchBar";

function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [userSearch, setUserSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [userPage, setUserPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const itemsPerPage = 6;

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
    const fetchData = async () => {
      const token = localStorage.getItem("token");

      if (!token || !currentUser) {
        navigate("/login");
        return;
      }

      if (currentUser.role !== "admin") {
        toast.error("Unauthorized access.");
        navigate("/");
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [usersRes, productsRes] = await Promise.all([
          fetch("http://localhost:3000/api/admin/unapproved-users", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/unapproved-products", {
            headers,
          }),
        ]);

        if (!usersRes.ok || !productsRes.ok) {
          throw new Error("Failed to fetch pending data");
        }

        const usersData = await usersRes.json();
        const productsData = await productsRes.json();

        setPendingUsers(usersData.unapprovedUsers || []);
        setPendingProducts(productsData.unapprovedProducts || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate, currentUser]);

  const handleApproveUser = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/approve-user/${userId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to approve user");

      toast.success("User approved successfully!");
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDenyUser = async (userId) => {
    if (
      !window.confirm("Are you sure you want to deny and delete this account?")
    )
      return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/deny/${userId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to deny user");

      toast.success("User denied and removed.");
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleApproveProduct = async (productId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/approve-product/${productId}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to approve product");

      toast.success("Product approved successfully!");
      setPendingProducts(
        pendingProducts.filter((prod) => prod.id !== productId),
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDenyProduct = async (productId) => {
    if (
      !window.confirm("Are you sure you want to deny and delete this product?")
    )
      return;
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/deny-product/${productId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error("Failed to deny product");

      toast.success("Product denied and removed.");
      setPendingProducts(
        pendingProducts.filter((prod) => prod.id !== productId),
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const matchSearch = (item, searchString) => {
    if (!searchString) return true;
    const lowerSearch = searchString.toLowerCase();
    return Object.values(item).some(
      (val) =>
        val !== null &&
        val !== undefined &&
        String(val).toLowerCase().includes(lowerSearch),
    );
  };

  const filteredUsers = pendingUsers.filter((user) =>
    matchSearch(user, userSearch),
  );
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (userPage - 1) * itemsPerPage,
    userPage * itemsPerPage,
  );

  const filteredProducts = pendingProducts.filter((product) =>
    matchSearch(product, productSearch),
  );
  const totalProductPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice(
    (productPage - 1) * itemsPerPage,
    productPage * itemsPerPage,
  );

  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <Toaster position="top-center" />

      <Container className="py-5">
        <div className="mb-5 border-bottom pb-3">
          <h1 className="fw-bold">Admin Dashboard</h1>
          <p className="text-muted">Manage system approvals efficiently</p>
        </div>

        {isLoading ? (
          <div className="text-center my-5">
            <Spinner animation="border" variant="primary" role="status" />
            <p className="mt-3 text-muted">Loading pending approvals...</p>
          </div>
        ) : (
          <>
            <section className="mb-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h4 mb-0">Pending Accounts</h3>
                <SearchBar
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                />
              </div>

              {pendingUsers.length === 0 ? (
                <Alert variant="info" className="border-0 shadow-sm">
                  No accounts waiting for approval.
                </Alert>
              ) : currentUsers.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  No accounts match your search.
                </Alert>
              ) : (
                <>
                  <UserTable
                    users={currentUsers}
                    onApprove={handleApproveUser}
                    onDeny={handleDenyUser}
                  />
                  <PaginationBar
                    currentPage={userPage}
                    totalPages={totalUserPages}
                    onPageChange={setUserPage}
                  />
                </>
              )}
            </section>

            <section>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h4 mb-0">Pending Products</h3>
                <SearchBar
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                />
              </div>

              {pendingProducts.length === 0 ? (
                <Alert variant="info" className="border-0 shadow-sm">
                  No products waiting for approval.
                </Alert>
              ) : currentProducts.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  No products match your search.
                </Alert>
              ) : (
                <>
                  <ProductsTable
                    products={currentProducts}
                    onApprove={handleApproveProduct}
                    onDeny={handleDenyProduct}
                  />
                  <PaginationBar
                    currentPage={productPage}
                    totalPages={totalProductPages}
                    onPageChange={setProductPage}
                  />
                </>
              )}
            </section>
          </>
        )}
      </Container>
    </div>
  );
}

export default AdminPage;
