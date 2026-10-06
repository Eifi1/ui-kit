import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "../../shell/auth-layout";
import { NotFoundPage } from "../not-found-page";

/** keksdose's 404 (app/not-found-page.tsx) for every app: words instead of a silent
 *  redirect, `noindex`, a way home, and a way back into the app when signed in. */

const robots = () => document.head.querySelectorAll('meta[name="robots"][content="noindex"]');

describe("NotFoundPage", () => {
  it("says the page is not found in keksdose's words, with the way home", () => {
    render(<NotFoundPage />);
    expect(screen.getByRole("heading", { level: 2, name: "Page not found" })).toBeInTheDocument();
    expect(
      screen.getByText("This address doesn’t exist (any more). It may be a typo, or the page has moved."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the start page" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Back to the app" })).toBeNull();
    // The big number is decoration; the heading says it in words.
    expect(screen.getByText("404")).toHaveAttribute("aria-hidden", "true");
  });

  it("offers the way back into the app for someone signed in", () => {
    render(<NotFoundPage homeHref="/start" appHref="/budget" />);
    expect(screen.getByRole("link", { name: "Go to the start page" })).toHaveAttribute("href", "/start");
    expect(screen.getByRole("link", { name: "Back to the app" })).toHaveAttribute("href", "/budget");
  });

  it("marks the page noindex while mounted, unless told not to", () => {
    const { unmount } = render(<NotFoundPage />);
    expect(robots()).toHaveLength(1);
    unmount();
    expect(robots()).toHaveLength(0);
    render(<NotFoundPage noIndex={false} />);
    expect(robots()).toHaveLength(0);
  });

  it("works inside AuthLayout, under its title, and bare as the page's h1", () => {
    const { unmount } = render(
      <AuthLayout title="Example App">
        <NotFoundPage>
          <p>Looking for the help pages?</p>
        </NotFoundPage>
      </AuthLayout>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Example App" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toContainElement(screen.getByText("Looking for the help pages?"));
    unmount();
    render(<NotFoundPage headingAs="h1" labels={{ title: "Nothing here" }} data-testid="nf" />);
    expect(screen.getByRole("heading", { level: 1, name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByTestId("nf")).toBeInTheDocument();
  });
});
