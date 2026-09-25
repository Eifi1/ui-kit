import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SKELETON_CLASS, Skeleton } from "../skeleton";
import { StatTile } from "../stat-tile";

describe("Skeleton", () => {
  it("is hidden from assistive tech in every shape", () => {
    for (const shape of ["line", "block", "circle"] as const) {
      const { container, unmount } = render(<Skeleton shape={shape} />);
      const el = container.firstElementChild!;
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el).toHaveAttribute("data-skeleton", shape);
      unmount();
    }
  });

  it("circle is round; block and line fill the width", () => {
    const { container } = render(
      <>
        <Skeleton shape="circle" />
        <Skeleton shape="block" />
      </>,
    );
    const [circle, block] = container.children;
    expect(circle.className).toMatch(/rounded-full/);
    expect(block.className).toMatch(/w-full/);
  });

  it("lines={n} draws n lines, the last one shorter", () => {
    const { container } = render(<Skeleton lines={3} />);
    const group = container.firstElementChild!;
    expect(group).toHaveAttribute("aria-hidden", "true");
    const lines = group.querySelectorAll('[data-skeleton="line"]');
    expect(lines).toHaveLength(3);
    expect(lines[2].className).toMatch(/w-2\/3/);
    expect(lines[0].className).not.toMatch(/w-2\/3/);
  });

  it("stops pulsing under reduced motion", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild!.className).toMatch(/animate-pulse/);
    expect(container.firstElementChild!.className).toMatch(/motion-reduce:animate-none/);
  });

  it("shares StatTile's loading look", () => {
    // StatTile draws its loading headline with SKELETON_CLASS itself now, so every
    // class of ours — the reduced-motion stop included — is on the tile's placeholder.
    const { container } = render(<StatTile label="Revenue" loading />);
    const tileSkeleton = container.querySelector(".animate-pulse")!;
    for (const cls of SKELETON_CLASS.split(" ")) {
      expect(tileSkeleton.classList.contains(cls)).toBe(true);
    }
  });
});
