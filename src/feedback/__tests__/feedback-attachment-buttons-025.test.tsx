import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { FeedbackDialog } from "../feedback-dialog";
import { FeedbackNoteEditor } from "../feedback-inbox";

/**
 * 0.25: FeedbackAttachmentField took `buttonVariant` / `buttonSize` in 0.24 (keksdose's
 * support chat), but the two components that build the field themselves — the
 * FeedbackDialog and the inbox's FeedbackNoteEditor — passed neither, so their hosts
 * could not quieten the add / capture buttons. Both now hand them through: the dialog
 * as `attachmentButtonVariant` / `attachmentButtonSize` beside its other attachment
 * options, the note editor inside its `attachment` config. Left out, nothing changes.
 *
 * The classes asserted are Button's own (the same ones feedback-attachment-024 holds
 * the field to): secondary / md is bordered `px-3 py-2 text-sm` with a 16px icon; ghost /
 * sm is borderless `px-2 py-1 text-xs` with a 14px icon.
 */

beforeAll(() => {
  // The field previews a picked image through an object URL; jsdom has none.
  URL.createObjectURL = () => "blob:preview";
  URL.revokeObjectURL = () => {};
});

const capture = () => Promise.resolve(null);

const buttons = () => [
  screen.getByRole("button", { name: /Add attachment/ }),
  screen.getByRole("button", { name: /Capture screenshot/ }),
];

const expectDefaultLook = () => {
  for (const button of buttons()) {
    expect(button).toHaveClass("border", "px-3", "py-2", "text-sm");
    expect(button.querySelector("svg")).toHaveClass("size-4");
  }
};

const expectGhostSmall = () => {
  for (const button of buttons()) {
    expect(button).toHaveClass("px-2", "py-1", "text-xs");
    expect(button).not.toHaveClass("border");
    expect(button.querySelector("svg")).toHaveClass("size-3.5");
  }
};

const dialog = {
  open: true,
  onClose: () => {},
  categories: [{ value: "bug", label: "Bug" }],
  category: "bug",
  onCategoryChange: () => {},
  onCaptureScreenshot: capture,
};

describe("FeedbackDialog attachment buttons (0.25)", () => {
  it("keep the field's secondary / md look by default", () => {
    render(<FeedbackDialog {...dialog} onSubmit={() => {}} />);
    expectDefaultLook();
  });

  it("take attachmentButtonVariant and attachmentButtonSize — single mode", () => {
    render(
      <FeedbackDialog
        {...dialog}
        onSubmit={() => {}}
        attachmentButtonVariant="ghost"
        attachmentButtonSize="sm"
      />,
    );
    expectGhostSmall();
  });

  it("take them in multiple mode too", () => {
    render(
      <FeedbackDialog
        {...dialog}
        attachments="multiple"
        onSubmit={() => {}}
        attachmentButtonVariant="ghost"
        attachmentButtonSize="sm"
      />,
    );
    expectGhostSmall();
  });

  it("take one without the other", () => {
    render(<FeedbackDialog {...dialog} onSubmit={() => {}} attachmentButtonSize="sm" />);
    for (const button of buttons()) {
      // Still the secondary border, at the small size.
      expect(button).toHaveClass("border", "px-2", "py-1", "text-xs");
    }
  });

  it("leave the dialog's own Cancel / Send alone", () => {
    render(
      <FeedbackDialog
        {...dialog}
        onSubmit={() => {}}
        attachmentButtonVariant="ghost"
        attachmentButtonSize="sm"
      />,
    );
    expect(screen.getByRole("button", { name: "Send" })).toHaveClass("px-3", "py-2", "text-sm");
  });
});

describe("FeedbackNoteEditor attachment buttons (0.25)", () => {
  const editor = (look: { buttonVariant?: "ghost"; buttonSize?: "sm" } = {}) => (
    <FeedbackNoteEditor
      initial=""
      pending={false}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      saveLabel="Save"
      cancelLabel="Cancel"
      attachment={{
        labels: { attachmentAdd: "Add attachment", attachmentRemove: "Remove" },
        onCaptureScreenshot: capture,
        ...look,
      }}
    />
  );

  it("keep the field's secondary / md look by default", () => {
    render(editor());
    expectDefaultLook();
  });

  it("take buttonVariant and buttonSize from the attachment config", () => {
    render(editor({ buttonVariant: "ghost", buttonSize: "sm" }));
    expectGhostSmall();
  });
});
