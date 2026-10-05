import { Router } from "express";
import { register } from "../routes/authenticationRoutes.js";

const authRoutes = Router()

authRoutes.post("/register", register);

export default authRoutes;
