import {test, expect} from "@playwright/test";

test("Buyer can log in and reaches shop", async ({page}) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
    await page.getByLabel("Password").fill("1234");
    await page.getByRole("button", {name: "Login"}).click();
    await expect(page.getByPlaceholder("Search products")).toBeVisible();
});

test("Wrong password gives an error and stays on login", async({page}) => {
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", {name: "Login"}).click();
    await expect(page.getByText("Invalid Credentials")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
})