import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("displays BK CRYPTO branding", async ({ page }) => {
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("BK CRYPTO");
    await expect(heading).toContainText("투자 분석 플랫폼");
  });

  test("shows password input and login button", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute(
      "placeholder",
      "비밀번호를 입력하세요",
    );

    const loginButton = page.getByRole("button", { name: "로그인" });
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toBeEnabled();
  });

  test("shows feature cards section", async ({ page }) => {
    const featuresHeading = page.getByText("주요 기능");
    await expect(featuresHeading).toBeVisible();

    const featureCards = page.locator("h3");
    await expect(featureCards.filter({ hasText: "실시간 시장 데이터" })).toBeVisible();
    await expect(featureCards.filter({ hasText: "리스크 분석" })).toBeVisible();
    await expect(featureCards.filter({ hasText: "AI 뉴스 분석" })).toBeVisible();
    await expect(featureCards.filter({ hasText: "백테스트 & DCA" })).toBeVisible();
  });

  test("shows error on wrong password", async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill("wrong-password-123");

    const loginButton = page.getByRole("button", { name: "로그인" });
    await loginButton.click();

    const errorAlert = page.locator('p[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10_000 });
    await expect(errorAlert).toContainText("비밀번호");
  });

  test("shows stats section with page and chart counts", async ({ page }) => {
    await expect(page.getByText("50+")).toBeVisible();
    await expect(page.getByText("100+", { exact: true })).toBeVisible();
    await expect(page.getByText("분석 페이지")).toBeVisible();
  });

  test("shows footer with copyright", async ({ page }) => {
    const footer = page.locator("footer").first();
    await expect(footer).toContainText("BK INVESTMENT");
  });
});
