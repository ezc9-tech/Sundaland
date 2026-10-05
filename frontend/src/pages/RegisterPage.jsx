import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

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
          user_type: data.role,
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          address: data.address,
          date_of_birth: data.date_of_birth,
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
      <div className="register-container">
        <img src="/logo.jpg" alt="Sundaland Logo" />
        <h1>Register</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="first_name">First Name:</label>
          <input
            type="text"
            name="first_name"
            id="first_name"
            placeholder="John"
            required
          />

          <label htmlFor="last_name">Last Name:</label>
          <input
            type="text"
            name="last_name"
            id="last_name"
            placeholder="Doe"
            required
          />

          <label htmlFor="email">Email:</label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email@gmail.com"
            required
          />

          <label htmlFor="phone_number">Phone Number:</label>
          <input
            type="tel"
            name="phone_number"
            id="phone_number"
            placeholder="555-123-4567"
            required
          />

          <label htmlFor="address">Address:</label>
          <input
            type="text"
            name="address"
            id="address"
            placeholder="123 Main St"
            required
          />

          <label htmlFor="date_of_birth">Date of Birth:</label>
          <input type="date" name="date_of_birth" id="date_of_birth" required />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="******"
            required
          />

          <label htmlFor="confirm-password">Confirm Password:</label>
          <input
            type="password"
            name="confirm-password"
            id="confirm-password"
            placeholder="******"
            required
          />

          <label htmlFor="role">Role:</label>
          <select
            name="role"
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Admin</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
          </select>

          {role === "seller" && (
            <>
              <label htmlFor="store-name">Company Name:</label>
              <input
                type="text"
                name="store-name"
                id="store-name"
                placeholder="Enter store name (Optional)"
              />
            </>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </button>

          <span>
            Already have an account? <Link to="/login">Login here!</Link>
          </span>
        </form>
      </div>
    </>
  );
}

export default RegisterPage;
