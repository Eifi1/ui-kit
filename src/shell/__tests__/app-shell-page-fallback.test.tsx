import { Suspense, lazy, type ComponentType } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Home } from "lucide-react";
import { AppShell } from "../app-shell";

/**
 * AppShell's `pageFallback` (0.55, keksdose 2026-10-27): the wait for a lazy page happens
 * inside `<main>`, with the top bar and the navigation already there. keksdose's boundary
 * sat above the shell and showed one spinner where the whole app would be; kastlan and
 * Kurvenschmiede put one per route inside the `Outlet`.
 */

const NAV = [{ to: "/", label: "Home", icon: Home }];

/** A lazy page whose chunk arrives when the test says so. */
function deferredPage(text: string) {
  let arrive!: () => void;
  const chunk = new Promise<{ default: ComponentType }>((resolve) => {
    arrive = () => resolve({ default: () => <p>{text}</p> });
  });
  return { Page: lazy(() => chunk), arrive: () => act(async () => arrive()) };
}

function renderShell(children: React.ReactNode, pageFallback?: React.ReactNode) {
  return render(
    <MemoryRouter>
      {/* The app's own boundary above the shell, as keksdose's routes.tsx had it. */}
      <Suspense fallback={<p>whole screen waits</p>}>
        <AppShell nav={NAV} topBar={<div>bar</div>} pageFallback={pageFallback}>
          {children}
        </AppShell>
      </Suspense>
    </MemoryRouter>,
  );
}

describe("AppShell pageFallback", () => {
  it("waits for the page inside <main>, with the bar and the navigation there", async () => {
    const { Page, arrive } = deferredPage("the page");
    const { container } = renderShell(<Page />, <p>outline</p>);

    expect(screen.getByText("bar")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    expect(container.querySelector("main")).toContainElement(screen.getByText("outline"));
    expect(screen.queryByText("whole screen waits")).toBeNull();

    await arrive();
    expect(screen.getByText("the page")).toBeInTheDocument();
    expect(screen.queryByText("outline")).toBeNull();
  });

  it("leaves the suspension to the app's boundary when it is not given, as before 0.55", async () => {
    const { Page, arrive } = deferredPage("the page");
    renderShell(<Page />);

    // The app's boundary above the shell caught it: no shell yet.
    expect(screen.getByText("whole screen waits")).toBeInTheDocument();
    expect(screen.queryByText("bar")).toBeNull();

    await arrive();
    expect(screen.getByText("bar")).toBeInTheDocument();
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("is a boundary with an empty content area for null", async () => {
    const { Page, arrive } = deferredPage("the page");
    const { container } = renderShell(<Page />, null);

    expect(screen.getByText("bar")).toBeInTheDocument();
    expect(container.querySelector("main")).toBeEmptyDOMElement();

    await arrive();
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("lets a boundary of the app's own inside it catch first (a per-route one)", async () => {
    const { Page, arrive } = deferredPage("the page");
    renderShell(
      <>
        <p>banner</p>
        <Suspense fallback={<p>route waits</p>}>
          <Page />
        </Suspense>
      </>,
      <p>outline</p>,
    );

    expect(screen.getByText("route waits")).toBeInTheDocument();
    // The inner boundary caught it, so the rest of `children` is not held with the page.
    expect(screen.getByText("banner")).toBeInTheDocument();
    expect(screen.queryByText("outline")).toBeNull();

    await arrive();
    expect(screen.getByText("the page")).toBeInTheDocument();
  });

  it("holds the rest of children with the page when it is the only boundary", async () => {
    const { Page, arrive } = deferredPage("the page");
    renderShell(
      <>
        <p>banner</p>
        <Page />
      </>,
      <p>outline</p>,
    );

    // What the prop's note says: everything in `children` waits together.
    expect(screen.getByText("outline")).toBeInTheDocument();
    expect(screen.queryByText("banner")).toBeNull();

    await arrive();
    expect(screen.getByText("banner")).toBeInTheDocument();
    expect(screen.getByText("the page")).toBeInTheDocument();
  });
});
