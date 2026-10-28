import express from "express";
import authRoutes from "./controllers/authenticationController.js";
import cors from 'cors';
import adminRoutes from "./controllers/adminController.js";
import productRoutes from "./controllers/productController.js";
import orderRoutes from "./controllers/orderController.js";

const app = express();

//Middleware
app.use(express.json())
app.use(cors())

//Routes
app.use('/api', authRoutes)
app.use('/api/admin', adminRoutes)
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

export default app;