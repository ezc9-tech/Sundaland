import {Router} from "express";
import {
    getReviews,
    getReviewSummary,
    createReview,
    flagReview,
} from "../routes/reviewRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const reviewRoutes = Router();
reviewRoutes.get("/summary", getReviewSummary);
reviewRoutes.get("/product/:id", verifyToken, getReviews);
reviewRoutes.post("/", verifyToken, createReview);
reviewRoutes.patch("/:id/flag", verifyToken, flagReview);

export default reviewRoutes;