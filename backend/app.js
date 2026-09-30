import express from "express";
import authRoutes from "./controllers/authenticationController.js";
import cors from 'cors';

const app = express();

//Middleware
app.use(express.json())
app.use(cors())

//Routes
app.use('/api', authRoutes)

export default app;