import {Router} from "express";
import {createOrder, getOrders} from "../routes/orderRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const orderRoutes = Router();

orderRoutes.use(verifyToken);
orderRoutes.post("/",createOrder);
orderRoutes.post("/", createOrder);
orderRoutes.get("/", getOrders);
export default orderRoutes;