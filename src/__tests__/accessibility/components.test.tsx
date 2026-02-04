/**
 * Component Accessibility Tests
 *
 * Tests key components for WCAG accessibility compliance using axe-core.
 * Note: These tests use raw HTML elements to test accessibility patterns,
 * not Next.js components, so we disable the Next.js-specific rules.
 */

/* eslint-disable @next/next/no-html-link-for-pages */
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// Simple mock components for testing accessibility patterns
// These test the accessibility patterns used across the app

describe("Accessibility Tests", () => {
  describe("Form Components", () => {
    it("form with labels has no accessibility violations", async () => {
      const { container } = render(
        <form aria-label="Login form">
          <div>
            <label htmlFor="email">Email address</label>
            <input type="email" id="email" name="email" aria-describedby="email-error" required />
            <span id="email-error" role="alert" aria-live="polite"></span>
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              aria-describedby="password-hint"
              required
            />
            <span id="password-hint">Must be at least 8 characters</span>
          </div>
          <button type="submit">Sign in</button>
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("form with error states has no accessibility violations", async () => {
      const { container } = render(
        <form aria-label="Registration form">
          <div>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              aria-invalid="true"
              aria-describedby="username-error"
            />
            <span id="username-error" role="alert">
              Username is required
            </span>
          </div>
          <button type="submit">Register</button>
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Navigation Components", () => {
    it("navigation with proper landmarks has no accessibility violations", async () => {
      const { container } = render(
        <nav aria-label="Main navigation">
          <ul role="menubar">
            <li role="none">
              <a href="/dashboard" role="menuitem">
                Dashboard
              </a>
            </li>
            <li role="none">
              <a href="/paths" role="menuitem">
                Learning Paths
              </a>
            </li>
            <li role="none">
              <a href="/lessons" role="menuitem">
                Lessons
              </a>
            </li>
          </ul>
        </nav>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("breadcrumb navigation has no accessibility violations", async () => {
      const { container } = render(
        <nav aria-label="Breadcrumb">
          <ol>
            <li>
              <a href="/">Home</a>
              <span aria-hidden="true">/</span>
            </li>
            <li>
              <a href="/paths">Paths</a>
              <span aria-hidden="true">/</span>
            </li>
            <li aria-current="page">OpenBMC Fundamentals</li>
          </ol>
        </nav>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Content Components", () => {
    it("article with heading hierarchy has no accessibility violations", async () => {
      const { container } = render(
        <article>
          <h1>Introduction to OpenBMC</h1>
          <p>Learn about OpenBMC basics.</p>
          <section>
            <h2>What is OpenBMC?</h2>
            <p>OpenBMC is an open-source BMC firmware stack.</p>
            <h3>Key Features</h3>
            <ul>
              <li>Open source</li>
              <li>Linux-based</li>
              <li>Community-driven</li>
            </ul>
          </section>
        </article>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("card component with proper structure has no accessibility violations", async () => {
      const { container } = render(
        <div role="article" aria-labelledby="card-title">
          <h2 id="card-title">OpenBMC Fundamentals</h2>
          <p>Learn the basics of OpenBMC development.</p>
          <div>
            <span aria-label="Difficulty: Beginner">Beginner</span>
            <span aria-label="Duration: 10 hours">10 hours</span>
          </div>
          <a href="/paths/openbmc-fundamentals" aria-describedby="card-title">
            Start Learning
          </a>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Interactive Components", () => {
    it("button with proper labeling has no accessibility violations", async () => {
      const { container } = render(
        <div>
          <button type="button" aria-label="Close dialog">
            <span aria-hidden="true">×</span>
          </button>
          <button type="button">Save Changes</button>
          <button type="button" disabled aria-disabled="true">
            Processing...
          </button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("tabs component has no accessibility violations", async () => {
      const { container } = render(
        <div>
          <div role="tablist" aria-label="Course content tabs">
            <button role="tab" aria-selected="true" aria-controls="panel-1" id="tab-1">
              Overview
            </button>
            <button
              role="tab"
              aria-selected="false"
              aria-controls="panel-2"
              id="tab-2"
              tabIndex={-1}
            >
              Lessons
            </button>
            <button
              role="tab"
              aria-selected="false"
              aria-controls="panel-3"
              id="tab-3"
              tabIndex={-1}
            >
              Quiz
            </button>
          </div>
          <div role="tabpanel" id="panel-1" aria-labelledby="tab-1">
            <p>Course overview content</p>
          </div>
          <div role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
            <p>Lessons list</p>
          </div>
          <div role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden>
            <p>Quiz content</p>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("modal dialog has no accessibility violations", async () => {
      const { container } = render(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <h2 id="modal-title">Confirm Action</h2>
          <p id="modal-description">Are you sure you want to delete this lesson?</p>
          <div>
            <button type="button">Cancel</button>
            <button type="button">Delete</button>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Progress Components", () => {
    it("progress bar has no accessibility violations", async () => {
      const { container } = render(
        <div>
          <div
            role="progressbar"
            aria-valuenow={75}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Course progress"
          >
            <span aria-hidden="true">75%</span>
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("status messages have no accessibility violations", async () => {
      const { container } = render(
        <div>
          <div role="status" aria-live="polite">
            Lesson completed successfully!
          </div>
          <div role="alert" aria-live="assertive">
            Error: Failed to save progress
          </div>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Table Components", () => {
    it("data table has no accessibility violations", async () => {
      const { container } = render(
        <table>
          <caption>User Progress</caption>
          <thead>
            <tr>
              <th scope="col">Lesson</th>
              <th scope="col">Status</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Introduction</th>
              <td>Completed</td>
              <td>100%</td>
            </tr>
            <tr>
              <th scope="row">Setup</th>
              <td>In Progress</td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Image and Media", () => {
    it("images with alt text have no accessibility violations", async () => {
      const { container } = render(
        <div>
          <img src="/logo.png" alt="OpenBMC Learning Platform logo" />
          <img src="/decorative.png" alt="" role="presentation" />
          <figure>
            <img src="/diagram.png" alt="BMC architecture diagram" />
            <figcaption>Figure 1: BMC Architecture Overview</figcaption>
          </figure>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Skip Links and Landmarks", () => {
    it("page with proper landmarks has no accessibility violations", async () => {
      const { container } = render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <header>
            <nav aria-label="Main">
              <a href="/">Home</a>
            </nav>
          </header>
          <main id="main-content">
            <h1>Page Title</h1>
            <p>Main content here</p>
          </main>
          <aside aria-label="Related content">
            <h2>Related</h2>
          </aside>
          <footer>
            <p>© 2024 OpenBMC Learning Platform</p>
          </footer>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Color and Contrast", () => {
    it("text with sufficient color contrast has no violations", async () => {
      const { container } = render(
        <div>
          <p style={{ color: "#000000", backgroundColor: "#ffffff" }}>High contrast text</p>
          <a href="/link" style={{ color: "#0000ee", backgroundColor: "#ffffff" }}>
            Link with good contrast
          </a>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Focus Management", () => {
    it("focusable elements are properly ordered", async () => {
      const { container } = render(
        <div>
          <input type="text" placeholder="First field" />
          <input type="text" placeholder="Second field" />
          <button type="button">Submit</button>
          <a href="/help">Help</a>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
