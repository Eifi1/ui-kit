import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { List, ListItem } from "../list";

/**
 * ListItem at Large and Extra large (docs/text-size-harmonization.md §4: "ListItem:
 * title, subtitle and meta wrap instead of truncating"). The switch is a `large:`
 * variant over the Normal classes — no render, right on the first paint — so what jsdom
 * can hold is the class contract: every truncating line also carries the wrap, every
 * clamp its release.
 */

const WRAP = ["large:whitespace-normal", "large:[overflow-wrap:anywhere]"];

/** The props these tests vary — all of them valid on a button row. */
interface Extra {
  titleLines?: 1 | 2 | "all";
  subtitleLines?: 1 | 2;
  metaWrap?: boolean;
  meta?: ReactNode;
  trailing?: ReactNode;
}

function row(extra: Extra = {}) {
  render(
    <List>
      <ListItem
        title="Kitchen tap drips"
        subtitle="Reported by Ada Example"
        overline="Ada's Garden Planner"
        meta="Updated 3 days ago"
        onClick={() => {}}
        {...extra}
      />
    </List>,
  );
}

describe("ListItem wraps at Large (§4)", () => {
  it("keeps the one-line truncation at Normal and adds the wrap for Large", () => {
    row();
    for (const text of ["Kitchen tap drips", "Reported by Ada Example", "Ada's Garden Planner", "Updated 3 days ago"]) {
      const el = screen.getByText(text);
      expect(el, text).toHaveClass("truncate", ...WRAP);
    }
  });

  it("releases a two-line clamp at Large", () => {
    row({ titleLines: 2, subtitleLines: 2 });
    expect(screen.getByText("Kitchen tap drips")).toHaveClass("line-clamp-2", "large:line-clamp-none");
    expect(screen.getByText("Reported by Ada Example")).toHaveClass("line-clamp-2", "large:line-clamp-none");
  });

  it("leaves a wrapping meta row as it is", () => {
    row({ metaWrap: true, meta: <span>chip</span> });
    const meta = screen.getByText("chip").parentElement!;
    expect(meta).toHaveClass("flex-wrap");
    expect(meta).not.toHaveClass("truncate");
  });

  it("lets the trailing slot drop under the text at Large, only when there is one", () => {
    row({ trailing: <span>Open</span> });
    const target = screen.getByRole("button");
    expect(target).toHaveClass("large:flex-wrap");
    expect(screen.getByText("Kitchen tap drips").parentElement).toHaveClass("large:basis-40");
    expect(screen.getByText("Open").parentElement).toHaveClass("large:ms-auto");
  });

  it("does not wrap the target without a trailing slot", () => {
    row();
    expect(screen.getByRole("button")).not.toHaveClass("large:flex-wrap");
  });

  it("uses the kit's caption size and focus frame (§3.2, §5)", () => {
    row();
    expect(screen.getByText("Updated 3 days ago")).toHaveClass("text-caption");
    expect(screen.getByText("Ada's Garden Planner")).toHaveClass("text-caption");
    const target = screen.getByRole("button");
    expect(target.className).toContain("focus-visible:ring-[length:var(--focus-ring-width)]");
    expect(target).toHaveClass("focus-visible:ring-inset");
  });
});
