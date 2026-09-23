import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackNoteEditor } from "../feedback-inbox";

/**
 * A draft belongs to the person writing it (audit 2026-09-22, §react-correctness).
 *
 * `FeedbackNoteEditor` re-seeded itself from `initial` in an effect, so any render
 * that arrived with a different `initial` threw the half-written reply away — and,
 * since the same effect cleared `file`, the screenshot picked out to go with it. The
 * effect fires for reasons the person typing cannot see: the inbox refreshing under
 * the editor, the owner re-deriving the note it already had, a draft saved elsewhere.
 * What they see is the box reverting and the picture gone, with nothing to undo.
 *
 * Whether the editor is now editing something ELSE is the caller's fact, not one the
 * component can infer, so the caller states it — with a `key`, or with `resetKey`
 * where the call site has no id to hand.
 */
const LABELS = { attachmentAdd: "Add a picture", attachmentRemove: "Remove" };

function Editor({ initial, resetKey }: { initial: string; resetKey?: string | number }) {
  return (
    <FeedbackNoteEditor
      initial={initial}
      resetKey={resetKey}
      pending={false}
      onSave={vi.fn()}
      onCancel={vi.fn()}
      saveLabel="Save"
      cancelLabel="Cancel"
      attachment={{ labels: LABELS }}
    />
  );
}

/** The inbox around the editor, re-rendering for reasons of its own. */
function Host() {
  const [initial, setInitial] = useState("saved note");
  const [resetKey, setResetKey] = useState<string | number>("note-1");
  return (
    <>
      <button onClick={() => setInitial("saved note, edited elsewhere")}>refresh</button>
      <button onClick={() => setResetKey("note-2")}>open another</button>
      <Editor initial={initial} resetKey={resetKey} />
    </>
  );
}

// jsdom implements no object URLs, and the attachment field makes one to preview the
// picture. Plain functions rather than `vi.fn`, because `clearMocks` would strip the
// implementation back out between the cases below.
beforeAll(() => {
  URL.createObjectURL = () => "blob:preview";
  URL.revokeObjectURL = () => {};
});

function box() {
  return screen.getByRole("textbox");
}

function attach(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["x"], "shot.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("FeedbackNoteEditor's draft", () => {
  it("survives a new `initial` arriving mid-reply, with its attachment", () => {
    const { container } = render(<Host />);
    fireEvent.change(box(), { target: { value: "half a reply" } });
    attach(container);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));

    expect(box()).toHaveValue("half a reply");
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("re-seeds when the caller says the editor is on a different note", () => {
    const { container } = render(<Host />);
    fireEvent.change(box(), { target: { value: "half a reply" } });
    attach(container);

    fireEvent.click(screen.getByRole("button", { name: "open another" }));

    expect(box()).toHaveValue("saved note");
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("re-seeds when the caller remounts it with a key, without a resetKey at all", () => {
    const view = render(<Editor initial="saved note" />);
    fireEvent.change(box(), { target: { value: "half a reply" } });
    view.rerender(<Editor initial="a different note" />);
    // No `resetKey`: `initial` alone never discards anything.
    expect(box()).toHaveValue("half a reply");

    view.unmount();
    render(<Editor initial="a different note" />);
    expect(box()).toHaveValue("a different note");
  });
});
