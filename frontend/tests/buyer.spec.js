import {test, expect} from "@playwright/test";

test.describe.configure({mode: "serial"});

async function loginAsBuyer(page) {
    await page.goto("http://localhost:5173/login");
    await page.getByLabel("Email address").fill("bob.buyer@gmail.com");
    await page.getByLabel("Password").fill("1234");
    await page.getByRole("button", {name: "Login"}).click();
    await expect(page.getByPlaceholder("Search products")).toBeVisible();
}


test("Buyer can buy a product and see it in their order history", async ({page}) => {
    await loginAsBuyer(page);
    await page.getByRole("link", {name: /Ultra Wireless Mouse/}).first().click();
    await expect(page.getByRole("heading", {name: "Ultra Wireless Mouse"})).toBeVisible();
    
    await page.getByRole("button", {name: "+"}).click();
    await page.getByRole("button", {name: "Buy now"}).click();

    await page.getByLabel("Name on card").fill("Bob Buyer");
    await page.getByLabel("Card number").fill("4242 4242 4242 4242");
    await page.getByLabel("Expiration date").fill("10/32");
    await page.getByLabel("cvv").fill("123");
    await page.getByLabel("Billing address").fill("123 Main St");
    await page.getByLabel("State").fill("TX");
    await page.getByLabel("ZIP code").fill("76201");
    await page.getByRole("button", {name: "Submit payment info and place order"}).click();

    await expect(page.getByText("Thank you! Your order was placed")).toBeVisible();

    await page.goto("http://localhost:5173/orders");
    await expect(page.getByText("2 x Ultra Wireless Mouse").first()).toBeVisible();
});

test("Buyer can request a refund with a reason", async ({page}) => {
    await loginAsBuyer(page);
    await page.goto("http://localhost:5173/orders");

    await page.getByRole("button", {name: "Request refund"}).first().click();
    await page.getByPlaceholder("Why are you refunding?").fill("Broken");
    await page.getByRole("button", {name: "Submit", exact: true}).click();

    await expect(page.getByText("Refund requested")).toBeVisible();
    await expect(page.getByText(/REFUND.REQUESTED/i).first()).toBeVisible();
});
test("Buyer can request a second refund", async ({page}) => {
    await loginAsBuyer(page);
    await page.goto("http://localhost:5173/orders");

    await page.getByRole("button", {name: "Request refund"}).first().click();
    await page.getByPlaceholder("Why are you refunding?").fill("Don't want");
    await page.getByRole("button", {name: "Submit", exact: true}).click();

    await expect(page.getByText("Refund requested")).toBeVisible();
    await expect(page.getByText(/REFUND.REQUESTED/i)).toHaveCount(2);
});