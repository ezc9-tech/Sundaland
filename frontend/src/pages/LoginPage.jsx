import { Link } from "react-router-dom";

function LoginPage() {
  return (
    <>
      <div className="login-container">
        <img src="/logo.jpg" alt="Sundaland Logo" />
        <h1>Login</h1>
        <form action="">
          <label htmlFor="email_username">Username or Email:</label>
          <input
            type="text"
            name="email_username"
            id="email_username"
            placeholder="Username"
          />
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="******"
          />
          <button type="submit">Login</button>
          <span>
            Don't have an account? <Link to="/register">Register here!</Link>
          </span>
        </form>
      </div>
    </>
  );
}

export default LoginPage;
