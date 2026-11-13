import {test, expect} from "@playwright/test";

async function loginAsAdmin(page) {
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Email address").fill("admin@marketplace.com");
    await page.getByLabel("Password").fill("1234");
    await page.getByRole("button", {name: "Login"}).click();
    await expect(page.getByRole("heading", {name: "Admin Dashboard"})).toBeVisible();
}

test("Admin can log in and see the admin dashboard", async ({page}) => {
    await loginAsAdmin(page);
});

test("Admin can approve a pending listing", async ({page}) => {
    await loginAsAdmin(page);

    const row = page.getByRole("row", {name: /Prototype VR Headset/}).first();
    await row.getByRole("button", {name: "Approve"}).click();

    await expect(page.getByText("Product approved successfully!")).toBeVisible();
});

test("Admin can approve a pending account", async ({ page}) => {
    await loginAsAdmin(page);
    const row = page.getByRole("row", {name: /alice\.new@yahoo\.com/}).first();
    await row.getByRole("button", {name: "Approve"}).click();

    await expect(page.getByText("User approved successfully!")).toBeVisible();
});

test("Admin can deny a pending listing", async ({page}) => {
    await loginAsAdmin(page);

    const row = page.getByRole("row", {name: /Refurbished Budget Laptop/}).first();
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", {name: "Deny"}).click();
    await expect(page.getByText("Product denied and removed.")).toBeVisible();
});

test("Admin can deny a pending account", async ({ page}) => {
    await loginAsAdmin(page);
    const row = page.getByRole("row", {name: /m\.vance@retailhub\.net/}).first();
    page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", {name: "Deny"}).click();

    await expect(page.getByText("User denied and removed.")).toBeVisible();
});