import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeedbackAttachmentField, type FeedbackAttachmentFieldSingleProps } from "../feedback-attachment";

/**
 * keksdose's 0.23 adoption (the support chat): the add / capture buttons take Button's
 * `variant` and `size` (its own picker was a ghost / sm FileButton beside Send), and the
 * field's root is bounded in a flex row (`min-w-0 max-w-full`), so a long file name
 * truncates instead of running off a 390px composer — in every mode.
 *
 * jsdom lays nothing out, so the width is asserted as the classes that bound it; the
 * overflow itself was measured in Chromium (field right edge 592px on a 390px page
 * before, 365px after).
 */

const capture = () => Promise.resolve(null);
const upload = vi.fn();

type Mode = "single" | "multiple" | "refs";
const modes: Mode[] = ["single", "multiple", "refs"];

/** The props every mode shares that these tests set. */
type Look = Pick<FeedbackAttachmentFieldSingleProps, "buttonVariant" | "buttonSize" | "className">;

function field(mode: Mode, look: Look = {}) {
  const common = { onCaptureScreenshot: capture, ...look };
  if (mode === "single") return <FeedbackAttachmentField value={null} onChange={vi.fn()} {...common} />;
  if (mode === "multiple") return <FeedbackAttachmentField multiple value={[]} onChange={vi.fn()} {...common} />;
  return <FeedbackAttachmentField refs value={[]} onChange={vi.fn()} onUpload={upload} {...common} />;
}

const buttons = () => [
  screen.getByRole("button", { name: /Add attachment/ }),
  screen.getByRole("button", { name: /Capture screenshot/ }),
];

describe.each(modes)("FeedbackAttachmentField (%s) buttons", (mode) => {
  it("are secondary / md by default, as before", () => {
    render(field(mode));
    for (const button of buttons()) {
      expect(button).toHaveClass("border", "px-3", "py-2", "text-sm");
      expect(button.querySelector("svg")).toHaveClass("size-4");
    }
  });

  it("take buttonVariant and buttonSize — ghost / sm, with 14px icons", () => {
    render(field(mode, { buttonVariant: "ghost", buttonSize: "sm" }));
    for (const button of buttons()) {
      expect(button).toHaveClass("px-2", "py-1", "text-xs");
      expect(button).not.toHaveClass("border");
      expect(button.querySelector("svg")).toHaveClass("size-3.5");
    }
  });
});

describe.each(modes)("FeedbackAttachmentField (%s) root", (mode) => {
  it("is bounded in a flex row, so a long name truncates", () => {
    const { container } = render(field(mode));
    expect(container.firstElementChild).toHaveClass("relative", "min-w-0", "max-w-full");
  });

  it("lets the host's className win", () => {
    const { container } = render(field(mode, { className: "max-w-xs" }));
    expect(container.firstElementChild).toHaveClass("max-w-xs", "min-w-0");
    expect(container.firstElementChild).not.toHaveClass("max-w-full");
  });
});

describe("FeedbackAttachmentField refs, with a long name inside a flex row", () => {
  it("truncates the chip's name (the class jsdom can check)", () => {
    const name = "Screenshot 2026-10-03 at 07.45.12 of the whole overview page.png";
    render(
      <div className="flex">
        <FeedbackAttachmentField
          refs
          value={[{ key: "a", name, size: 1000, type: "image/png" }]}
          onChange={vi.fn()}
          onUpload={upload}
        />
      </div>,
    );
    // 0.33 (§10.17): "…" at Normal only; from Large up the name wraps.
    expect(screen.getByText(name)).toHaveClass("truncate-until-large");
    expect(screen.getByText(name)).not.toHaveClass("truncate");
    expect(screen.getByText(name).closest("ul")!.parentElement).toHaveClass("min-w-0", "max-w-full");
  });
});

describe("FeedbackAttachmentField at Large (0.33, docs/text-size-harmonization.md §10.17)", () => {
  // A file's name and size end in "…" at Normal only: from Large up nothing may cut them.
  const name = "Statement for the whole of September and October 2026.pdf";
  const file = new File(["%PDF"], name, { type: "application/pdf" });

  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:1");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  /** The name's line and the line under it (its size), whatever the mode. */
  function lines() {
    const own = screen.getByText(name);
    return { own, size: own.nextElementSibling as HTMLElement };
  }

  it("single: the name", () => {
    render(<FeedbackAttachmentField value={file} onChange={vi.fn()} />);
    expect(lines().own).toHaveClass("truncate-until-large");
    expect(lines().own).not.toHaveClass("truncate");
  });

  it("multiple: the name and its size line", () => {
    render(<FeedbackAttachmentField multiple value={[file]} onChange={vi.fn()} />);
    const { own, size } = lines();
    for (const line of [own, size]) {
      expect(line).toHaveClass("truncate-until-large");
      expect(line).not.toHaveClass("truncate");
    }
  });

  it("refs: the name and its size line", () => {
    render(
      <FeedbackAttachmentField
        refs
        value={[{ key: "a", name, size: 4, type: "application/pdf" }]}
        onChange={vi.fn()}
        onUpload={upload}
      />,
    );
    const { own, size } = lines();
    for (const line of [own, size]) {
      expect(line).toHaveClass("truncate-until-large");
      expect(line).not.toHaveClass("truncate");
    }
  });
});
