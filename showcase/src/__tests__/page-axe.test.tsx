import axe from "axe-core";
import { render } from "@testing-library/react";
import { AXE_KNOWN, AXE_RULES, axeFindings, duplicateIds } from "./page-axe";

/** The axe check the page shards run on every page (page-axe.ts, refactor audit 2026-10,
 *  DOC-10): that it reports, that the known list filters, and that it cleans up. */
describe("axeFindings", () => {
  it("runs only the rules jsdom can judge", () => {
    expect(AXE_RULES).toEqual(expect.arrayContaining(["button-name", "label", "link-name", "aria-valid-attr-value"]));
    expect(AXE_RULES).not.toContain("color-contrast");
    expect(AXE_RULES).not.toContain("region");
  });

  it("reports a button with no name and an input with no label", async () => {
    const { container } = render(
      <div>
        <button type="button" />
        <input />
        <button type="button">Save</button>
      </div>,
    );
    const findings = await axeFindings(container, "any");
    expect(findings.map((f) => f.rule).sort()).toEqual(["button-name", "label"]);
  });

  it("leaves out a known finding — on its page, and only there when it names pages", async () => {
    const textarea = AXE_KNOWN.find((k) => k.html.source.startsWith("^<textarea"))!;
    const { container } = render(<textarea rows={3} />);
    expect(await axeFindings(container, textarea.pages![0])).toEqual([]);
    expect((await axeFindings(container, "another-page")).map((f) => f.rule)).toEqual(["label"]);
  });

  it("does not report what is hidden — by the attribute, an inline display or visibility", async () => {
    // The fast style answers (styleForAxe) must still say "hidden" where jsdom would.
    const { container } = render(
      <div>
        <input hidden />
        <div style={{ display: "none" }}>
          <input />
        </div>
        <div style={{ visibility: "hidden" }}>
          <button type="button" />
        </div>
      </div>,
    );
    expect(await axeFindings(container, "any")).toEqual([]);
  });

  it("leaves out what is excluded", async () => {
    const { container } = render(
      <div>
        <section data-testid="out">
          <button type="button" />
        </section>
        <button type="button">Save</button>
      </div>,
    );
    expect(await axeFindings(container, "any", container.querySelector("section")!)).toEqual([]);
  });

  it("puts getComputedStyle back after the run, even one that fails", async () => {
    const before = window.getComputedStyle;
    const { container } = render(<p>Fine</p>);
    await axeFindings(container, "any");
    expect(window.getComputedStyle).toBe(before);
    const run = vi.spyOn(axe, "run").mockRejectedValueOnce(new Error("axe broke"));
    await expect(axeFindings(container, "any")).rejects.toThrow("axe broke");
    run.mockRestore();
    expect(window.getComputedStyle).toBe(before);
  });
});

describe("duplicateIds", () => {
  it("names an id used twice once, as -aria when a reference points at it", () => {
    const { container } = render(
      <div>
        <p id="twice">a</p>
        <p id="twice">b</p>
        <span id="named">c</span>
        <span id="named">d</span>
        <input aria-describedby="named" aria-label="x" />
        <p id="once">e</p>
      </div>,
    );
    expect(duplicateIds(container)).toEqual([
      { rule: "duplicate-id", html: '<p id="twice">' },
      { rule: "duplicate-id-aria", html: '<span id="named">' },
    ]);
  });

  it("counts the whole document but reports only inside the root", () => {
    const { container } = render(
      <div>
        <p id="shared">in the frame</p>
        <main>
          <p id="shared">in the page</p>
        </main>
      </div>,
    );
    expect(duplicateIds(container.querySelector("main")!).map((f) => f.rule)).toEqual(["duplicate-id"]);
    expect(duplicateIds(container, container.querySelector("main")!)).toHaveLength(1);
  });
});
