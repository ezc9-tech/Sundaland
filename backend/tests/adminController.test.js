import { afterAll, beforeEach, describe, expect, jest, test } from "@jest/globals";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";

const prisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule("../utils/prisma.ts", () => ({ prisma }));

const { default: adminRoutes } = await import("../controllers/adminController.js");

const app = express();
app.use("/api/admin", adminRoutes);

const previousJwtSecret = process.env.JWT_SECRET;
process.env.JWT_SECRET = "admin-route-test-secret";

function tokenFor(role = "admin", userId = 1) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET);
}

beforeEach(() => {
  jest.resetAllMocks();
  prisma.user.findUnique.mockResolvedValue({ isActive: true });
  prisma.user.findMany.mockResolvedValue([]);
});

afterAll(() => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }
});

describe("admin route access control", () => {
  test("rejects requests without a bearer token", async () => {
    const res = await request(app).get("/api/admin/approved-users");

    expect(res.status).toBe(401);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  test("rejects invalid bearer tokens", async () => {
    const res = await request(app)
      .get("/api/admin/approved-users")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  test("rejects authenticated non-admin users", async () => {
    const res = await request(app)
      .get("/api/admin/approved-users")
      .set("Authorization", `Bearer ${tokenFor("seller", 7)}`);

    expect(res.status).toBe(403);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { isActive: true },
    });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  test("rejects disabled admin accounts before reaching a handler", async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: false });

    const res = await request(app)
      .get("/api/admin/approved-users")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(res.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  test("allows an active admin to reach the requested handler", async () => {
    const approvedUsers = [{ id: 4, approved: true }];
    prisma.user.findMany.mockResolvedValue(approvedUsers);

    const res = await request(app)
      .get("/api/admin/approved-users")
      .set("Authorization", `Bearer ${tokenFor()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ approvedUsers });
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { approved: true },
      include: { login: { select: { email: true } } },
    });
  });
});
