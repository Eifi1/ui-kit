import { createElement, type ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import {
  DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS,
  useFeedbackNotificationTypes,
} from "../feedback-notification-types";

/**
 * docs/feedback-harmonization.md §9.11: the two feedback types' setting words, in the kit
 * because two apps declare them; the card draws a type only when the server answered it.
 */
describe("useFeedbackNotificationTypes", () => {
  it("returns feedback_answered, feedback_comment and feedback_received with their words and a line each", () => {
    const { result } = renderHook(() => useFeedbackNotificationTypes());
    expect(result.current).toEqual([
      {
        id: "feedback_answered",
        label: "Answers to your reports",
        description: "When a report you wrote or commented on gets an answer.",
      },
      {
        id: "feedback_comment",
        label: "Comments on reports you follow",
        description: "When someone comments on a report you wrote or commented on.",
      },
      {
        id: "feedback_received",
        label: "New feedback and reworks",
        description: "When someone files a report or sends one back.",
      },
    ]);
  });

  it("is stable across renders", () => {
    const { result, rerender } = renderHook(() => useFeedbackNotificationTypes());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("reads the provider's words; the argument wins", () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(UiKitProvider, { labels: UI_KIT_LABELS_DE_CH, children });
    const { result } = renderHook(() => useFeedbackNotificationTypes({ comment: "Kommentare" }), { wrapper });
    expect(result.current.map((entry) => entry.label)).toEqual([
      "Antworten auf Ihre Meldungen",
      "Kommentare",
      "Neue Rückmeldungen und Überarbeitungen",
    ]);
  });

  it("has English defaults", () => {
    expect(Object.keys(DEFAULT_FEEDBACK_NOTIFICATION_TYPES_LABELS)).toEqual([
      "answered",
      "answeredDescription",
      "comment",
      "commentDescription",
      "received",
      "receivedDescription",
      "adminGroup",
    ]);
  });
});
