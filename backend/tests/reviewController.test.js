import {jest, describe, test, expect} from "@jest/globals";
import express from "express";
import request from "supertest";

const stub = (name) =>
  jest.fn((req, res) =>
    res.json({ handler: name, id: req.params.id ?? null, user: req.user ?? null })
  );

  jest.unstable_mockModule("../routes/reviewRoutes.js", () => ({
    getReviews: stub("getReviews"),
    getReviewSummary: stub("getReviewSummary"),
    createReview: stub("createReview"),
    flagReview: stub("flagReview"),
}));

jest.unstable_mockModule("../middleware/auth.js", () => ({
  verifyToken: (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }
    req.user = { id: 7, role: "seller" };
    next();
  },
}));

const { default: reviewRoutes } = await import("../controllers/reviewController.js");

const app = express();
app.use(express.json());
app.use("/api/reviews", reviewRoutes);

const AUTH = {Authorization: "Bearer test-token"};

describe("public routes (no token needed)", () => {
    test("GET /summary returns the rating summary", async () => {
        const res = await request(app).get("/api/reviews/summary");
        expect(res.status).toBe(200);
        expect(res.body.handler).toBe("getReviewSummary");
      });
});

describe("routes that need a token", () => {
    test("GET /product/:id is rejected without a token", async () => {
        const res = await request(app).get("/api/reviews/product/3");
        expect(res.status).toBe(401);
    });
    test("GET /product/:id lists reivews with a token", async () => {
        const res = await request(app).get("/api/reviews/product/3").set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.handler).toBe("getReviews");
        expect(res.body.id).toBe("3");
    });
    test("POST / is rejected without a token", async () => {
        const res = await request(app).post("/api/reviews").send({});
        expect(res.status).toBe(401);
    });
    test("POST / creates a review with a token", async () => {
        const res = await request(app).post("/api/reviews").set(AUTH).send({});
        expect(res.status).toBe(200);
        expect(res.body.handler).toBe("createReview");
    });
    test("PATCH /:id/flag is rejected without a token", async () => {
        const res = await request(app).patch("/api/reviews/5/flag");
        expect(res.status).toBe(401);
    });
    test("PATCH /:id/flag flags a review with a token", async () => {
        const res = await request(app).patch("/api/reviews/5/flag").set(AUTH);
        expect(res.status).toBe(200);
        expect(res.body.handler).toBe("flagReview");
        expect(res.body.id).toBe("5");
    });
});

