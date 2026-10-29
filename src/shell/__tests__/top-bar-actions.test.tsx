import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBarActions, TOP_BAR_ACTION_ORDER } from "../top-bar-actions";
import { TopBar } from "../top-bar";

/** docs/top-bar-harmonization.md §2.1, §6.6: the one order, slots by name, no gaps. */

const item = (name: string) => <span data-slot-name={name}>{name}</span>;
const order = (root: HTMLElement) =>
  [...root.querySelectorAll("[data-slot-name]")].map((e) => e.getAttribute("data-slot-name"));

describe("TopBarActions", () => {
  it("draws every slot in §2.1's order, whatever order the props come in", () => {
    const { container } = render(
      <TopBarActions
        account={item("account")}
        notifications={item("notifications")}
        platform={item("platform")}
        dev={item("dev")}
        sync={item("sync")}
        assistant={item("assistant")}
        tours={item("tours")}
        feedback={item("feedback")}
        theme={item("theme")}
        search={item("search")}
        companySwitcher={item("companySwitcher")}
      />,
    );
    expect(order(container)).toEqual([
      "companySwitcher",
      "search",
      "theme",
      "feedback",
      "tours",
      "assistant",
      "sync",
      "dev",
      "platform",
      "notifications",
      "account",
    ]);
  });

  it("leaves an empty slot out entirely: no wrapper, so the row's gap closes", () => {
    const { container } = render(
      <TopBar
        brand="App"
        actions={<TopBarActions search={item("search")} theme={null} feedback={false} account={item("account")} />}
      />,
    );
    const row = container.querySelector("header > div:last-child")!;
    expect(row.children).toHaveLength(2);
    expect(order(container)).toEqual(["search", "account"]);
  });

  it("0.46: the bell's slot sits right before the account menu, and is simply absent when not given", () => {
    const { container, rerender } = render(
      <TopBarActions notifications={item("notifications")} platform={item("platform")} account={item("account")} />,
    );
    expect(order(container)).toEqual(["platform", "notifications", "account"]);
    rerender(<TopBarActions platform={item("platform")} account={item("account")} />);
    expect(order(container)).toEqual(["platform", "account"]);
  });

  it("signed out (no account): Language and Sign in close the row (§6.6)", () => {
    const { container } = render(
      <TopBarActions theme={item("theme")} language={item("language")} signIn={item("signIn")} />,
    );
    expect(order(container)).toEqual(["theme", "language", "signIn"]);
  });

  it("signed in: the signed-out slots are not drawn — the language is in the account menu", () => {
    const { container } = render(
      <TopBarActions
        theme={item("theme")}
        language={item("language")}
        signIn={item("signIn")}
        account={item("account")}
      />,
    );
    expect(order(container)).toEqual(["theme", "account"]);
  });

  it("exports the order it draws", () => {
    expect(TOP_BAR_ACTION_ORDER.slice(0, 11)).toEqual([
      "companySwitcher",
      "search",
      "theme",
      "feedback",
      "tours",
      "assistant",
      "sync",
      "dev",
      "platform",
      "notifications",
      "account",
    ]);
  });
});
