import Navbar from "../components/Navbar";
import { Container } from "react-bootstrap";
import {useEffect, useState} from "react";
import {useNavigate, useParams} from "react-router-dom";
import toast, {Toaster} from "react-hot-toast";
import { isValid, isSecurityCodeValid} from 'creditcard.js';

function PaymentPage() {
  const navigate = useNavigate();
  const {id} = useParams();
  const [product, setProduct] = useState();

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
    const loadProduct = async() => {
      const token = localStorage.getItem("token");
      if(!token || !currentUser) {
        navigate ("/login");
        return;
      }
      if(currentUser.role !== "buyer") {
        navigate("/");
        return;
      }
      try {
        const response = await fetch(`http://localhost:3000/api/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
        }
      } catch(error) {
        console.log(error);
      }
    };
    loadProduct();
  }, [id, navigate, currentUser]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData=new FormData(e.target);
    const cardNum = formData.get("cardNum");
    const cvv = formData.get("cvv");
    const address = formData.get("address");
    const state = formData.get("state");
    const zip = formData.get("zip");
    if(!isValid(cardNum)) {
      toast.error("Invalid card number.");
      return;
    }
    if(!isSecurityCodeValid(cardNum, cvv)) {
      toast.error("cvv doesn't match card.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          shippingAddress: `${address}, ${state}, ${zip}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }
      toast.success("Thank you! Your order was placed.");
      setTimeout(() => {
        navigate("/buyer-dashboard");
      }, 2000);
    } catch (error) {
      toast.error(error.message);
    }


  };

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: "8px",
    marginBottom: "16px",
    border: "1px solid #ced4da",
    borderRadius: "4px",
  };
  if (!product) {
    return <p>Product not found.</p>;
  }
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <Navbar />
      <Toaster position="top-center"/>
      <Container>
        <h1 style={{ fontWeight: 700 }}>Payment info</h1>
        <p style={{fontWeight:600}}>Buying {product.name}, ${Number(product.price).toFixed(2)}</p>
        <p><span style={{color: "red"}}>*</span> indicates a required field.</p>
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: "480px",
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "8px",
          }}
        >
          <label>
            Name on card: <span style={{color: "red"}}>*</span>
            <input
              name="nameCard"
              placeholder="Bob Buyer"
              required
              style={inputStyle}
            />
          </label>
          <label>
            Card number: <span style={{color: "red"}}>*</span>
            <input
              name="cardNum"
              placeholder="4242 4242 4242 4242"
              required
              style={inputStyle}
            />
          </label>
          <label>
            Expiration date: (MM/YY) <span style={{color: "red"}}>*</span>
            <input
              name="expire"
              placeholder="10/32"
              required
              minLength={3}
              maxLength={5}
              style={inputStyle}
            />
          </label>
          <label>
            cvv: <span style={{color: "red"}}>*</span>
            <input
              name="cvv"
              placeholder="123"
              required
              style={inputStyle}
            />
          </label>
          <label>
            Billing address: <span style={{color: "red"}}>*</span>
            <input
              name="address"
              placeholder="123 Main St"
              required
              style={inputStyle}
            />
          </label>
          <label>
            State: <span style={{color: "red"}}>*</span>
            <input
              name="state"
              placeholder="TX"
              required
              minLength={2}
              maxLength={2}
              style={inputStyle}
            />
          </label>
          <label>
            ZIP code: <span style={{color: "red"}}>*</span>
            <input
              name="zip"
              placeholder="76201"
              required
              minLength={5}
              maxLength={9}
              style={inputStyle}
            />
          </label>
          <button type="submit">Submit payment info and place order</button>
        </form>
      </Container>
    </div>
  );
}

export default PaymentPage;
