import { Router } from "express";
import { helloWorld } from "../routes/authenticationRoutes.js";

const authRoutes = Router()

authRoutes.get("/", helloWorld);

export default authRoutes;
