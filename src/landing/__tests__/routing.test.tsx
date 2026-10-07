import { act, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { LandingSession } from "../landing-actions";
import {
  DEFAULT_LAST_VISITED_EXCLUDES,
  RedirectIfAuthed,
  RootEntry,
  clearLastVisitedPage,
  readLastVisitedPage,
  safeNextPath,
  useLastVisitedPage,
} from "../routing";

const KEY = "ada.lastVisitedPage";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

afterEach(() => window.localStorage.clear());

/* ── RootEntry ───────────────────────────────────────────────────────────── */

function root(session: LandingSession, resumePath: string | null) {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<RootEntry session={session} resumePath={resumePath} landing={<h1>Landing</h1>} home="/beds" />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RootEntry — §3.1", () => {
  it("shows the landing without a session, whatever is remembered", () => {
    root("none", "/beds/3");
    expect(screen.getByRole("heading", { name: "Landing" })).toBeInTheDocument();
  });

  it("resumes a real session on the remembered page", () => {
    root("user", "/beds/3?tab=water");
    expect(screen.getByTestId("where")).toHaveTextContent("/beds/3?tab=water");
  });

  it("resumes a DEMO session the same way", () => {
    root("demo", "/harvest");
    expect(screen.getByTestId("where")).toHaveTextContent("/harvest");
  });

  it("sends a session home when nothing (or only /, or something unsafe) is remembered", () => {
    root("user", null);
    expect(screen.getByTestId("where")).toHaveTextContent("/beds");
  });

  it.each(["/", "//evil.example/x", "https://evil.example/"])("treats %s as nothing remembered", (path) => {
    root("demo", path);
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/beds$/);
  });
});

/* ── RedirectIfAuthed ────────────────────────────────────────────────────── */

function guarded(session: LandingSession, entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<RedirectIfAuthed session={session} allowDemo fallback="/beds" />}>
          <Route path="/login" element={<h1>Sign-in page</h1>} />
          <Route path="/register" element={<h1>Register page</h1>} />
        </Route>
        <Route
          path="/demo"
          element={
            <RedirectIfAuthed session={session} fallback="/harvest">
              <h1>Demo start</h1>
            </RedirectIfAuthed>
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RedirectIfAuthed — §3.1, §5.6", () => {
  it("shows the public page without a session", () => {
    guarded("none", "/login");
    expect(screen.getByRole("heading", { name: "Sign-in page" })).toBeInTheDocument();
  });

  it("sends a real session back into the app", () => {
    guarded("user", "/login");
    expect(screen.getByTestId("where")).toHaveTextContent("/beds");
  });

  it("honours a safe ?next= first, and never an unsafe one", () => {
    guarded("user", "/login?next=%2Fjoin%3Ftoken%3Dabc");
    expect(screen.getByTestId("where")).toHaveTextContent("/join?token=abc");
  });

  it("refuses an off-site ?next=", () => {
    guarded("user", "/login?next=%2F%5Cevil.example");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/beds$/);
  });

  it("lets a demo session through to /login and /register (allowDemo)", () => {
    guarded("demo", "/login");
    expect(screen.getByRole("heading", { name: "Sign-in page" })).toBeInTheDocument();
  });

  it("lets a demo through to /register too", () => {
    guarded("demo", "/register");
    expect(screen.getByRole("heading", { name: "Register page" })).toBeInTheDocument();
  });

  it("continues a live demo at /demo instead of starting a second (no allowDemo)", () => {
    guarded("demo", "/demo");
    expect(screen.getByTestId("where")).toHaveTextContent("/harvest");
  });

  it("shows /demo without a session", () => {
    guarded("none", "/demo");
    expect(screen.getByRole("heading", { name: "Demo start" })).toBeInTheDocument();
  });
});

/* ── The last visited page ───────────────────────────────────────────────── */

function Recorder({ exclude }: { exclude?: (string | RegExp)[] }) {
  useLastVisitedPage({ key: KEY, exclude });
  return null;
}

function Nav({ to }: { to: string }) {
  return <Link to={to}>{to}</Link>;
}

function visit(paths: string[], exclude?: (string | RegExp)[]) {
  const { unmount } = render(
    <MemoryRouter initialEntries={[paths[0]!]}>
      <Recorder exclude={exclude} />
      {paths.slice(1).map((to) => (
        <Nav key={to} to={to} />
      ))}
    </MemoryRouter>,
  );
  for (const to of paths.slice(1)) {
    act(() => screen.getByRole("link", { name: to }).click());
  }
  unmount();
  return readLastVisitedPage(KEY);
}

describe("useLastVisitedPage — §3.2", () => {
  it("records path and query on every navigation", () => {
    expect(visit(["/beds", "/beds/3?tab=water"])).toBe("/beds/3?tab=water");
  });

  it.each([
    "/",
    "/welcome",
    "/login",
    "/register?invite=abc",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/demo",
    "/demo/ended",
    "/impressum",
    "/privacy",
    "/terms",
  ])("never records %s", (path) => {
    expect(visit(["/beds", path])).toBe("/beds");
  });

  it("adds the app's own excludes to the defaults (segments, and RegExps)", () => {
    expect(visit(["/beds", "/join/x"], ["/join"])).toBe("/beds");
    expect(visit(["/beds", "/share-target?received=1"], [/^\/share-target/])).toBe("/beds");
    // A segment prefix, not a string prefix: /joiners is a page of its own.
    expect(visit(["/beds", "/joiners"], ["/join"])).toBe("/joiners");
    // The defaults still apply with an exclude of the app's.
    expect(visit(["/beds", "/login"], ["/join"])).toBe("/beds");
  });

  it("lists the defaults of §3.2", () => {
    expect(DEFAULT_LAST_VISITED_EXCLUDES).toEqual(
      expect.arrayContaining(["/", "/welcome", "/login", "/register", "/demo", "/impressum", "/privacy", "/terms"]),
    );
  });

  it("reads back a fallback, rejects a planted off-site value, and forgets on sign-out", () => {
    expect(readLastVisitedPage(KEY)).toBeNull();
    expect(readLastVisitedPage(KEY, "/beds")).toBe("/beds");
    window.localStorage.setItem(KEY, "//evil.example/x");
    expect(readLastVisitedPage(KEY, "/beds")).toBe("/beds");
    window.localStorage.setItem(KEY, "/harvest");
    expect(readLastVisitedPage(KEY)).toBe("/harvest");
    clearLastVisitedPage(KEY);
    expect(readLastVisitedPage(KEY)).toBeNull();
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/join?token=abc", "/join?token=abc"],
    ["/beds#water", "/beds#water"],
    ["beds", "/beds"],
    ["/a/../b", "/b"],
  ])("keeps the same-origin path %s", (raw, expected) => {
    expect(safeNextPath(raw)).toBe(expected);
  });

  it.each([null, undefined, "", "//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example/", "javascript:alert(1)"])(
    "refuses %s",
    (raw) => {
      expect(safeNextPath(raw)).toBeNull();
    },
  );
});
