import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { useFeedbackSubmit, type FeedbackSubmit } from "../feedback-submit";

/**
 * MOD-1 (refactor audit 2026-10): every app mounts `useFeedbackSubmit` in its top bar,
 * and few sessions ever file a report — so the dialog (the attachment field, the modal,
 * the context box: ~11 kB gzip of each app's entry chunk) loads when it is first opened.
 *
 * The modules are recorded as they load, so this sees the split itself rather than a
 * Suspense fallback that would be there either way. In a file of its own: a module loads
 * once per test file, and another test's open would already have loaded it.
 */
const loaded = vi.hoisted(() => new Set<string>());
vi.mock("../feedback-dialog", async (importOriginal) => {
  loaded.add("feedback-dialog");
  return importOriginal();
});
vi.mock("../feedback-attachment", async (importOriginal) => {
  loaded.add("feedback-attachment");
  return importOriginal();
});
vi.mock("../feedback-context", async (importOriginal) => {
  loaded.add("feedback-context");
  return importOriginal();
});

/** The hook's latest `open`, as an app's top bar would hold it. */
const handle: { current: FeedbackSubmit | null } = { current: null };

function Host() {
  const feedback = useFeedbackSubmit({ upload: async () => "", create: async () => ({}) });
  useEffect(() => {
    handle.current = feedback;
  });
  return <>{feedback.dialog}</>;
}

describe("useFeedbackSubmit — loading", () => {
  it("loads the dialog when it is first opened, not with the hook", async () => {
    render(<Host />);
    // Let anything eager settle: a preload on mount would show up here.
    await act(async () => {});
    expect([...loaded]).toEqual([]);

    act(() => handle.current!.open("BUG"));
    // Nothing is drawn while the module is on its way (the fallback is `null`)…
    expect(screen.queryByRole("dialog")).toBeNull();
    // …and the dialog is there once it has arrived.
    expect(await screen.findByRole("dialog", undefined, { timeout: 5000 })).toBeInTheDocument();
    expect([...loaded].sort()).toEqual(["feedback-attachment", "feedback-context", "feedback-dialog"]);
  });
});
