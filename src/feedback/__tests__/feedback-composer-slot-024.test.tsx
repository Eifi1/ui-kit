import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatComposer, FeedbackComposer } from "../feedback-thread";
import type { ChatComposerSlotContext } from "../feedback-thread";
import { FeedbackAttachmentField, type FeedbackAttachmentRef } from "../feedback-attachment";

/**
 * keksdose's 0.23 adoption (the support chat's reply box): `attachmentSlot` may be a
 * function of `{ root, pending }`, so a `refs`-mode field in it hears an image pasted
 * into the composer's box through `pasteFrom={root}` — without the host wrapping the
 * composer in a ref'd element of its own — and holds while a send is in flight.
 */

const png = (name: string) => new File(["x"], name, { type: "image/png" });
const clipboard = (...files: File[]) => ({
  clipboardData: { items: files.map((file) => ({ kind: "file", type: file.type, getAsFile: () => file })) },
});
const box = () => screen.getByRole("textbox", { name: "Write a comment" });
const upload = (file: File): Promise<FeedbackAttachmentRef> =>
  Promise.resolve({ key: `k-${file.name}`, name: file.name, size: file.size, type: file.type });
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function Host({ pending = false, onUpload = upload }: { pending?: boolean; onUpload?: typeof upload }) {
  const [refs, setRefs] = useState<FeedbackAttachmentRef[]>([]);
  return (
    <ChatComposer
      onSend={vi.fn()}
      pending={pending}
      attachmentSlot={({ root, pending: sending }) => (
        <FeedbackAttachmentField
          refs
          value={refs}
          onChange={setRefs}
          onUpload={onUpload}
          pasteFrom={root}
          disabled={sending}
        />
      )}
    />
  );
}

describe("ChatComposer attachmentSlot as a function", () => {
  it("hands the slot's field the composer root, so an image pasted into the box reaches it", async () => {
    const onUpload = vi.fn(upload);
    render(<Host onUpload={onUpload} />);
    // The paste is made in the box — the field's sibling — and bubbles to the root.
    const notPrevented = fireEvent.paste(box(), clipboard(png("image.png")));
    expect(notPrevented).toBe(false);
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload.mock.calls[0][0].name).toBe("pasted.png");
    await settle();
    expect(screen.getByRole("list", { name: "Attachments" })).toHaveTextContent("pasted.png");
  });

  it("leaves a paste of text in the box alone", () => {
    const onUpload = vi.fn(upload);
    render(<Host onUpload={onUpload} />);
    const notPrevented = fireEvent.paste(box(), {
      clipboardData: { items: [{ kind: "string", type: "text/plain", getAsFile: () => null }] },
    });
    expect(notPrevented).toBe(true);
    expect(onUpload).not.toHaveBeenCalled();
  });

  it("has the root attached by the slot's first effect, in one render, with the same ref every time", () => {
    const seen: (HTMLElement | null)[] = [];
    const refs: RefObject<HTMLElement | null>[] = [];
    function Probe({ root }: { root: RefObject<HTMLElement | null> }) {
      useEffect(() => {
        seen.push(root.current);
      }, [root]);
      return null;
    }
    const slot = vi.fn((ctx: ChatComposerSlotContext) => {
      refs.push(ctx.root);
      return <Probe root={ctx.root} />;
    });
    const { rerender } = render(<FeedbackComposer data-testid="composer" onSend={vi.fn()} attachmentSlot={slot} />);
    // No second render to bring an element in: the first effect already sees it.
    expect(slot).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([screen.getByTestId("composer")]);

    rerender(<FeedbackComposer data-testid="composer" onSend={vi.fn()} attachmentSlot={slot} pending />);
    expect(slot).toHaveBeenCalledTimes(2);
    expect(slot.mock.calls[1][0].pending).toBe(true);
    // The same ref object, so an effect keyed on it (the field's paste listener) does
    // not run again.
    expect(refs[1]).toBe(refs[0]);
    expect(seen).toHaveLength(1);
  });

  it("passes `pending`, for the field's `disabled`", () => {
    const { rerender } = render(<Host />);
    expect(screen.getByRole("button", { name: /Add attachment/ })).toBeEnabled();
    rerender(<Host pending />);
    expect(screen.getByRole("button", { name: /Add attachment/ })).toBeDisabled();
  });

  it("is not called while disabledReason stands in for the composer", () => {
    const slot = vi.fn(() => <span>picker</span>);
    render(<FeedbackComposer onSend={vi.fn()} disabledReason="Closed." attachmentSlot={slot} />);
    expect(slot).not.toHaveBeenCalled();
    expect(screen.queryByText("picker")).not.toBeInTheDocument();
  });

  it("keeps the plain-node form as it was", () => {
    render(<FeedbackComposer onSend={vi.fn()} attachmentSlot={<button type="button">Host picker</button>} />);
    expect(screen.getByRole("button", { name: "Host picker" })).toBeInTheDocument();
  });
});

describe("FeedbackComposer attachment button look", () => {
  it("hands buttonVariant / buttonSize to the built-in field; default as before", () => {
    const { unmount } = render(<FeedbackComposer onSend={vi.fn()} attachment />);
    const md = screen.getByRole("button", { name: /Add attachment/ });
    expect(md).toHaveClass("border", "px-3");
    unmount();

    render(<FeedbackComposer onSend={vi.fn()} attachment={{ buttonVariant: "ghost", buttonSize: "sm" }} />);
    const sm = screen.getByRole("button", { name: /Add attachment/ });
    expect(sm).toHaveClass("px-2", "py-1", "text-xs");
    expect(sm).not.toHaveClass("border");
  });
});
