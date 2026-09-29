import { Link } from "react-router-dom";
import { useState } from "react";

function RegisterPage() {
  const [role, setRole] = useState("buyer");

  return (
    <>
      <div className="register-container">
        <img src="/logo.jpg" alt="Sundaland Logo" />
        <h1>Register</h1>
        <form action="">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="Email@gmail.com"
          />

          <label htmlFor="username">Username:</label>
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Username"
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="******"
          />

          <label htmlFor="confirm-password">Confirm Password:</label>
          <input
            type="password"
            name="confirm-password"
            id="confirm-password"
            placeholder="******"
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
          <button type="submit">Register</button>
          <span>
            Already have an account? <Link to="/login">Login here!</Link>
          </span>
        </form>
      </div>
    </>
  );
}

export default RegisterPage;
