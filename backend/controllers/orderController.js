import {Router} from "express";
import {
    createOrder,
    getOrders,
    requestRefund,
    getRefundRequests,
    approveRefund,
    denyRefund,
    getSales,
} from "../routes/orderRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const orderRoutes = Router();

orderRoutes.use(verifyToken);
orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.get("/refunds", getRefundRequests);
orderRoutes.get("/sales", getSales);
orderRoutes.patch("/:id/refund", requestRefund);
orderRoutes.patch("/:id/refund/approve", approveRefund);
orderRoutes.patch("/:id/refund/deny", denyRefund);
export default orderRoutes;