import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackDialog } from "../feedback-dialog";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE } from "../../i18n/locales/de";

/**
 * keksdose K1: a report with only a subject must be sendable where the app says so
 * (`requireBody={false}`); a subject of spaces never is, since keksdose's API answers
 * it with a 422.
 */
const base = {
  open: true,
  onClose: () => {},
  categories: [{ value: "bug", label: "Bug" }],
  category: "bug",
  onCategoryChange: () => {},
};
const send = () => screen.getByRole("button", { name: "Send" });
const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("FeedbackDialog body requirement (keksdose K1)", () => {
  it("still requires a body by default", () => {
    render(<FeedbackDialog {...base} onSubmit={() => {}} />);
    type("Subject", "Chart is empty");
    expect(send()).toBeDisabled();
    type("What happened?", "   ");
    expect(send()).toBeDisabled();
    type("What happened?", "Since Monday");
    expect(send()).toBeEnabled();
  });

  it("sends a title-only report with requireBody={false}, and labels the body optional", async () => {
    const onSubmit = vi.fn();
    render(<FeedbackDialog {...base} onSubmit={onSubmit} requireBody={false} />);
    expect(screen.getByLabelText("What happened? (optional)")).toBeInTheDocument();
    type("Subject", "Chart is empty");
    expect(send()).toBeEnabled();
    await act(async () => fireEvent.click(send()));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Chart is empty", body: "" }));
  });

  it("never sends a subject of spaces", () => {
    render(<FeedbackDialog {...base} onSubmit={() => {}} requireBody={false} />);
    type("Subject", "   ");
    expect(send()).toBeDisabled();
  });

  it("keeps a caller's own body label, and translates the optional one", () => {
    const { unmount } = render(
      <FeedbackDialog {...base} onSubmit={() => {}} requireBody={false} labels={{ body: "Details (optional)" }} />,
    );
    expect(screen.getByLabelText("Details (optional)")).toBeInTheDocument();
    unmount();
    render(
      <UiKitProvider labels={{ feedbackDialog: UI_KIT_LABELS_DE.feedbackDialog }}>
        <FeedbackDialog {...base} onSubmit={() => {}} requireBody={false} labels={{ save: "Send" }} />
      </UiKitProvider>,
    );
    expect(screen.getByLabelText("Was ist passiert? (optional)")).toBeInTheDocument();
  });
});
