import { test, expect } from "@playwright/test";

/**
 * Authentication E2E Tests
 *
 * Tests the user registration, login, and logout flows.
 */

test.describe("Authentication", () => {
  test.describe("Registration", () => {
    test("should display registration form", async ({ page }) => {
      await page.goto("/auth/register");

      // Check form elements exist
      await expect(page.getByRole("heading", { name: /sign up|register/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /sign up|register/i })).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/auth/register");

      // Submit empty form
      await page.getByRole("button", { name: /sign up|register/i }).click();

      // Should show validation errors
      await expect(page.getByText(/email.*required|invalid email/i)).toBeVisible();
    });

    test("should show validation error for invalid email", async ({ page }) => {
      await page.goto("/auth/register");

      await page.getByLabel(/email/i).fill("invalid-email");
      await page
        .getByLabel(/password/i)
        .first()
        .fill("password123");
      await page.getByRole("button", { name: /sign up|register/i }).click();

      await expect(page.getByText(/invalid email/i)).toBeVisible();
    });

    test("should show validation error for weak password", async ({ page }) => {
      await page.goto("/auth/register");

      await page.getByLabel(/email/i).fill("test@example.com");
      await page
        .getByLabel(/password/i)
        .first()
        .fill("123");
      await page.getByRole("button", { name: /sign up|register/i }).click();

      await expect(page.getByText(/password.*characters|too short/i)).toBeVisible();
    });
  });

  test.describe("Login", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(page.getByRole("heading", { name: /sign in|log in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /sign in|log in/i })).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/login");

      await page.getByLabel(/email/i).fill("nonexistent@example.com");
      await page.getByLabel(/password/i).fill("wrongpassword");
      await page.getByRole("button", { name: /sign in|log in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });
    });

    test("should have link to registration page", async ({ page }) => {
      await page.goto("/auth/login");

      const registerLink = page.getByRole("link", { name: /sign up|register|create/i });
      await expect(registerLink).toBeVisible();

      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    });

    test("should have link to forgot password", async ({ page }) => {
      await page.goto("/auth/login");

      const forgotLink = page.getByRole("link", { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing protected route", async ({ page }) => {
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test("should redirect to login when accessing profile", async ({ page }) => {
      await page.goto("/profile");

      await expect(page).toHaveURL(/login/);
    });

    test("should redirect to login when accessing admin pages", async ({ page }) => {
      await page.goto("/admin");

      await expect(page).toHaveURL(/login/);
    });
  });
});
