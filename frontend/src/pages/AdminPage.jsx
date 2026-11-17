import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import {
  Accordion,
  Alert,
  Badge,
  Container,
  Modal,
  Spinner,
} from "react-bootstrap";
import UserTable from "../components/UserTable";
import ProductsTable from "../components/ProductsTable";
import PaginationBar from "../components/PaginationBar";
import RecentActivityTable from "../components/RecentActivityTable";
import SearchBar from "../components/SearchBar";

function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [recentAuditEvents, setRecentAuditEvents] = useState([]);
  const [recentActivityEvents, setRecentActivityEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditProduct, setAuditProduct] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const navigate = useNavigate();
  const [userSearch, setUserSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [approvedUserSearch, setApprovedUserSearch] = useState("");
  const [listingSearch, setListingSearch] = useState("");

  const [userPage, setUserPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [approvedUserPage, setApprovedUserPage] = useState(1);
  const [listingPage, setListingPage] = useState(1);
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

        const [
          usersRes,
          productsRes,
          approvedUsersRes,
          allProductsRes,
          auditRes,
          activityRes,
        ] = await Promise.all([
          fetch("http://localhost:3000/api/admin/unapproved-users", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/unapproved-products", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/approved-users", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/products", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/product-audit", {
            headers,
          }),
          fetch("http://localhost:3000/api/admin/activity", {
            headers,
          }),
        ]);

        if (
          !usersRes.ok ||
          !productsRes.ok ||
          !approvedUsersRes.ok ||
          !allProductsRes.ok ||
          !auditRes.ok ||
          !activityRes.ok
        ) {
          throw new Error("Failed to fetch admin data");
        }

        const [
          usersData,
          productsData,
          approvedUsersData,
          allProductsData,
          auditData,
          activityData,
        ] =
          await Promise.all([
            usersRes.json(),
            productsRes.json(),
            approvedUsersRes.json(),
            allProductsRes.json(),
            auditRes.json(),
            activityRes.json(),
          ]);

        setPendingUsers(usersData.unapprovedUsers || []);
        setPendingProducts(productsData.unapprovedProducts || []);
        setApprovedUsers(approvedUsersData.approvedUsers || []);
        setAllProducts(allProductsData.products || []);
        setRecentAuditEvents(auditData.auditEvents || []);
        setRecentActivityEvents(activityData.activityEvents || []);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate, currentUser]);

  const addActivityEvent = (event) => {
    if (event) {
      setRecentActivityEvents((events) => [event, ...events].slice(0, 100));
    }
  };

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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve user");
      }

      const approvedUser = pendingUsers.find((user) => user.id === userId);
      addActivityEvent(data.activityEvent);
      toast.success("User approved successfully!");
      setPendingUsers((users) => users.filter((user) => user.id !== userId));
      if (approvedUser) {
        setApprovedUsers((users) => [
          { ...approvedUser, approved: true, isActive: true },
          ...users,
        ]);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDenyUser = async (userId) => {
    if (
      !window.confirm("Are you sure you want to deny and remove this pending account?")
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to deny user");
      }

      addActivityEvent(data.activityEvent);
      toast.success("User denied and removed.");
      setPendingUsers((users) => users.filter((user) => user.id !== userId));
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve product");
      }

      toast.success("Product approved successfully!");
      setRecentAuditEvents((events) =>
        data.auditEvent ? [data.auditEvent, ...events].slice(0, 100) : events,
      );
      setPendingProducts(
        pendingProducts.filter((prod) => prod.id !== productId),
      );
      setAllProducts((products) =>
        products.map((product) =>
          product.id === productId ? { ...product, approved: true } : product,
        ),
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDenyProduct = async (productId) => {
    if (
      !window.confirm("Are you sure you want to deny and remove this pending listing?")
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to deny product");
      }

      toast.success("Product denied and removed.");
      setRecentAuditEvents((events) =>
        data.auditEvent ? [data.auditEvent, ...events].slice(0, 100) : events,
      );
      setPendingProducts(
        pendingProducts.filter((prod) => prod.id !== productId),
      );
      setAllProducts((products) =>
        products.filter((product) => product.id !== productId),
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleUserActive = async (userId, isActive) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/users/${userId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user status");
      }

      addActivityEvent(data.activityEvent);
      setApprovedUsers((users) =>
        users.map((user) => (user.id === userId ? { ...user, isActive } : user)),
      );
      toast.success(
        `Account access ${isActive ? "restored" : "revoked"} successfully.`,
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleProductActive = async (productId, isActive) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/products/${productId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update product status");
      }

      setRecentAuditEvents((events) =>
        data.auditEvent ? [data.auditEvent, ...events].slice(0, 100) : events,
      );
      setAllProducts((products) =>
        products.map((product) =>
          product.id === productId ? { ...product, isActive } : product,
        ),
      );
      toast.success(
        `Listing ${isActive ? "restored" : "revoked"} successfully.`,
      );
    } catch (error) {
      toast.error(error.message);
    }
  };

  const matchSearch = (item, searchString) => {
    if (!searchString) return true;
    const lowerSearch = searchString.toLowerCase();
    const searchableValues = (value) => {
      if (value === null || value === undefined) return [];
      if (Array.isArray(value)) return value.flatMap(searchableValues);
      if (typeof value === "object") {
        return Object.values(value).flatMap(searchableValues);
      }
      return [String(value).toLowerCase()];
    };
    return searchableValues(item).some((value) => value.includes(lowerSearch));
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

  const filteredApprovedUsers = approvedUsers.filter((user) =>
    matchSearch(user, approvedUserSearch),
  );
  const totalApprovedUserPages = Math.ceil(
    filteredApprovedUsers.length / itemsPerPage,
  );
  const currentApprovedUsers = filteredApprovedUsers.slice(
    (approvedUserPage - 1) * itemsPerPage,
    approvedUserPage * itemsPerPage,
  );

  const filteredProductsForAudit = allProducts.filter((product) =>
    matchSearch(product, listingSearch),
  );
  const totalListingPages = Math.ceil(
    filteredProductsForAudit.length / itemsPerPage,
  );
  const currentAuditProducts = filteredProductsForAudit.slice(
    (listingPage - 1) * itemsPerPage,
    listingPage * itemsPerPage,
  );

  const handleViewAudit = async (product) => {
    setAuditProduct(product);
    setAuditEvents([]);
    setIsAuditLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:3000/api/admin/products/${product.id}/audit`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load listing history");
      }
      setAuditEvents(data.auditEvents || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAuditLoading(false);
    }
  };

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
                <h3 className="h4 mb-0">Pending Listings</h3>
                <SearchBar
                  placeholder="Search listings..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductPage(1);
                  }}
                />
              </div>

              {pendingProducts.length === 0 ? (
                <Alert variant="info" className="border-0 shadow-sm">
                  No listings waiting for approval.
                </Alert>
              ) : currentProducts.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  No listings match your search.
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

            <RecentActivityTable events={recentAuditEvents} listing />
            <RecentActivityTable events={recentActivityEvents} />

            <section className="mt-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h4 mb-0">Approved Users</h3>
                <SearchBar
                  placeholder="Search approved users..."
                  value={approvedUserSearch}
                  onChange={(e) => {
                    setApprovedUserSearch(e.target.value);
                    setApprovedUserPage(1);
                  }}
                />
              </div>

              {approvedUsers.length === 0 ? (
                <Alert variant="info" className="border-0 shadow-sm">
                  No approved users.
                </Alert>
              ) : currentApprovedUsers.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  No approved users match your search.
                </Alert>
              ) : (
                <>
                  <UserTable
                    users={currentApprovedUsers}
                    onToggleActive={handleToggleUserActive}
                    readOnly
                  />
                  <PaginationBar
                    currentPage={approvedUserPage}
                    totalPages={totalApprovedUserPages}
                    onPageChange={setApprovedUserPage}
                  />
                </>
              )}
            </section>

            <section className="mt-5">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3 className="h4 mb-0">Listing Audit</h3>
                <SearchBar
                  placeholder="Search listings, companies, or sellers..."
                  value={listingSearch}
                  onChange={(e) => {
                    setListingSearch(e.target.value);
                    setListingPage(1);
                  }}
                />
              </div>

              {allProducts.length === 0 ? (
                <Alert variant="info" className="border-0 shadow-sm">
                  No listings found.
                </Alert>
              ) : currentAuditProducts.length === 0 ? (
                <Alert variant="warning" className="border-0 shadow-sm">
                  No listings match your search.
                </Alert>
              ) : (
                <>
                  <ProductsTable
                    products={currentAuditProducts}
                    onToggleActive={handleToggleProductActive}
                    onViewAudit={handleViewAudit}
                    readOnly
                    auditMode
                  />
                  <PaginationBar
                    currentPage={listingPage}
                    totalPages={totalListingPages}
                    onPageChange={setListingPage}
                  />
                </>
              )}
            </section>
          </>
        )}
      </Container>

      <Modal
        show={Boolean(auditProduct)}
        onHide={() => setAuditProduct(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Listing History: {auditProduct?.name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isAuditLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" />
              <p className="mt-2 mb-0">Loading listing history...</p>
            </div>
          ) : auditEvents.length === 0 ? (
            <Alert variant="info" className="mb-0">
              No history has been recorded for this listing yet.
            </Alert>
          ) : (
            <Accordion>
              {auditEvents.map((event) => (
                <Accordion.Item eventKey={String(event.id)} key={event.id}>
                  <Accordion.Header>
                    <span className="me-2">{event.action}</span>
                    <Badge bg="secondary">
                      {new Date(event.createdAt).toLocaleString()}
                    </Badge>
                  </Accordion.Header>
                  <Accordion.Body>
                    <p className="mb-2">
                      <strong>By:</strong> {event.actorName}
                      {event.actorEmail ? ` (${event.actorEmail})` : ""}
                      {" - "}
                      {event.actorRole}
                    </p>
                    {event.previousData && (
                      <div className="mb-3">
                        <strong>Before</strong>
                        <pre className="bg-light border rounded p-2 mt-1 mb-0 text-wrap">
                          {JSON.stringify(event.previousData, null, 2)}
                        </pre>
                      </div>
                    )}
                    {event.currentData && (
                      <div>
                        <strong>After</strong>
                        <pre className="bg-light border rounded p-2 mt-1 mb-0 text-wrap">
                          {JSON.stringify(event.currentData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AdminPage;
