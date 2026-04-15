import { test, expect } from "@playwright/test";

test.describe("Dashboard (auth required)", () => {
  test("redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("redirects from nested routes to /login", async ({ page }) => {
    await page.goto("/charts");
    await page.waitForURL("**/login");
    expect(page.url()).toContain("/login");
  });

  test("page has proper title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/BK CRYPTO/);
  });
});
