import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import { DEFAULT_FEEDBACK_MENU_LABELS, FeedbackMenu, type FeedbackMenuProps } from "../feedback-menu";

/**
 * §4.1 of the feedback contract (keksdose `app/top-bar.tsx:156`, §7.11): the four category
 * rows, a divider, the app's extras, and ONE list link — "View feedback" for an admin,
 * "My feedback" for everyone else (keksdose `top-bar.tsx:205-214`). No heading, no CRASH.
 */

function renderMenu(props: Partial<FeedbackMenuProps> = {}, labels?: UiKitLabelOverrides) {
  const onFile = props.onFile ?? vi.fn();
  const menu = (
    <MemoryRouter>
      <FeedbackMenu onFile={onFile} {...props} />
    </MemoryRouter>
  );
  render(labels ? <UiKitProvider labels={labels}>{menu}</UiKitProvider> : menu);
  return { onFile };
}

const openMenu = (name: string | RegExp = "Send feedback") => {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("menu");
};

/** Every row, in order, by its text. */
const rows = (menu: HTMLElement) => within(menu).getAllByRole("menuitem").map((row) => row.textContent?.trim());

describe("FeedbackMenu", () => {
  it("is a 'Send feedback' trigger with Bug, Idea, Question, Other, and My feedback — never Crash", () => {
    renderMenu();
    const menu = openMenu();
    expect(rows(menu)).toEqual(["Bug", "Idea", "Question", "Other", "My feedback"]);
    expect(within(menu).queryByText("Crash")).toBeNull();
    // No heading: kastlan's "New submission" and Kurvenschmiede's "Send feedback" went.
    expect(menu.querySelectorAll("li.uppercase")).toHaveLength(0);
    // The divider between the rows and the links, always.
    expect(menu.querySelectorAll("li.border-t")).toHaveLength(1);
    expect(within(menu).getByRole("menuitem", { name: "My feedback" })).toHaveAttribute("href", "/my-feedback");
  });

  it("opens the dialog on the chosen category", () => {
    const { onFile } = renderMenu();
    fireEvent.click(within(openMenu()).getByRole("menuitem", { name: "Question" }));
    expect(onFile).toHaveBeenCalledWith("QUESTION");
    // A chosen row closes the menu.
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("gives an admin only View feedback — the inbox, in place of My feedback", () => {
    renderMenu({ isAdmin: true });
    const menu = openMenu();
    expect(rows(menu)).toEqual(["Bug", "Idea", "Question", "Other", "View feedback"]);
    expect(within(menu).getByRole("menuitem", { name: "View feedback" })).toHaveAttribute("href", "/feedback");
    expect(within(menu).queryByRole("menuitem", { name: "My feedback" })).toBeNull();
  });

  it("takes the routes from props", () => {
    renderMenu({ myFeedbackHref: "/me/reports", inboxHref: "/admin/reports" });
    expect(within(openMenu()).getByRole("menuitem", { name: "My feedback" })).toHaveAttribute("href", "/me/reports");
    cleanup();
    renderMenu({ isAdmin: true, myFeedbackHref: "/me/reports", inboxHref: "/admin/reports" });
    expect(within(openMenu()).getByRole("menuitem", { name: "View feedback" })).toHaveAttribute("href", "/admin/reports");
  });

  it("puts the app's extra entries between the divider and the list link", () => {
    const onAssistant = vi.fn();
    renderMenu({
      isAdmin: true,
      extraEntries: [
        { key: "assistant", label: "Help assistant", onSelect: onAssistant },
        { kind: "link", key: "support", to: "/support", label: "Support chat", trailing: <span>2</span> },
      ],
    });
    const menu = openMenu();
    expect(rows(menu)).toEqual([
      "Bug",
      "Idea",
      "Question",
      "Other",
      "Help assistant",
      "Support chat2",
      "View feedback",
    ]);
    const divider = menu.querySelector("li.border-t")!;
    const assistant = within(menu).getByRole("menuitem", { name: "Help assistant" });
    expect(divider.compareDocumentPosition(assistant) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(assistant);
    expect(onAssistant).toHaveBeenCalled();
  });

  it("joins the badge's label to the trigger's name", () => {
    renderMenu({ iconBadge: { label: "2 unread", tone: "danger" } });
    expect(screen.getByRole("button", { name: "Send feedback 2 unread" })).toBeInTheDocument();
  });

  it("reads its words from feedbackMenu and the rows from feedbackCategory; the prop wins", () => {
    renderMenu(
      { isAdmin: true, labels: { viewFeedback: "Inbox" } },
      {
        feedbackMenu: { trigger: "Feedback senden", myFeedback: "Mein Feedback", viewFeedback: "Feedback ansehen" },
        feedbackCategory: { CRASH: "Absturz", BUG: "Fehler", IDEA: "Idee", QUESTION: "Frage", OTHER: "Sonstiges" },
      } as UiKitLabelOverrides,
    );
    const menu = openMenu("Feedback senden");
    expect(rows(menu)).toEqual(["Fehler", "Idee", "Frage", "Sonstiges", "Inbox"]);
  });

  it("has English defaults", () => {
    expect(DEFAULT_FEEDBACK_MENU_LABELS).toEqual({
      trigger: "Send feedback",
      myFeedback: "My feedback",
      viewFeedback: "View feedback",
    });
  });
});
