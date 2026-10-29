import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import {
  FeedbackPublicSwitch,
  feedbackPublicSwitchAllowed,
  type FeedbackPublicSwitchRow,
} from "../feedback-public-switch";

/**
 * docs/feedback-harmonization.md §9.3, decision 6: the admin flips `public` at any status;
 * the author while the report is open, and on a `filed_private` report at any status (the
 * opt-out); never on a CRASH; nobody else sees the flag at all.
 */

const AUTHOR = 7;
const row = (over: Partial<FeedbackPublicSwitchRow> = {}): FeedbackPublicSwitchRow => ({
  user_id: AUTHOR,
  category: "BUG",
  status: "OPEN",
  public: true,
  filed_private: false,
  ...over,
});

describe("feedbackPublicSwitchAllowed", () => {
  it("lets an admin flip it at any status, never on a crash", () => {
    expect(feedbackPublicSwitchAllowed(row({ status: "DONE" }), { isAdmin: true })).toBe(true);
    expect(feedbackPublicSwitchAllowed(row({ category: "CRASH" }), { isAdmin: true })).toBe(false);
  });

  it("lets the author flip it while the report is open (OPEN, READY, IN_PROGRESS)", () => {
    for (const status of ["OPEN", "READY", "IN_PROGRESS"] as const) {
      expect(feedbackPublicSwitchAllowed(row({ status }), { isAdmin: false, viewerId: AUTHOR })).toBe(true);
    }
    for (const status of ["IN_EVALUATION", "DONE", "WONT_DO", "POSTPONED"] as const) {
      expect(feedbackPublicSwitchAllowed(row({ status }), { isAdmin: false, viewerId: AUTHOR })).toBe(false);
    }
  });

  it("lets the author of a filed_private report opt out at any status", () => {
    expect(
      feedbackPublicSwitchAllowed(row({ status: "DONE", filed_private: true }), { isAdmin: false, viewerId: AUTHOR }),
    ).toBe(true);
  });

  it("refuses anyone else, and the author of an erased row is nobody", () => {
    expect(feedbackPublicSwitchAllowed(row(), { isAdmin: false, viewerId: 8 })).toBe(false);
    expect(feedbackPublicSwitchAllowed(row({ user_id: null }), { isAdmin: false, viewerId: null })).toBe(false);
  });

  it("reads `mine` when the server sent it", () => {
    expect(feedbackPublicSwitchAllowed(row({ user_id: null, mine: true }), { isAdmin: false })).toBe(true);
    expect(feedbackPublicSwitchAllowed(row({ mine: false }), { isAdmin: false, viewerId: AUTHOR })).toBe(false);
  });

  it("reads a server's `null` as not sent (0.38.1: server-kit answers the public fields as null)", () => {
    expect(feedbackPublicSwitchAllowed(row({ mine: null }), { isAdmin: false, viewerId: AUTHOR })).toBe(true);
  });
});

describe("FeedbackPublicSwitch", () => {
  const sw = () => screen.getByRole("switch", { name: "Visible to others" });

  it("is a 'Visible to others' switch with what that means, and reports the new state", () => {
    const onChange = vi.fn();
    render(<FeedbackPublicSwitch row={row()} isAdmin={false} viewerId={AUTHOR} onChange={onChange} />);
    expect(sw()).toBeChecked();
    expect(sw()).toHaveAccessibleDescription("Other users see the title and text, never your screenshots or files.");
    fireEvent.click(sw());
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is locked with the reason for the author past the open window", () => {
    const onChange = vi.fn();
    render(
      <FeedbackPublicSwitch row={row({ status: "DONE" })} isAdmin={false} viewerId={AUTHOR} onChange={onChange} />,
    );
    expect(sw()).toHaveAttribute("aria-disabled", "true");
    expect(sw()).toHaveAccessibleDescription(expect.stringContaining("Only while the report is still open."));
    fireEvent.click(sw());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("holds still while the PATCH runs", () => {
    render(<FeedbackPublicSwitch row={row()} isAdmin onChange={() => {}} pending />);
    expect(sw()).toBeDisabled();
  });

  it("is not drawn on a crash, for someone else, or without a `public` field", () => {
    const { container, rerender } = render(
      <FeedbackPublicSwitch row={row({ category: "CRASH" })} isAdmin onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<FeedbackPublicSwitch row={row()} isAdmin={false} viewerId={8} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<FeedbackPublicSwitch row={row({ public: undefined })} isAdmin onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<FeedbackPublicSwitch row={row({ public: null })} isAdmin onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <FeedbackPublicSwitch row={row({ public: false })} isAdmin onChange={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("switch", { name: "Für andere sichtbar" })).not.toBeChecked();
  });
});
