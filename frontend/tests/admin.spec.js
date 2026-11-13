import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import process from "node:process";
import { test as base, expect } from "@playwright/test";

const requireBackend = createRequire(
  new URL("../../backend/package.json", import.meta.url),
);

const test = base.extend({
  // Playwright requires fixtures to destructure their dependencies.
  // eslint-disable-next-line no-empty-pattern
  db: async ({}, runFixture) => {
    requireBackend("dotenv").config({
      path: new URL("../../backend/.env", import.meta.url),
      quiet: true,
    });
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for the admin E2E tests");
    }

    const { prisma } = await import("../../backend/utils/prisma.ts");
    try {
      await runFixture(prisma);
    } finally {
      await prisma.$disconnect();
    }
  },

  pendingUser: async ({ db }, runFixture) => {
    const email = `admin-e2e-${randomUUID()}@example.com`;
    const user = await db.user.create({
      data: {
        firstName: "E2E",
        lastName: "Pending User",
        phoneNumber: "555-0100",
        role: "buyer",
        address: "Test address",
        dateOfBirth: new Date("1990-01-01"),
        login: { create: { email } },
      },
    });
    try {
      await runFixture({ ...user, email });
    } finally {
      await db.activityLog.deleteMany({ where: { subjectId: user.id } });
      await db.user.deleteMany({ where: { id: user.id } });
    }
  },

  pendingProduct: async ({ db }, runFixture) => {
    const suffix = randomUUID();
    const company = await db.company.create({
      data: {
        name: `E2E company ${suffix}`,
        address: "Test address",
        phoneNumber: "555-0100",
        products: {
          create: {
            name: `E2E pending listing ${suffix}`,
            price: 20,
            description: "Test listing",
            inventory: 1,
          },
        },
      },
      include: { products: true },
    });
    const product = company.products[0];
    try {
      await runFixture(product);
    } finally {
      await db.productAuditLog.deleteMany({ where: { productId: product.id } });
      await db.company.deleteMany({ where: { id: company.id } });
    }
  },
});

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@marketplace.com");
  await page.getByLabel("Password").fill("1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("heading", { name: "Admin Dashboard" }),
  ).toBeVisible();
}

async function pendingRow(page, type, value) {
  const isUser = type === "user";
  await page
    .getByPlaceholder(isUser ? "Search users..." : "Search listings...")
    .fill(value);
  return page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: isUser ? "Pending Accounts" : "Pending Listings",
      }),
    })
    .getByRole("row")
    .filter({ hasText: value });
}

async function performAction(page, row, action, method, path) {
  if (action === "Deny") {
    page.once("dialog", (dialog) => dialog.accept());
  }
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path &&
      response.request().method() === method,
  );
  await row.getByRole("button", { name: action, exact: true }).click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(200);
}

test("Admin can log in and see the admin dashboard", async ({ page }) => {
  await loginAsAdmin(page);
});

test("Admin can approve a pending listing", async ({
  page,
  db,
  pendingProduct,
}) => {
  await loginAsAdmin(page);
  const row = await pendingRow(page, "product", pendingProduct.name);
  await performAction(
    page, row, "Approve", "PATCH", `/api/admin/approve-product/${pendingProduct.id}`,
  );
  await expect(page.getByText("Product approved successfully!")).toBeVisible();
  await expect(row).toHaveCount(0);
  expect(
    (await db.product.findUniqueOrThrow({ where: { id: pendingProduct.id } }))
      .approved,
  ).toBe(true);
});

test("Admin can approve a pending account", async ({ page, db, pendingUser }) => {
  await loginAsAdmin(page);
  const row = await pendingRow(page, "user", pendingUser.email);
  await performAction(
    page, row, "Approve", "PATCH", `/api/admin/approve-user/${pendingUser.id}`,
  );
  await expect(page.getByText("User approved successfully!")).toBeVisible();
  await expect(row).toHaveCount(0);
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: pendingUser.id } })).approved,
  ).toBe(true);
});

test("Admin can deny a pending listing", async ({
  page,
  db,
  pendingProduct,
}) => {
  await loginAsAdmin(page);
  const row = await pendingRow(page, "product", pendingProduct.name);
  await performAction(
    page, row, "Deny", "DELETE", `/api/admin/deny-product/${pendingProduct.id}`,
  );
  await expect(page.getByText("Product denied and removed.")).toBeVisible();
  await expect(row).toHaveCount(0);
  expect(
    await db.product.findUnique({ where: { id: pendingProduct.id } }),
  ).toBeNull();
});

test("Admin can deny a pending account", async ({ page, db, pendingUser }) => {
  await loginAsAdmin(page);
  const row = await pendingRow(page, "user", pendingUser.email);
  await performAction(
    page, row, "Deny", "DELETE", `/api/admin/deny/${pendingUser.id}`,
  );
  await expect(page.getByText("User denied and removed.")).toBeVisible();
  await expect(row).toHaveCount(0);
  expect(await db.user.findUnique({ where: { id: pendingUser.id } })).toBeNull();
});
