import { act, render, screen } from "@testing-library/react";
import { Link, MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { readLastVisitedPage, useLastVisitedPage } from "../routing";
import { isOneShotPage } from "../../feedback/feedback-page-link";

/**
 * 0.52 code review, lib/path-pattern.ts: the feedback guard's `matchesPathPattern` was a
 * copy of this module's private `matchesPath`, and the two had already drifted — the copy
 * reads a path as React Router does (case-insensitive, percent-decoded), the original
 * did not. `useLastVisitedPage({ exclude: ["/banks/callback"] })` still recorded
 * `/Banks/Callback?code=…` as the page the next launch resumes on — a one-shot callback
 * run again — while the feedback guard called the same path one-shot. One rule now.
 */

const KEY = "ada.lastVisitedPage";
afterEach(() => window.localStorage.clear());

function Recorder({ exclude }: { exclude?: (string | RegExp)[] }) {
  useLastVisitedPage({ key: KEY, exclude });
  return null;
}

function visit(paths: string[], exclude?: (string | RegExp)[]) {
  const { unmount } = render(
    <MemoryRouter initialEntries={[paths[0]!]}>
      <Recorder exclude={exclude} />
      {paths.slice(1).map((to) => (
        <Link key={to} to={to}>
          {to}
        </Link>
      ))}
    </MemoryRouter>,
  );
  for (const to of paths.slice(1)) {
    act(() => screen.getByRole("link", { name: to }).click());
  }
  unmount();
  return readLastVisitedPage(KEY);
}

const FORMS = ["/Banks/Callback?code=1", "/BANKS/callback/x", "/banks/c%61llback?code=1"];

describe("useLastVisitedPage's exclude reads a path as the router does", () => {
  it.each(FORMS)("%s is not recorded under exclude /banks/callback — as the feedback guard says", (path) => {
    expect(isOneShotPage(path, ["/banks/callback"])).toBe(true);
    expect(visit(["/beds", path], ["/banks/callback"])).toBe("/beds");
  });

  it("the defaults too, and a RegExp of the app's", () => {
    expect(visit(["/beds", "/Login"])).toBe("/beds");
    expect(visit(["/beds", "/Share-Target?received=1"], [/^\/share-target/])).toBe("/beds");
    // Still the path and everything under it, not every path that starts with it.
    expect(visit(["/beds", "/Banks/Callbacks"], ["/banks/callback"])).toBe("/Banks/Callbacks");
  });
});
