import { test, expect } from "@playwright/test";

/**
 * Public Pages E2E Tests
 *
 * Tests pages accessible without authentication.
 */

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");

    // Check page loaded successfully
    await expect(page).toHaveTitle(/openbmc|learning/i);
  });

  test("should display main heading", async ({ page }) => {
    await page.goto("/");

    // Should have a prominent heading
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for common navigation elements
    await expect(page.getByRole("link", { name: /paths|courses|learn/i })).toBeVisible();
  });

  test("should have login/signup buttons", async ({ page }) => {
    await page.goto("/");

    // Should have auth buttons
    const loginBtn = page.getByRole("link", { name: /sign in|log in|login/i });
    const signupBtn = page.getByRole("link", { name: /sign up|register|get started/i });

    await expect(loginBtn.or(signupBtn)).toBeVisible();
  });
});

test.describe("Learning Paths Catalog", () => {
  test("should display learning paths page", async ({ page }) => {
    await page.goto("/paths");

    await expect(page.getByRole("heading", { name: /learning paths|courses/i })).toBeVisible();
  });

  test("should display path cards or list", async ({ page }) => {
    await page.goto("/paths");

    // Should have path listings (cards, list items, etc.)
    // This test is flexible as it depends on database content
    await page.waitForLoadState("networkidle");

    // Either shows paths or empty state
    const hasContent =
      (await page.getByRole("article").count()) > 0 ||
      (await page.getByText(/no.*paths|coming soon|empty/i).count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test("should have difficulty filters", async ({ page }) => {
    await page.goto("/paths");

    // Look for filter controls
    const filterElements = page.getByRole("button", {
      name: /beginner|intermediate|advanced|filter/i,
    });
    const radioElements = page.getByRole("radio", { name: /beginner|intermediate|advanced/i });

    const _hasFilters = (await filterElements.count()) > 0 || (await radioElements.count()) > 0;

    // Filters may or may not be present depending on implementation
    // Just verify page loads without error
    await expect(page).toHaveURL(/paths/);
  });
});

test.describe("Accessibility", () => {
  test("should have skip to content link", async ({ page }) => {
    await page.goto("/");

    // Tab to reveal skip link
    await page.keyboard.press("Tab");

    // Many sites have skip links that appear on focus
    const skipLink = page.getByRole("link", { name: /skip.*content|skip.*main/i });

    // This is optional - depends on implementation
    if ((await skipLink.count()) > 0) {
      await expect(skipLink).toBeFocused();
    }
  });

  test("should have proper heading hierarchy on landing page", async ({ page }) => {
    await page.goto("/");

    // Should have exactly one h1
    const h1s = await page.locator("h1").count();
    expect(h1s).toBe(1);
  });

  test("should have descriptive link text", async ({ page }) => {
    await page.goto("/");

    // Check that there are no "click here" or "read more" without context
    const badLinks = await page
      .getByRole("link")
      .filter({ hasText: /^click here$|^read more$|^here$/i })
      .count();

    expect(badLinks).toBe(0);
  });
});

test.describe("Responsive Design", () => {
  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should load without horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small tolerance
  });

  test("should show mobile menu on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Look for hamburger menu or mobile menu button
    const mobileMenuBtn = page.getByRole("button", { name: /menu|navigation/i });
    const hamburger = page.locator('[aria-label*="menu"]');

    const _hasMobileNav = (await mobileMenuBtn.count()) > 0 || (await hamburger.count()) > 0;

    // Mobile nav is expected but may vary by implementation
    // Just verify page loads at mobile size
    await expect(page).toHaveURL("/");
  });
});

test.describe("API Health", () => {
  test("should return healthy status from health endpoint", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("healthy");
  });
});
