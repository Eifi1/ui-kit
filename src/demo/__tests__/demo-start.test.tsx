import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DemoStart } from "../demo-start";
import type { AccessChoice } from "../../landing/access";

const ACCESS: AccessChoice = { kind: "request", email: "support@example.com", app: "Ada's Garden Planner" };

/** An axios-shaped refusal: `{detail, code}` and, where the server sends it, `Retry-After`. */
const refusal = (status: number, code?: string, headers: Record<string, string> = {}) => ({
  response: { status, headers, data: { detail: "refused", ...(code && { code }) } },
});

function start<T>(run: () => Promise<T>, onStarted = vi.fn()) {
  const spy = vi.fn(run);
  render(
    <StrictMode>
      <DemoStart start={spy} onStarted={onStarted} access={ACCESS} backHref="/welcome" noIndex={false} />
    </StrictMode>,
  );
  return { spy, onStarted };
}

describe("DemoStart — §5.2", () => {
  it("starts once under StrictMode, says so, and hands the session on", async () => {
    const session = { access_token: "t", refresh_token: null, expires_at: "2026-10-08T12:00:00Z" };
    const { spy, onStarted } = start(() => Promise.resolve(session));
    expect(screen.getByRole("status")).toHaveTextContent("Starting the demo…");
    await vi.waitFor(() => expect(onStarted).toHaveBeenCalledWith(session));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onStarted).toHaveBeenCalledTimes(1);
    // No refusal, no way out: the app is moving on.
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each([
    ["demo_rate_limited with Retry-After", refusal(429, "demo_rate_limited", { "retry-after": "1200" }), "Too many demos from this network. Try again in 20 min."],
    ["demo_rate_limited, a part minute rounded up", refusal(429, "demo_rate_limited", { "Retry-After": "61" }), "Too many demos from this network. Try again in 2 min."],
    ["demo_rate_limited without Retry-After", refusal(429, "demo_rate_limited"), "Too many demos from this network. Try again later."],
    ["a bare 429", refusal(429, undefined, { "retry-after": "30" }), "Too many demos from this network. Try again in 1 min."],
    ["demo_capacity", refusal(429, "demo_capacity"), "The demo is full right now. Try again later."],
    ["demo_disabled", refusal(404, "demo_disabled"), "The demo isn’t available right now."],
    ["demo_not_ready", refusal(503, "demo_not_ready"), "The demo isn’t available right now."],
    ["a network error", new Error("Network Error"), "The demo could not be started. Please try again."],
  ])("refuses %s in words, with Request access and Back to the start page", async (_name, error, message) => {
    const { spy, onStarted } = start(() => Promise.reject(error));
    expect(await screen.findByText(message)).toBeInTheDocument();
    // Said inside the live region the progress line was in.
    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onStarted).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Request access" }).getAttribute("href")).toMatch(/^mailto:support@example\.com\?/);
    expect(screen.getByRole("link", { name: "Back to the start page" })).toHaveAttribute("href", "/welcome");
  });

  it("offers Get started instead once registration is open", async () => {
    render(
      <DemoStart
        start={() => Promise.reject(refusal(429, "demo_capacity"))}
        onStarted={vi.fn()}
        access={{ kind: "register", href: "/register" }}
        noIndex={false}
      />,
    );
    expect(await screen.findByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Back to the start page" })).toHaveAttribute("href", "/");
  });

  it("marks /demo noindex while it is mounted", () => {
    const { unmount } = render(<DemoStart start={() => new Promise(() => {})} onStarted={vi.fn()} access={ACCESS} />);
    expect(document.head.querySelector('meta[name="robots"][content="noindex"]')).not.toBeNull();
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});
