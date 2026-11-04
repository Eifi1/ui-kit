import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { ConsentAgainNotice } from "../consent-again-notice";
import { WriteLockProvider } from "../write-lock";

/**
 * 0.55: keksdose's agree-again notice (shared/components/consent-again-notice.tsx, its price
 * pool's second consent text), lifted with its two frames. The subject's words are the
 * app's; the chrome — Agree, Not now, the disclosures, before and now — is the kit's.
 */
const COPY = {
  title: "Price sharing has changed — please agree again",
  intro: "Until you agree, nothing new is shared.",
  changes: ["The shop's own postcode", "A public page of prices"],
};

describe("ConsentAgainNotice (0.55)", () => {
  it("card: the title, the intro and the list in front, Agree, and no Not now", () => {
    const onAgree = vi.fn();
    render(<ConsentAgainNotice frame="card" {...COPY} onAgree={onAgree} />);
    expect(screen.getByRole("heading", { level: 3, name: COPY.title })).toBeInTheDocument();
    expect(screen.getByText(COPY.intro)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(COPY.changes);
    fireEvent.click(screen.getByRole("button", { name: "Agree" }));
    expect(onAgree).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Not now" })).toBeNull();
  });

  it("card: a reader who may not answer gets no Agree, and the app's note", () => {
    render(<ConsentAgainNotice frame="card" {...COPY} note="Only the owner can agree." />);
    expect(screen.queryByRole("button", { name: "Agree" })).toBeNull();
    expect(screen.getByText("Only the owner can agree.")).toBeInTheDocument();
  });

  it("card: the wording before and now behind a disclosure, struck and added, each said", () => {
    const { container } = render(
      <ConsentAgainNotice
        frame="card"
        {...COPY}
        onAgree={() => {}}
        wording={{ before: ["The chain, never the branch."], now: ["The shop and its postcode."] }}
      />,
    );
    const toggle = screen.getByRole("button", { name: "Show the full wording, before and now" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    // One level below the h3 title.
    expect(screen.getByRole("heading", { level: 4, name: "Until now" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "From now on" })).toBeInTheDocument();
    const removed = container.querySelector("del")!;
    const added = container.querySelector("ins")!;
    // A line-through is not announced: the words before each paragraph are.
    expect(removed).toHaveTextContent("Removed: The chain, never the branch.");
    expect(added).toHaveTextContent("Added: The shop and its postcode.");
    expect(within(removed).getByText("Removed:")).toHaveClass("sr-only-fixed");
  });

  it("card: headingAs moves the wording's headings with the title", () => {
    render(<ConsentAgainNotice frame="card" {...COPY} headingAs="h2" wording={{ before: ["a"], now: ["b"] }} />);
    expect(screen.getByRole("heading", { level: 2, name: COPY.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show the full wording, before and now" }));
    expect(screen.getByRole("heading", { level: 3, name: "Until now" })).toBeInTheDocument();
  });

  it("banner: Agree as the action, Not now as the ×, the list one tap away with the link", () => {
    const onAgree = vi.fn();
    const onNotNow = vi.fn();
    render(
      <ConsentAgainNotice
        frame="banner"
        {...COPY}
        onAgree={onAgree}
        onNotNow={onNotNow}
        wordingLink={<a href="/settings/data">Full wording in Settings</a>}
      />,
    );
    expect(screen.queryByRole("listitem")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See what changed" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Full wording in Settings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agree" }));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onAgree).toHaveBeenCalledOnce();
    expect(onNotNow).toHaveBeenCalledOnce();
    // The banner has no wording: two folding levels in a callout is too much.
    expect(screen.queryByRole("button", { name: /full wording/ })).toBeNull();
  });

  it("speaks the provider's language, and takes its own labels over that", () => {
    const { rerender } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ConsentAgainNotice frame="banner" {...COPY} onAgree={() => {}} onNotNow={() => {}} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Zustimmen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nicht jetzt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Änderungen ansehen" })).toBeInTheDocument();
    rerender(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ConsentAgainNotice
          frame="banner"
          {...COPY}
          onAgree={() => {}}
          onNotNow={() => {}}
          labels={{ agree: "Erneut zustimmen" }}
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Erneut zustimmen" })).toBeInTheDocument();
  });

  it("Agree is busy while pending, and commits: a write lock disables it with its reason", () => {
    const { rerender } = render(<ConsentAgainNotice frame="card" {...COPY} onAgree={() => {}} agreePending />);
    expect(screen.getByRole("button", { name: "Agree" })).toHaveAttribute("aria-busy", "true");
    rerender(
      <WriteLockProvider locked reason="Not in the demo.">
        <ConsentAgainNotice frame="card" {...COPY} onAgree={() => {}} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Agree" })).toHaveAttribute("aria-disabled", "true");
    rerender(
      <WriteLockProvider locked reason="Not in the demo.">
        <ConsentAgainNotice frame="card" {...COPY} onAgree={() => {}} commit={false} />
      </WriteLockProvider>,
    );
    expect(screen.getByRole("button", { name: "Agree" })).not.toHaveAttribute("aria-disabled", "true");
  });
});
