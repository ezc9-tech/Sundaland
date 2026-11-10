import {jest, describe, test, expect} from "@jest/globals";
import express from "express";
import request from "supertest";

jest.unstable_mockModule("../utils/prisma.ts", () => ({
    prisma: {},
}));

jest.unstable_mockModule("../utils/activityLog.js", () => ({
    recordActivity: jest.fn(),
}));

const stub = (name) =>
    jest.fn((req, res) =>
    res.json({handler: name, id: req.params.id ?? null, user: req.user ?? null})
    );

jest.unstable_mockModule("../routes/orderRoutes.js", ()=> ({
    createOrder: stub("createOrder"),
    getOrders: stub("getOrders"),
    requestRefund: stub("requestRefund"),
    approveRefund: stub("approveRefund"),
    denyRefund: stub("denyRefund"),
    getRefundRequests: stub("getRefundRequests"),
    getSales: stub("getSales"),
}));

jest.unstable_mockModule("../middleware/auth.js", ()=> ({
    verifyToken: (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({error: "Access denied. No token provided."});     
        }
        req.user = {userId: 1, role: "buyer"};
        next();
    },
}));

const {default: orderRoutes} = await import("../controllers/orderController.js");
const app = express();
app.use(express.json());
app.use("/api/orders", orderRoutes);

const AUTH = {Authorization: "Bearer test-token"};

describe("Order Routes,", () => {
    describe("protected routes reject requests without a token", () => {
        test.each([
            ["post", "/api/orders"],
            ["get", "/api/orders"],
            ["patch", "/api/orders/5/refund"],
        ])("%s %s returns 401", async (method, path) => {
            const res = await request(app)[method](path);
            expect(res.status).toBe(401);
        });
    });

    describe("protected routes reach the right handler with a token", () => {
        test("POST /api/orders goes to createOrder", async () => {
            const res = await request(app).post("/api/orders").set(AUTH).send({});
            expect(res.status).toBe(200);
            expect(res.body.handler).toBe("createOrder");
        });
        test("GET /api/orders goes to getOrders", async () => {
            const res = await request(app).get("/api/orders").set(AUTH);
            expect(res.status).toBe(200);
            expect(res.body.handler).toBe("getOrders");
        });
        test("PATCH /api/orders/:id/refund goes to requestRefund with order id", async () => {
            const res = await request(app).patch("/api/orders/12/refund").set(AUTH).send({});
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({handler: "requestRefund", id: "12"});
        });
        test("the handler sees the user set by veryfiytoken", async() => {
            const res = await request(app).get("/api/orders").set(AUTH);
            expect(res.body.user).toEqual({userId: 1, role: "buyer"});
        });
    });
});