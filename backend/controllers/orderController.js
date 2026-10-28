import {Router} from "express";
import {createOrder} from "../routes/orderRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const orderRoutes = Router();

orderRoutes.use(verifyToken);
orderRoutes.post("/",createOrder);
export default orderRoutes;