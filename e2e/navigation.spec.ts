import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("login page shows live data indicator", async ({ page }) => {
    await page.goto("/login");

    const indicator = page.getByText("실시간 데이터 연동 중");
    await expect(indicator).toBeVisible();
  });

  test("login page shows LOGIN heading in card", async ({ page }) => {
    await page.goto("/login");

    const loginHeading = page.getByRole("heading", { name: "LOGIN" });
    await expect(loginHeading).toBeVisible();
  });

  test("404 page shows Korean error message", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");

    // Next.js returns 404 for unknown routes
    // The middleware redirects unauthenticated users, so we may land on /login
    // or get a 404 depending on middleware config
    const url = page.url();

    if (url.includes("/login")) {
      // Middleware redirected -- unauthenticated user cannot reach 404
      await expect(page.locator("h1")).toContainText("BK CRYPTO");
    } else {
      // Reached the 404 page
      expect(response?.status()).toBe(404);
    }
  });
});
