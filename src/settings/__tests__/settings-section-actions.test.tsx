import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsSection } from "../settings-section";

/**
 * A card's header actions on a phone (0.61 release sweep): the swipe card's "Set as my
 * defaults" and "Reset to defaults" ran past a 390px screen at Large text and 204px past a
 * 360px one at Extra large, because the actions' row neither wrapped nor stopped at the
 * card's width. jsdom lays nothing out, so the classes that let it wrap are what is pinned.
 */
describe("SettingsSection's actions", () => {
  it("wrap, and never stand wider than the card", () => {
    render(
      <SettingsSection
        anchor="swipe"
        title="Swipe gestures"
        action={
          <>
            <button type="button">Set as my defaults</button>
            <button type="button">Reset to defaults</button>
          </>
        }
      >
        body
      </SettingsSection>,
    );
    const row = screen.getByRole("button", { name: "Set as my defaults" }).parentElement!;
    expect(row).toHaveClass("flex", "flex-wrap", "max-w-full");
    expect(row).toContainElement(screen.getByRole("button", { name: "Reset to defaults" }));
  });
});
