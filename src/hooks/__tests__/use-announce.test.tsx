import { act, render, screen } from "@testing-library/react";
import { useAnnounce } from "../use-announce";

function Host({ politeness }: { politeness?: "polite" | "assertive" }) {
  const { announce, regionProps } = useAnnounce(politeness ? { politeness } : undefined);
  return (
    <>
      <button onClick={() => announce("12 of 137 rows")}>filter</button>
      <button onClick={() => announce("Page 3 of 14")}>page</button>
      <span {...regionProps} />
    </>
  );
}

describe("useAnnounce", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("renders the region empty on mount, before there is anything to say", () => {
    // A region that mounts WITH its first message is usually missed entirely: screen
    // readers subscribe when they encounter the region. It has to be there first.
    render(<Host />);
    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toBeEmptyDOMElement();
  });

  it("announces a message", async () => {
    render(<Host />);
    screen.getByRole("button", { name: "filter" }).click();
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("status")).toHaveTextContent("12 of 137 rows");
  });

  it("re-announces the SAME message by clearing first", async () => {
    // Assistive tech diffs the region's content, so setting an identical string is a
    // no-op — exactly the case that matters when a user re-applies a filter and needs
    // confirmation that anything happened.
    render(<Host />);
    const filter = screen.getByRole("button", { name: "filter" });
    filter.click();
    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("status")).toHaveTextContent("12 of 137 rows");

    filter.click();
    // Between the two, the region must actually empty — that emptying is the diff.
    await act(async () => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    await act(async () => {
      vi.advanceTimersByTime(60);
    });
    expect(screen.getByRole("status")).toHaveTextContent("12 of 137 rows");
  });

  it("is polite by default and assertive on request", () => {
    const { unmount } = render(<Host />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    unmount();
    render(<Host politeness="assertive" />);
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("reads the whole region rather than only the changed words", () => {
    // Without aria-atomic a region that changes "Page 2 of 14" to "Page 3 of 14" can
    // announce a bare "3".
    render(<Host />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("hides the region without inflating the document height", () => {
    // `sr-only` is position:absolute and would extend documentElement.scrollHeight from
    // wherever the kit dropped it — the bug that gave the showcase a phantom second
    // scrollbar. This region is rendered by the kit inside a consumer's markup, so
    // there is no wrapper we can require to be `relative`.
    render(<Host />);
    expect(screen.getByRole("status")).toHaveClass("sr-only-fixed");
  });
});
