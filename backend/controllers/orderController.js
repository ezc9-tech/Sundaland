import {Router} from "express";
import {createOrder, getOrders, requestRefund} from "../routes/orderRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const orderRoutes = Router();

orderRoutes.use(verifyToken);
orderRoutes.post("/",createOrder);
orderRoutes.get("/", getOrders);
orderRoutes.patch("/:id/refund", requestRefund);
export default orderRoutes;