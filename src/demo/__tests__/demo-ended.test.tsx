import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { authErrorCode, isAuthError } from "../../auth/auth-errors";
import { DemoEnded } from "../demo-ended";
import { isDemoSession } from "../demo-session";

describe("DemoEnded — §5.5", () => {
  it("says the demo has ended, with Start a new demo, Request access and Sign in", () => {
    render(
      <DemoEnded model="read-only" access={{ kind: "request", email: "support@example.com", app: "Ada's Garden Planner" }} />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "The demo has ended" })).toBeInTheDocument();
    expect(screen.getByText("Sample data is reset regularly.")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")?.split("?")[0]])).toEqual([
      ["Start a new demo", "/demo"],
      ["Request access", "mailto:support@example.com"],
      ["Sign in", "/login"],
    ]);
  });

  it("says what happened to a sandbox, and takes the app's paths", () => {
    render(
      <DemoEnded
        model="sandbox"
        access={{ kind: "register", href: "/register" }}
        restartHref="/try"
        signInHref="/signin"
        headingAs="h1"
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Sample data is reset regularly; your own work from the demo is deleted.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start a new demo" })).toHaveAttribute("href", "/try");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signin");
  });

  it("is noindex while mounted, unless told otherwise", () => {
    const access = { kind: "register", href: "/register" } as const;
    const { unmount } = render(<DemoEnded model="read-only" access={access} />);
    expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull();
    unmount();
    render(<DemoEnded model="read-only" access={access} noIndex={false} />);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});

describe("isDemoSession", () => {
  it("reads is_demo (server-kit) or isDemo (a client's copy)", () => {
    expect(isDemoSession({ is_demo: true })).toBe(true);
    expect(isDemoSession({ isDemo: true })).toBe(true);
    expect(isDemoSession({ is_demo: false })).toBe(false);
    expect(isDemoSession({})).toBe(false);
    expect(isDemoSession(null)).toBe(false);
    expect(isDemoSession(undefined)).toBe(false);
  });
});

describe("DemoErrorCode — §6.2", () => {
  it.each(["demo_disabled", "demo_rate_limited", "demo_capacity", "demo_not_ready", "demo_read_only", "demo_refused"] as const)(
    "authErrorCode and isAuthError know %s",
    (code) => {
      const err = { response: { status: 403, data: { detail: "no", code } } };
      expect(authErrorCode(err)).toBe(code);
      expect(isAuthError(err, code)).toBe(true);
      expect(isAuthError(err, "invalid_credentials")).toBe(false);
    },
  );
});
