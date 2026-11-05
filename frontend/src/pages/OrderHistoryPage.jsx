import Navbar from "../components/Navbar";
import {Container, Button} from "react-bootstrap";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import toast, {Toaster} from "react-hot-toast";

const refundable = ["PAID", "SHIPPED", "DELIVERED"];
function OrderHistoryPage() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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
        const loadOrders = async () => {
            const token = localStorage.getItem("token");
            if(!token || !currentUser) {
                navigate("/login");
                return;
            }
            if (currentUser.role !== "buyer") {
                navigate("/");
                return;
            }
            try {
                const response = await fetch("http://localhost:3000/api/orders", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if(!response.ok) {
                    throw new Error("Failed to fetch your orders");
                }
                const data = await response.json();
                setOrders(data.orders || []);
            } catch (error) {
                toast.error(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrders();
    }, [navigate, currentUser]);
    const handleRefund = async (orderId) => {
        if(!window.confirm("Confirm refund request for this order?")) return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:3000/api/orders/${orderId}/refund`, {
                method: "PATCH",
                headers: {Authorization: `Bearer ${token}`},
            });
            const data = await response.json();
            if(!response.ok) {
                throw new Error(data.error || "Refund request failed")
            }
            toast.success("Refund requested.");
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            toast.error(error.message);
        }
    };
    if (isLoading) {
        return <p>Loading orders...</p>;
    }
    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa"}}>
            <Navbar />
            <Toaster position="top-center" />
            <Container>
                <div className="d-flex justify-content-between align-items-center">
                    <h1 style={{ fontWeight: 700}}>Order history</h1>
                    <Button variant="primary" onClick={() => navigate("/")}>
                        Back to shop
                    </Button>
                </div>
                <div
                    style={{
                        display: "grid",
                        gap: "20px",
                        marginTop: "20px",
                    }}
                >
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            style={{
                                backgroundColor: "white",
                                borderRadius: "8px",
                                padding: "24px",
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <div style={{ fontWeight: 600}}>Order #{order.id}</div>
                                <div>{order.status}</div>
                            </div>
                            <div style={{ color: "#6b7680"}}>
                                {new Date(order.orderDate).toLocaleDateString()}, shipped to {order.shippingAddress}
                            </div>
                            {order.items.map((item) => (
                                <div key={item.id}>
                                    {item.quantity} x {item.product.name}, ${Number(item.priceAtPurchase).toFixed(2)}
                                </div>
                            ))}
                            <div style={{ fontWeight: 600 }}>
                                Total: ${Number(order.totalCost).toFixed(2)}
                                {refundable.includes(order.status) && (
                                    <Button variant="outline-danger" size="sm" onClick={() => handleRefund(order.id)}>
                                        Request refund
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </div>
    );
}


export default OrderHistoryPage;