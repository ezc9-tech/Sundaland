import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import {
    getProducts,
    getProductById,
    createProduct,
    getMyProducts,
    getMyProduct,
    updateProduct,
    deleteProduct
} from "../routes/productRoutes.js";

const productRoutes = Router()

productRoutes.get("/", getProducts);

productRoutes.post("/", verifyToken, createProduct);

productRoutes.get("/mine", verifyToken, getMyProducts);
productRoutes.get("/mine/:id", verifyToken, getMyProduct);

productRoutes.get("/:id", getProductById);

productRoutes.patch("/:id", verifyToken, updateProduct);
productRoutes.delete("/:id", verifyToken, deleteProduct);

export default productRoutes;