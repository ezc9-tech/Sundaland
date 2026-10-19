import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
} from "../routes/productRoutes.js";

const productRoutes = Router();

productRoutes.post("/", createProduct);
productRoutes.get("/", getProducts);
productRoutes.get("/:id", getProductById);
export default productRoutes;
