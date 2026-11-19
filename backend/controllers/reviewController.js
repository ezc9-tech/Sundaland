import {Router} from "express";
import {
    getReviews,
    getReviewSummary,
    createReview,
    flagReview,
    unflagReview,
} from "../routes/reviewRoutes.js";
import {verifyToken} from "../middleware/auth.js";

const reviewRoutes = Router();
reviewRoutes.get("/summary", getReviewSummary);
reviewRoutes.get("/product/:id", verifyToken, getReviews);
reviewRoutes.post("/", verifyToken, createReview);
reviewRoutes.patch("/:id/flag", verifyToken, flagReview);
reviewRoutes.patch("/:id/unflag", verifyToken, unflagReview);

export default reviewRoutes;