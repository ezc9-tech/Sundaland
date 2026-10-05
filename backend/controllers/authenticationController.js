import { Router } from "express";
import { testQuery } from "../routes/authenticationRoutes.js";

const authRoutes = Router()

authRoutes.get("/", testQuery);

export default authRoutes;
