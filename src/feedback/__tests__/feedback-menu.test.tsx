import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import { DEFAULT_FEEDBACK_MENU_LABELS, FeedbackMenu, type FeedbackMenuProps } from "../feedback-menu";

/**
 * §4.1 of the feedback contract (keksdose `app/top-bar.tsx:156`, §7.11): the four category
 * rows, a divider, the app's extras, and the list links by role (0.40, §10.2 decision 11):
 * "Feedback discussion" with `publicHref`, "My feedback" for everyone, "Feedback inbox" for
 * an admin. No heading, no CRASH.
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

  it("gives an admin My feedback and the Feedback inbox under it (0.40)", () => {
    renderMenu({ isAdmin: true });
    const menu = openMenu();
    expect(rows(menu)).toEqual(["Bug", "Idea", "Question", "Other", "My feedback", "Feedback inbox"]);
    expect(within(menu).getByRole("menuitem", { name: "Feedback inbox" })).toHaveAttribute("href", "/feedback");
    expect(within(menu).getByRole("menuitem", { name: "My feedback" })).toHaveAttribute("href", "/my-feedback");
  });

  it("takes the routes from props", () => {
    renderMenu({ myFeedbackHref: "/me/reports", inboxHref: "/admin/reports" });
    expect(within(openMenu()).getByRole("menuitem", { name: "My feedback" })).toHaveAttribute("href", "/me/reports");
    cleanup();
    renderMenu({ isAdmin: true, myFeedbackHref: "/me/reports", inboxHref: "/admin/reports" });
    expect(within(openMenu()).getByRole("menuitem", { name: "Feedback inbox" })).toHaveAttribute("href", "/admin/reports");
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
      "My feedback",
      "Feedback inbox",
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
      { isAdmin: true, labels: { inbox: "Inbox" } },
      {
        feedbackMenu: { trigger: "Feedback senden", myFeedback: "Mein Feedback", inbox: "Feedback-Eingang" },
        feedbackCategory: { CRASH: "Absturz", BUG: "Fehler", IDEA: "Idee", QUESTION: "Frage", OTHER: "Sonstiges" },
      } as UiKitLabelOverrides,
    );
    const menu = openMenu("Feedback senden");
    expect(rows(menu)).toEqual(["Fehler", "Idee", "Frage", "Sonstiges", "Mein Feedback", "Inbox"]);
  });

  it("has English defaults", () => {
    expect(DEFAULT_FEEDBACK_MENU_LABELS).toEqual({
      trigger: "Send feedback",
      myFeedback: "My feedback",
      viewFeedback: "View feedback",
      allFeedback: "All feedback",
      discussion: "Feedback discussion",
      inbox: "Feedback inbox",
    });
  });
});

/** 0.38 (§9.2 decision 21) and 0.40 (§10.2 decision 11): `publicHref` adds "Feedback
 *  discussion" first of the list links, for everyone. */
describe("FeedbackMenu publicHref", () => {
  it("has no Feedback discussion row without it", () => {
    renderMenu();
    expect(within(openMenu()).queryByRole("menuitem", { name: "Feedback discussion" })).toBeNull();
  });

  it("links Feedback discussion above My feedback for a user", () => {
    renderMenu({ publicHref: "/all-feedback" });
    const menu = openMenu();
    expect(rows(menu)).toEqual(["Bug", "Idea", "Question", "Other", "Feedback discussion", "My feedback"]);
    expect(within(menu).getByRole("menuitem", { name: "Feedback discussion" })).toHaveAttribute("href", "/all-feedback");
  });

  it("gives an admin all three, in order, after the app's own rows", () => {
    renderMenu({
      publicHref: "/all-feedback",
      isAdmin: true,
      extraEntries: [{ kind: "link", key: "support", to: "/support", label: "Support chat" }],
    });
    expect(rows(openMenu())).toEqual([
      "Bug",
      "Idea",
      "Question",
      "Other",
      "Support chat",
      "Feedback discussion",
      "My feedback",
      "Feedback inbox",
    ]);
  });

  it("speaks the provider's language", () => {
    renderMenu({ publicHref: "/all-feedback" }, { feedbackMenu: { trigger: "Feedback senden", discussion: "Feedback-Diskussion" } });
    expect(within(openMenu("Feedback senden")).getByRole("menuitem", { name: "Feedback-Diskussion" })).toBeInTheDocument();
  });
});

/** 0.40 (§10.8): the list links per role — the counts the three apps see — with their
 *  keys, routes and icons stable. */
describe("FeedbackMenu by role (0.40)", () => {
  const LINKS = ["Feedback discussion", "My feedback", "Feedback inbox"];
  const links = (menu: HTMLElement) => rows(menu).filter((row) => LINKS.includes(row ?? ""));

  it.each([
    ["an admin with public parts (keksdose)", { isAdmin: true, publicHref: "/all-feedback" }, LINKS],
    ["a member with public parts", { publicHref: "/all-feedback" }, ["Feedback discussion", "My feedback"]],
    ["an admin without them (kastlan)", { isAdmin: true }, ["My feedback", "Feedback inbox"]],
    ["anyone else without them (a KS customer)", {}, ["My feedback"]],
  ] as const)("%s", (_who, props, expected) => {
    renderMenu(props);
    expect(links(openMenu())).toEqual(expected);
  });

  it("keeps the keys' routes and draws Users, User and Inbox", () => {
    renderMenu({ isAdmin: true, publicHref: "/all-feedback" });
    const menu = openMenu();
    const icon = (name: string) => within(menu).getByRole("menuitem", { name }).querySelector("svg")?.getAttribute("class");
    expect(within(menu).getByRole("menuitem", { name: "Feedback discussion" })).toHaveAttribute("href", "/all-feedback");
    expect(within(menu).getByRole("menuitem", { name: "My feedback" })).toHaveAttribute("href", "/my-feedback");
    expect(within(menu).getByRole("menuitem", { name: "Feedback inbox" })).toHaveAttribute("href", "/feedback");
    expect(icon("Feedback discussion")).toContain("lucide-users");
    expect(icon("My feedback")).toMatch(/lucide-user(\s|$)/);
    expect(icon("Feedback inbox")).toContain("lucide-inbox");
  });
});
