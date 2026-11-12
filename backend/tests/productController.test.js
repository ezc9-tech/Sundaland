import { jest, describe, test, expect } from "@jest/globals";
import express from "express";
import request from "supertest";

const stub = (name) =>
  jest.fn((req, res) =>
    res.json({ handler: name, id: req.params.id ?? null, user: req.user ?? null })
  );

jest.unstable_mockModule("../routes/productRoutes.js", () => ({
  getProducts: stub("getProducts"),
  getProductTags: stub("getProductTags"),
  getProductById: stub("getProductById"),
  createProduct: stub("createProduct"),
  getMyProducts: stub("getMyProducts"),
  getMyProduct: stub("getMyProduct"),
  updateProduct: stub("updateProduct"),
  deleteProduct: stub("deleteProduct"),
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

const { default: productRoutes } = await import("../controllers/productController.js");

const app = express();
app.use(express.json());
app.use("/api/products", productRoutes);

const AUTH = { Authorization: "Bearer test-token" };

describe("public routes (no token needed)", () => {
  test("GET / lists products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe("getProducts");
  });

  test("GET /tags lists product tags", async () => {
    const res = await request(app).get("/api/products/tags");
    expect(res.status).toBe(200);
    expect(res.body.handler).toBe("getProductTags");
  });

  test("GET /:id returns one product", async () => {
    const res = await request(app).get("/api/products/5");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ handler: "getProductById", id: "5" });
  });
});

describe("protected routes reject requests without a token", () => {
  test.each([
    ["post", "/api/products"],
    ["get", "/api/products/mine"],
    ["get", "/api/products/mine/5"],
    ["patch", "/api/products/5"],
    ["delete", "/api/products/5"],
  ])("%s %s returns 401", async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe("protected routes reach the right handler with a token", () => {
  test("POST / creates a product", async () => {
    const res = await request(app).post("/api/products").set(AUTH).send({});
    expect(res.body.handler).toBe("createProduct");
  });

  test("GET /mine goes to getMyProducts, not getProductById", async () => {
    const res = await request(app).get("/api/products/mine").set(AUTH);
    expect(res.body.handler).toBe("getMyProducts");
  });

  test("GET /mine/:id goes to getMyProduct", async () => {
    const res = await request(app).get("/api/products/mine/5").set(AUTH);
    expect(res.body).toMatchObject({ handler: "getMyProduct", id: "5" });
  });

  test("PATCH /:id updates", async () => {
    const res = await request(app).patch("/api/products/5").set(AUTH).send({});
    expect(res.body).toMatchObject({ handler: "updateProduct", id: "5" });
  });

  test("DELETE /:id deletes", async () => {
    const res = await request(app).delete("/api/products/5").set(AUTH);
    expect(res.body).toMatchObject({ handler: "deleteProduct", id: "5" });
  });

  test("the handler sees the user set by verifyToken", async () => {
    const res = await request(app).get("/api/products/mine").set(AUTH);
    expect(res.body.user).toEqual({ id: 7, role: "seller" });
  });
});