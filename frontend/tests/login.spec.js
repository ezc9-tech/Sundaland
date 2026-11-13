import { test, expect } from "@playwright/test";

async function mockLogin(page, status, body) {
  await page.route("http://localhost:3000/api/login", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    }),
  );
}

test("Buyer can log in and reaches shop", async ({ page }) => {
  await mockLogin(page, 200, {
    token: "test-token",
    user: { id: 1, firstName: "Bob", lastName: "Buyer", role: "buyer" },
  });
  await page.route("http://localhost:3000/api/products", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ products: [] }),
    }),
  );

  await page.goto("/login");
  await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
  await page.getByLabel("Password").fill("1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByPlaceholder("Search products")).toBeVisible();
});

test("Wrong password gives an error and stays on login", async ({ page }) => {
  await mockLogin(page, 401, { error: "Invalid Credentials" });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Invalid Credentials")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
