import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { drainTasks } from "../../test/tasks";
import { useFeedbackSubmit, type FeedbackSubmit } from "../feedback-submit";

/**
 * 0.52 code review, tour.tsx (its root-cause note): the feedback dialog loads when it is
 * first opened (0.34, MOD-1), from the hook every app mounts in its top bar. A fetch that
 * failed — a tab left open across a deploy, offline — threw out of `React.lazy` to
 * whatever boundary was above the top bar: the whole shell. Now the dialog closes, the
 * page stays, and the next open fetches again.
 *
 * In a file of its own: a module loads once per test file.
 */
const dialog = vi.hoisted(() => ({ fail: true }));
vi.mock("../feedback-submit-dialog", async (importOriginal) => {
  if (dialog.fail)
    throw new TypeError("Failed to fetch dynamically imported module: /assets/feedback-submit-dialog-77aa.js");
  return importOriginal();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const handle: { current: FeedbackSubmit | null } = { current: null };

function TopBar() {
  const feedback = useFeedbackSubmit({ upload: async () => "", create: async () => ({}) });
  useEffect(() => {
    handle.current = feedback;
  });
  return (
    <>
      <p>The page</p>
      {feedback.dialog}
    </>
  );
}

describe("useFeedbackSubmit — the dialog's chunk fails to load", () => {
  it("closes the dialog and keeps the page; the next open fetches again", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TopBar />);

    act(() => handle.current!.open("BUG"));
    await drainTasks();
    expect(screen.getByText("The page")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(logged).toHaveBeenCalled();

    dialog.fail = false;
    act(() => handle.current!.open("BUG"));
    expect(await screen.findByRole("dialog", undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("The page")).toBeInTheDocument();
  });
});
