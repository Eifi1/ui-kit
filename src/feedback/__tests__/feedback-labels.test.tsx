import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabelOverrides } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import {
  FEEDBACK_CATEGORY_ORDER,
  FEEDBACK_STATUS_ORDER,
  FeedbackCategoryBadge,
  FeedbackStatusBadge,
  FeedbackStatusTransitions,
  type FeedbackCategory,
  type FeedbackStatus,
} from "../feedback-inbox";
import {
  DEFAULT_FEEDBACK_CATEGORY_LABELS,
  DEFAULT_FEEDBACK_STATUS_LABELS,
  DEFAULT_FEEDBACK_TOAST_LABELS,
} from "../feedback-labels";

/**
 * 0.27.0: the status and category words are the kit's (docs/feedback-harmonization.md
 * §5) — keksdose's English as the default, the provider's catalogue over it, a caller's
 * `label` over both — so the three apps can drop their own `STATUS_LABEL` maps.
 */

// Partial provider overrides, as an app's German catalogue would hand them in. Cast
// because the namespaces are wired into UiKitLabels by the barrel round, not here.
const german = {
  feedbackStatus: { IN_EVALUATION: "Zur Prüfung", NEEDS_LIVE_TEST: "Live testen" },
  feedbackCategory: { BUG: "Fehler" },
} as unknown as UiKitLabelOverrides;

describe("the English defaults (keksdose en.json)", () => {
  it("names all nine statuses and five categories", () => {
    expect(Object.keys(DEFAULT_FEEDBACK_STATUS_LABELS)).toEqual(FEEDBACK_STATUS_ORDER);
    expect(Object.keys(DEFAULT_FEEDBACK_CATEGORY_LABELS)).toEqual(FEEDBACK_CATEGORY_ORDER);
    expect(Object.values(DEFAULT_FEEDBACK_STATUS_LABELS)).toEqual([
      "Open",
      "Ready to implement",
      "Rework requested",
      "In progress",
      "In evaluation",
      "Test when live",
      "Postponed",
      "Done",
      "Won't do",
    ]);
    expect(Object.values(DEFAULT_FEEDBACK_CATEGORY_LABELS)).toEqual(["Crash", "Bug", "Idea", "Question", "Other"]);
  });

  it("words the toasts as keksdose does", () => {
    const t = DEFAULT_FEEDBACK_TOAST_LABELS;
    expect(t.statusChanged("Done", "Chart jumps")).toBe("Set to “Done”: Chart jumps");
    expect(t.statusRestored("Open", "Chart jumps")).toBe("Back to “Open”: Chart jumps");
    expect(t.statusUndo).toBe("Undo");
    expect(t.attachmentTooMany(5)).toBe("Only 5 attachments fit — the rest were left out.");
    expect(t.attachmentTooMany(1)).toBe("Only 1 attachment fits — the rest were left out.");
    expect(t.updateFailed).toBe("Could not save that change.");
    expect(t.submitted).toBe("Thanks for the feedback!");
  });
});

describe("FeedbackStatusBadge", () => {
  it("names the status itself, from the provider when it has a word", () => {
    const { rerender } = render(<FeedbackStatusBadge status="NEEDS_LIVE_TEST" />);
    expect(screen.getByText("Test when live")).toBeTruthy();
    rerender(
      <UiKitProvider labels={german}>
        <FeedbackStatusBadge status="NEEDS_LIVE_TEST" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Live testen")).toBeTruthy();
  });

  it("lets a caller's label win", () => {
    render(
      <UiKitProvider labels={german}>
        <FeedbackStatusBadge status="IN_EVALUATION" label="Waiting on you" />
      </UiKitProvider>,
    );
    expect(screen.getByText("Waiting on you")).toBeTruthy();
    expect(screen.queryByText("Zur Prüfung")).toBeNull();
  });

  it("shows an unknown status's raw value rather than OPEN's name", () => {
    render(<FeedbackStatusBadge status={"ESCALATED" as unknown as FeedbackStatus} />);
    expect(screen.getByText("ESCALATED")).toBeTruthy();
  });
});

describe("FeedbackCategoryBadge", () => {
  it("names the category itself, and the provider's word over English", () => {
    const { rerender } = render(<FeedbackCategoryBadge category="CRASH" />);
    expect(screen.getByText("Crash")).toBeTruthy();
    rerender(
      <UiKitProvider labels={german}>
        <FeedbackCategoryBadge category="BUG" compact />
      </UiKitProvider>,
    );
    expect(screen.getByText("Fehler")).toBeTruthy();
  });

  it("calls an unknown category what OTHER is called, and a caller's label still wins", () => {
    const { rerender } = render(<FeedbackCategoryBadge category={"ESCALATION" as unknown as FeedbackCategory} />);
    expect(screen.getByText("Other")).toBeTruthy();
    rerender(<FeedbackCategoryBadge category="IDEA" label="Wish" />);
    expect(screen.getByText("Wish")).toBeTruthy();
  });
});

describe("FeedbackStatusTransitions", () => {
  it("labels every button from the namespace when no label is passed", () => {
    render(
      <UiKitProvider labels={german}>
        <FeedbackStatusTransitions
          status="IN_PROGRESS"
          statuses={[...FEEDBACK_STATUS_ORDER]}
          canEdit
          onPick={vi.fn()}
          variant="pill"
        />
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Zur Prüfung" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Won't do" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "In progress" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("still takes the app's naming function over it", () => {
    render(
      <FeedbackStatusTransitions
        status="OPEN"
        statuses={["OPEN", "DONE"]}
        canEdit
        onPick={vi.fn()}
        variant="pill"
        label={(s) => `app:${s}`}
      />,
    );
    expect(screen.getByRole("button", { name: "app:DONE" })).toBeTruthy();
  });
});

describe("feedbackToast: the public pages' failures (0.38.1, Kurvenschmiede)", () => {
  const catalogues = {
    en: uiKitLabelsEn(),
    "de-CH": UI_KIT_LABELS_DE_CH,
    es: UI_KIT_LABELS_ES,
    fr: UI_KIT_LABELS_FR,
    it: UI_KIT_LABELS_IT,
    hu: UI_KIT_LABELS_HU,
    zh: UI_KIT_LABELS_ZH,
  };
  const keys = ["commentFailed", "voteFailed", "replyFailed"] as const;

  it("has a failed comment, vote and reply in English", () => {
    expect(DEFAULT_FEEDBACK_TOAST_LABELS.commentFailed).toBe("Could not post the comment.");
    expect(DEFAULT_FEEDBACK_TOAST_LABELS.voteFailed).toBe("Could not save your vote.");
    expect(DEFAULT_FEEDBACK_TOAST_LABELS.replyFailed).toBe("Could not send the reply.");
  });

  it.each(Object.entries(catalogues))("%s says each in its own words", (locale, labels) => {
    for (const key of keys) {
      const text = labels.feedbackToast[key];
      expect(text.trim()).not.toBe("");
      if (locale !== "en") expect(text).not.toBe(DEFAULT_FEEDBACK_TOAST_LABELS[key]);
    }
    // The three are three different sentences.
    expect(new Set(keys.map((key) => labels.feedbackToast[key])).size).toBe(3);
  });

  it("is Swiss in de-CH", () => {
    expect(UI_KIT_LABELS_DE_CH.feedbackToast.commentFailed).toBe("Kommentar konnte nicht gesendet werden.");
  });
});

/** 0.40 (docs/feedback-harmonization.md §10.6): the five keys in seven languages. */
describe("the 0.40 words in every catalogue", () => {
  const WORDS: Array<
    [string, { feedbackMenu: object; feedbackPublic: object; feedbackPage: object; feedbackStatus: object }, string[]]
  > = [
    ["en", uiKitLabelsEn(), ["Feedback discussion", "Feedback inbox", "Rework requested"]],
    ["de-CH", UI_KIT_LABELS_DE_CH, ["Feedback-Diskussion", "Feedback-Eingang", "Nacharbeit angefordert"]],
    ["fr", UI_KIT_LABELS_FR, ["Discussion des retours", "Retours reçus", "Reprise demandée"]],
    ["it", UI_KIT_LABELS_IT, ["Discussione sui feedback", "Feedback ricevuti", "Rielaborazione richiesta"]],
    ["es", UI_KIT_LABELS_ES, ["Debate de comentarios", "Comentarios recibidos", "Corrección solicitada"]],
    ["hu", UI_KIT_LABELS_HU, ["Visszajelzések megvitatása", "Beérkezett visszajelzések", "Átdolgozás kérve"]],
    ["zh", UI_KIT_LABELS_ZH, ["反馈讨论", "反馈收件箱", "已要求返工"]],
  ];

  it.each(WORDS)("%s", (_locale, labels, [discussion, inbox, rework]) => {
    expect(labels.feedbackMenu).toMatchObject({ discussion, inbox });
    expect(labels.feedbackPublic).toMatchObject({ title: discussion });
    expect(labels.feedbackPage).toMatchObject({ title: inbox });
    expect(labels.feedbackStatus).toMatchObject({ REWORK: rework });
  });
});
