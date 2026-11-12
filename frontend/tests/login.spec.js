import {test, expect} from "@playwright/test";

test("Buyer can log in and reaches shop", async ({page}) => {
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
    await page.getByLabel("Password").fill("1234");
    await page.getByRole("button", {name: "Login"}).click();
    await expect(page.getByPlaceholder("Search products")).toBeVisible();
});