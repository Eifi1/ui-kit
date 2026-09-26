import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { GlobalSearch } from "../global-search";
import type { GlobalSearchProps } from "../global-search";
import type { SearchEntry } from "../search-index";

/**
 * keksdose's 0.9 audit of `GlobalSearch`: the empty-query suggestions keeping their
 * entries' groups (its palette showed Pages and Actions apart), the trigger's icon size
 * (its top bar draws size-5 and reached into the button for it), and the palette's
 * row density passed through.
 */

const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});

const ENTRIES: SearchEntry[] = [
  { id: "budget", title: "Budget", group: "Pages", href: "/budget" },
  { id: "new-account", title: "New account", group: "Actions", href: "/accounts?action=new" },
  { id: "accounts", title: "Accounts", group: "Pages", href: "/accounts" },
  { id: "loose", title: "Loose", href: "/loose" },
];

const draw = (props: Partial<GlobalSearchProps> = {}) =>
  render(
    <MemoryRouter>
      <GlobalSearch entries={ENTRIES} {...props} />
    </MemoryRouter>,
  );

const open = () =>
  act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
  });

const groups = async () => {
  const listbox = await screen.findByRole("listbox");
  await within(listbox).findAllByRole("option");
  return within(listbox)
    .getAllByRole("group")
    .map((group) => [
      group.getAttribute("aria-labelledby") && document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent,
      within(group)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ]);
};

describe("GlobalSearch suggestionsKeepGroups", () => {
  const suggestions = ["budget", "new-account", "accounts", "loose", { query: "theme" }] as const;

  it("puts every suggestion under the one heading by default", async () => {
    draw({ suggestions: [...suggestions] });
    open();
    expect(await groups()).toEqual([["Try", ["Budget", "New account", "Accounts", "Loose", "theme"]]]);
  });

  it("keeps each entry's group, leaving group-less entries and queries under the heading", async () => {
    draw({ suggestions: [...suggestions], suggestionsKeepGroups: true });
    open();
    expect(await groups()).toEqual([
      ["Pages", ["Budget", "Accounts"]],
      ["Actions", ["New account"]],
      ["Try", ["Loose", "theme"]],
    ]);
  });

  it("orders the kept groups by groupOrder", async () => {
    draw({ suggestions: [...suggestions], suggestionsKeepGroups: true, groupOrder: ["Actions", "Try"] });
    open();
    expect((await groups()).map(([name]) => name)).toEqual(["Actions", "Try", "Pages"]);
  });

  it("keeps an inline entry's own group too", async () => {
    draw({
      suggestions: [{ id: "inline", title: "Inline action", group: "Actions", href: "/x" }],
      suggestionsKeepGroups: true,
    });
    open();
    expect(await groups()).toEqual([["Actions", ["Inline action"]]]);
  });
});

describe("GlobalSearch triggerIconSize", () => {
  const icon = () => screen.getByRole("button", { name: "Search" }).querySelector("svg")!;

  it("draws the 16px magnifier by default", () => {
    draw();
    expect(icon().getAttribute("class")).toContain("size-4");
  });

  it("draws the size it is given, without the default class fighting it", () => {
    draw({ triggerIconSize: 20 });
    expect(icon().getAttribute("class")).not.toContain("size-4");
    expect(icon().style.width).toBe("20px");
    expect(icon().style.height).toBe("20px");
  });
});

describe("GlobalSearch density", () => {
  it("passes the palette's row density through", async () => {
    draw({ suggestions: ["budget"], density: "comfortable" });
    open();
    const option = await screen.findByRole("option", { name: "Budget" });
    expect(option.className).toContain("min-h-11");
  });
});
