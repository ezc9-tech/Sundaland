import { Router } from "express";
import { login, register } from "../routes/authenticationRoutes.js";

const authRoutes = Router()

authRoutes.post("/register", register);
authRoutes.post("/login", login)

export default authRoutes;
