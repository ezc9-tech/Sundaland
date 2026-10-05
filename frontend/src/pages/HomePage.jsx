import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";

function HomePage() {
  const [pendingUsers, setPendingUsers] = useState([]);
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

  useEffect(() => {
    const fetchPendingUsers = async () => {
      const token = localStorage.getItem("token");

      if (!token || !currentUser) {
        navigate("/login");
        return;
      }

      if (currentUser.user_type !== "admin") {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:3000/api/admin/pending-users",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch pending users");
        }

        const data = await response.json();
        setPendingUsers(data.users);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingUsers();
  }, [navigate, currentUser]);

  const handleApprove = async (userId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/approve/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to approve user");

      toast.success("User approved successfully!");
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDeny = async (userId) => {
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) throw new Error("Failed to deny user");

      toast.success("User denied and removed.");
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (currentUser && currentUser.user_type !== "admin") {
    return (
      <div>
        <Navbar />
        <main className="under-construction">
          <h1 className="construction-icon">🚧</h1>
          <h2>Under Construction</h2>
          <p className="construction-text">
            The {currentUser.user_type} dashboard is currently being built.
            Check back soon!
          </p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Toaster position="top-center" />

      <main className="dashboard-container">
        <h1>Admin Dashboard</h1>
        <h2>Pending Account Approvals</h2>

        {isLoading ? (
          <p>Loading pending accounts...</p>
        ) : pendingUsers.length === 0 ? (
          <p>No accounts are currently waiting for approval.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Requested On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.login?.email}</td>
                  <td>
                    <span className="role-badge">{user.user_type}</span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="table-actions">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="approve-btn"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDeny(user.id)}
                      className="deny-btn"
                    >
                      Deny
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}

export default HomePage;
