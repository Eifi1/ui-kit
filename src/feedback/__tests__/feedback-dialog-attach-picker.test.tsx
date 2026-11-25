import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 0.66: the attachment field's opt-in `picker` and `sources` reach it through the dialog,
 * which builds its field itself — without them a host had no way to ask for the sheet
 * short of rebuilding the dialog (as `attachmentButtonVariant` was, 0.25.0). The field is
 * a spy: what is asserted is what the dialog hands it.
 */

const field = vi.fn((_props: Record<string, unknown>) => null);
vi.mock("../feedback-attachment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../feedback-attachment")>()),
  FeedbackAttachmentField: (props: Record<string, unknown>) => field(props),
}));

const { FeedbackDialog } = await import("../feedback-dialog");

const base = {
  open: true,
  onClose: () => {},
  categories: [{ value: "bug", label: "Bug" }],
  category: "bug",
  onCategoryChange: () => {},
};

beforeEach(() => field.mockClear());

describe("FeedbackDialog hands the field its picker and sources", () => {
  it("in the single mode", () => {
    render(<FeedbackDialog {...base} onSubmit={() => {}} picker="sheet" sources={["camera", "files"]} />);
    expect(field.mock.calls.at(-1)![0]).toMatchObject({ picker: "sheet", sources: ["camera", "files"] });
  });

  it("in the multiple mode", () => {
    render(
      <FeedbackDialog {...base} attachments="multiple" onSubmit={() => {}} picker="sheet" sources={["screenshot"]} />,
    );
    expect(field.mock.calls.at(-1)![0]).toMatchObject({ multiple: true, picker: "sheet", sources: ["screenshot"] });
  });

  it("leaves both to the field's defaults when not given", () => {
    render(<FeedbackDialog {...base} onSubmit={() => {}} />);
    const props = field.mock.calls.at(-1)![0];
    expect(props.picker).toBeUndefined();
    expect(props.sources).toBeUndefined();
  });
});
