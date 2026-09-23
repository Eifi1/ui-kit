import { render } from "@testing-library/react";
import { FileDropzone } from "../file-dropzone";
import { FeedbackAttachmentField } from "../../feedback/feedback-attachment";

/**
 * Every `sr-only` element must have a POSITIONED ancestor.
 *
 * Tailwind implements `sr-only` as `position: absolute`. An absolutely-positioned
 * element with no positioned ancestor resolves its containing block to the INITIAL
 * containing block, so it is laid out at its own offset from the top of the document
 * — and `documentElement.scrollHeight` grows to reach it.
 *
 * Nothing looks wrong at the element itself: it is 1x1 and clipped. What breaks is the
 * page. On a long page the document grows to the offset of the last escaped element,
 * producing a SECOND scrollbar beside the app shell's own, which scrolls past the end
 * of the content into empty space. Measured on the showcase before this fix: `<body>`
 * 900px, `<html>` 47,919px, and the deepest escaped `input.sr-only` sat at offsetTop
 * 47,918.
 *
 * jsdom computes no layout, so this cannot be asserted by measuring. It is asserted
 * structurally instead: walk up from each `sr-only` node and require a `relative`,
 * `absolute` or `fixed` ancestor inside the component. That is the property that makes
 * the containing block local, and it is the one a future edit could silently drop.
 */

const POSITIONED = /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/;

/** Nearest ancestor within `root` that establishes a containing block, if any. */
function hasPositionedAncestor(el: Element, root: Element): boolean {
  let node = el.parentElement;
  while (node && node !== root.parentElement) {
    if (POSITIONED.test(node.className ?? "")) return true;
    node = node.parentElement;
  }
  return false;
}

function assertContained(root: HTMLElement) {
  const srOnly = [...root.querySelectorAll(".sr-only")];
  expect(srOnly.length, "no .sr-only nodes rendered — the test is vacuous").toBeGreaterThan(0);
  for (const el of srOnly) {
    expect(
      hasPositionedAncestor(el, root),
      `<${el.tagName.toLowerCase()} class="${el.className}"> has no positioned ancestor, ` +
        `so it escapes to the initial containing block and inflates the document height`,
    ).toBe(true);
  }
}

describe("sr-only containment", () => {
  it("FileDropzone keeps its hidden file input in a local containing block", () => {
    const { container } = render(
      <FileDropzone
        file={null}
        onFileSelected={() => {}}
        accept="image/*"
        isValid={() => true}
        invalidMessage="That file will not do"
        dropLabel="Drop a file"
        browseLabel="Browse"
        emptyLabel="No file yet"
        hint="PNG or JPEG"
      />,
    );
    assertContained(container);
  });

  it("FeedbackAttachmentField keeps its hidden file input in a local containing block", () => {
    const { container } = render(
      <FeedbackAttachmentField
        value={null}
        onChange={() => {}}
        labels={{ attachmentAdd: "Add", attachmentRemove: "Remove" }}
      />,
    );
    assertContained(container);
  });
});

describe("sr-only containment — the shell", () => {
  // The per-component cases above cannot be exhaustive: any page an app renders into
  // the shell can carry its own `sr-only` span. The shell's <main> being positioned is
  // what contains ALL of them, so that is the property pinned here.
  it("AppShell's <main> establishes a containing block for its content", async () => {
    const { MemoryRouter } = await import("react-router");
    const { Home } = await import("lucide-react");
    const { AppShell } = await import("../../shell/app-shell");
    const { container } = render(
      <MemoryRouter>
        <AppShell nav={[{ to: "/", label: "Home", icon: Home }]} topBar={<div />}>
          <span className="sr-only">page-level hidden text</span>
        </AppShell>
      </MemoryRouter>,
    );
    const main = container.querySelector("main")!;
    expect(main.className).toMatch(POSITIONED);
    assertContained(main);
  });
});
