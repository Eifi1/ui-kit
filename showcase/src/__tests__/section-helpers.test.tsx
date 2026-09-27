import { render } from "@testing-library/react";
import { ConstList, Example, Note, OutTable } from "../lib/section";

/**
 * The shared specimen helpers. What is pinned here is the markup the phone layout
 * depends on: where a readout cell may break, and that a backticked hint becomes code.
 * The stacking itself is a container query and is checked in a browser, not in jsdom.
 */
describe("OutTable / ConstList soft breaks", () => {
  const cellHtml = (value: string) => {
    const { container } = render(<OutTable rows={[["expr", value]]} />);
    return container.querySelectorAll("td")[1].innerHTML;
  };

  it("leaves short values and numbers whole", () => {
    expect(cellHtml("true")).toBe("true");
    expect(cellHtml("ME")).toBe("ME");
    expect(cellHtml("1,234,567.891")).toBe("1,234,567.891");
    expect(cellHtml("2027-09-30")).toBe("2027-09-30");
  });

  it("breaks a long identifier before dots and after underscores and brackets", () => {
    expect(cellHtml("DEFAULT_ACCOUNT_SETTINGS_LABELS")).toBe(
      "DEFAULT_<wbr>ACCOUNT_<wbr>SETTINGS_<wbr>LABELS",
    );
    expect(cellHtml("panel.rect.width.value")).toBe("panel<wbr>.rect<wbr>.width<wbr>.value");
    expect(cellHtml("filterHref(column)")).toBe("filterHref(<wbr>column)");
  });

  it("never breaks at a decimal point inside a long token", () => {
    expect(cellHtml('{"r":79.00000202059144}')).toBe('{<wbr>"r":<wbr>79.00000202059144}');
  });

  it("passes a node result through untouched", () => {
    const { container } = render(<OutTable rows={[["expr", <b key="b">x.y.z.a.b.c.d.e.f</b>]]} />);
    expect(container.querySelectorAll("td")[1].innerHTML).toBe("<b>x.y.z.a.b.c.d.e.f</b>");
  });

  it("gives a ConstList name the same breaks", () => {
    const { container } = render(<ConstList items={[["FIELD_LABEL_CLASS_NAME", "a b"]]} />);
    expect(container.querySelector("dt")!.innerHTML).toBe("FIELD_<wbr>LABEL_<wbr>CLASS_<wbr>NAME");
  });
});

describe("inline code in plain strings", () => {
  it("renders backticked segments of a hint as left-to-right code", () => {
    const { container } = render(
      <Example label="X" hint="`labels` partially overridden">
        <div />
      </Example>,
    );
    const code = container.querySelector("code")!;
    expect(code.textContent).toBe("labels");
    expect(code.getAttribute("dir")).toBe("ltr");
    expect(container.textContent).not.toContain("`");
  });

  it("handles strings mixed with elements in a Note, and leaves a stray backtick alone", () => {
    const { container } = render(
      <Note>
        <b>Heads up.</b> `useWizard` mirrors `?step=N`
      </Note>,
    );
    expect([...container.querySelectorAll("code")].map((c) => c.textContent)).toEqual(["useWizard", "?step=N"]);
    const { container: stray } = render(<Note>{"one ` backtick"}</Note>);
    expect(stray.textContent).toBe("one ` backtick");
  });
});
