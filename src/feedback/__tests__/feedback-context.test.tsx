import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import {
  DEFAULT_FEEDBACK_CONTEXT_LABELS,
  FeedbackContextBox,
  feedbackContext,
  type FeedbackSubmitter,
} from "../feedback-context";

/**
 * §3.2 / §4.2 of the feedback contract: the `context` object and the box that shows it,
 * from one set of values — keksdose `use-feedback-dialog.tsx:105` and `:222`.
 */

const ADA: FeedbackSubmitter = { id: 7, email: "ada@example.com", display_name: "Ada Example" };
const URL_ = "https://dev.example.app/accounts?p=2#row-3";
const FIXED = { origin: "https://dev.example.app", viewport: "406x816", ua: "TestAgent/1.0" };

describe("feedbackContext", () => {
  it("writes every §3.2 key, in keksdose's order", () => {
    const context = feedbackContext({
      user: ADA,
      attachUrl: true,
      url: URL_,
      environment: "dev",
      version: "0.4.26",
      ...FIXED,
    });
    expect(context).toEqual({
      url: URL_,
      route: "/accounts",
      origin: "https://dev.example.app",
      environment: "dev",
      user_id: 7,
      user_email: "ada@example.com",
      user_display_name: "Ada Example",
      viewport: "406x816",
      ua: "TestAgent/1.0",
      version: "0.4.26",
    });
    expect(Object.keys(context)).toEqual([
      "url",
      "route",
      "origin",
      "environment",
      "user_id",
      "user_email",
      "user_display_name",
      "viewport",
      "ua",
      "version",
    ]);
  });

  it("withholds url and route — and only those — when the box is unticked", () => {
    const context = feedbackContext({ user: ADA, attachUrl: false, url: URL_, environment: "prod", ...FIXED });
    expect(context.url).toBe("");
    expect(context.route).toBe("");
    // Which copy of the app is not personal, and triage asks it first.
    expect(context.origin).toBe("https://dev.example.app");
    expect(context.environment).toBe("prod");
    expect(context.user_email).toBe("ada@example.com");
  });

  it("leaves environment and version out when the app has none, and sends a missing user as nulls", () => {
    const context = feedbackContext({ user: null, attachUrl: true, url: URL_, ...FIXED });
    expect(context).not.toHaveProperty("environment");
    expect(context).not.toHaveProperty("version");
    expect(context).toMatchObject({ user_id: null, user_email: null, user_display_name: null });
  });

  it("reads the route off a path-only url, and takes one it is given", () => {
    expect(feedbackContext({ attachUrl: true, url: "/plans/3?tab=x", ...FIXED }).route).toBe("/plans/3");
    expect(feedbackContext({ attachUrl: true, url: URL_, route: "/custom", ...FIXED }).route).toBe("/custom");
  });

  it("defaults origin, viewport and ua from the browser", () => {
    const context = feedbackContext({ attachUrl: true, url: window.location.href });
    expect(context.origin).toBe(window.location.origin);
    expect(context.viewport).toBe(`${window.innerWidth}x${window.innerHeight}`);
    expect(context.ua).toBe(navigator.userAgent);
    expect(context.route).toBe(window.location.pathname);
  });
});

function Box({ user = ADA, url = URL_ }: { user?: FeedbackSubmitter | null; url?: string }) {
  const [attach, setAttach] = useState(true);
  return <FeedbackContextBox user={user} url={url} attachUrl={attach} onAttachUrlChange={setAttach} />;
}

describe("FeedbackContextBox", () => {
  it("names the submitter and offers the URL, ticked", () => {
    render(<Box />);
    expect(screen.getByText("User:")).toBeInTheDocument();
    expect(screen.getByText("Ada Example (ada@example.com)")).toBeInTheDocument();
    const box = screen.getByRole("checkbox", { name: "Attach current page URL" });
    expect(box).toBeChecked();
    // The URL is the box's description, so a screen reader hears what it is about.
    expect(box).toHaveAccessibleDescription(URL_);
  });

  it("strikes the URL through when unticked, and keeps it visible", () => {
    render(<Box />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Attach current page URL" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    const url = screen.getByText(URL_);
    expect(url).toHaveClass("line-through");
    expect(url).toHaveAttribute("data-withheld");
  });

  it("reports the change to its owner", () => {
    const onChange = vi.fn();
    render(<FeedbackContextBox user={ADA} url={URL_} attachUrl onAttachUrlChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("says what it knows of the submitter, or a dash", () => {
    const { unmount } = render(<Box user={{ display_name: "Ada Example" }} />);
    expect(screen.getByText("Ada Example")).toBeInTheDocument();
    unmount();
    const second = render(<Box user={{ email: "ada@example.com" }} />);
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    second.unmount();
    render(<Box user={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("reads its words from the provider's feedbackContext, and the prop wins", () => {
    const labels = { feedbackContext: { user: "Nutzer", attachUrl: "Aktuelle Seiten-URL anhängen" } } as UiKitLabelOverrides;
    const { unmount } = render(
      <UiKitProvider labels={labels}>
        <Box />
      </UiKitProvider>,
    );
    expect(screen.getByText("Nutzer:")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Aktuelle Seiten-URL anhängen" })).toBeInTheDocument();
    unmount();
    render(
      <UiKitProvider labels={labels}>
        <FeedbackContextBox url={URL_} attachUrl onAttachUrlChange={() => {}} labels={{ user: "Reporter" }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Reporter:")).toBeInTheDocument();
  });

  it("puts the language's own colon between the label and the person (common.fieldValue)", () => {
    const line = (labels: UiKitLabelOverrides) => {
      const { container, unmount } = render(
        <UiKitProvider labels={labels}>
          <Box />
        </UiKitProvider>,
      );
      const bold = container.querySelector(".font-medium")!;
      const out = { bold: bold.textContent, whole: bold.parentElement!.textContent };
      unmount();
      return out;
    };
    // French: a no-break space before the colon, as the catalogue's fieldValue writes it.
    expect(line({ common: UI_KIT_LABELS_FR.common, feedbackContext: UI_KIT_LABELS_FR.feedbackContext })).toEqual({
      bold: "Utilisateur\u00a0: ",
      whole: "Utilisateur\u00a0: Ada Example (ada@example.com)",
    });
    // Chinese: the full-width colon, and no space after it.
    expect(line({ common: UI_KIT_LABELS_ZH.common, feedbackContext: UI_KIT_LABELS_ZH.feedbackContext })).toEqual({
      bold: "用户：",
      whole: "用户：Ada Example (ada@example.com)",
    });
  });

  it("shows an app's fieldValue whole when it does not end in the value", () => {
    const { container } = render(
      <UiKitProvider labels={{ common: { fieldValue: (field, value) => `${value} — ${field}` } } as UiKitLabelOverrides}>
        <Box />
      </UiKitProvider>,
    );
    expect(container.querySelector(".font-medium")?.textContent).not.toContain("User");
    expect(screen.getByText("Ada Example (ada@example.com) — User")).toBeInTheDocument();
  });

  it("has English defaults", () => {
    expect(DEFAULT_FEEDBACK_CONTEXT_LABELS).toEqual({ user: "User", attachUrl: "Attach current page URL" });
  });
});
