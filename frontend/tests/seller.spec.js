import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function loginAsSeller(page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("sarah@techstore.com");
  await page.getByLabel("Password").fill("1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByRole("heading", { name: "Seller Dashboard" }),
  ).toBeVisible();
}

test("Seller can log in and see the seller dashboard", async ({ page }) => {
  await loginAsSeller(page);
});

test("Seller can create a listing", async ({ page }) => {
  await loginAsSeller(page);

  await page.getByRole("button", { name: "+ New Listing" }).click();
  await page.getByLabel("Product Name").fill("Test product");
  await page.getByLabel("Price").fill("20");
  await page.getByLabel("Inventory").fill("20");
  await page.getByLabel("Category").selectOption("Electronics");
  await page.getByLabel("Description").fill("This is a test product.");
  await page.getByRole("button", { name: "Create Listing" }).click();

  await expect(page.getByText("Listing created!")).toBeVisible();
  await expect(
    page.getByRole("row", { name: /Test product/ }).first(),
  ).toContainText("Pending");
});

test("Seller can approve a refund request", async ({ page }) => {
  await loginAsSeller(page);

  const refundRow = page.getByRole("row", { name: /Broken/ }).first();
  await expect(refundRow).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await refundRow.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Refund approved.")).toBeVisible();
});

test("Seller can deny a refund request", async ({ page }) => {
  await loginAsSeller(page);

  const refundRow = page.getByRole("row", { name: /Don't want/ }).first();
  await expect(refundRow).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await refundRow.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByText("Refund denied.")).toBeVisible();
});

test("Seller can edit price and inventory", async ({ page }) => {
  await loginAsSeller(page);

  const listingRow = page
    .getByRole("row")
    .filter({ hasText: "Pro Mechanical Keyboard" })
    .filter({ has: page.getByRole("button", { name: "Edit" }) });

  await listingRow.getByRole("button", { name: "Edit" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit Listing" }),
  ).toBeVisible();

  await page.getByLabel("Price").fill("99.99");
  await page.getByLabel("Inventory").fill("40");
  await page.getByRole("button", { name: "Save Changes" }).click();

  await expect(page.getByText("Listing updated!")).toBeVisible();
  await expect(listingRow).toContainText("$99.99");
  await expect(listingRow).toContainText("40");
});
