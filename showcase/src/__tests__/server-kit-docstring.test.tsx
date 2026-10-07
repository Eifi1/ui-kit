import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Docstring, cleandoc, parseDocstring, parseInline } from "../server-kit/docstring";

/**
 * The docstring renderer: the reStructuredText server-kit's docstrings use — paragraphs,
 * lists, `::` and doctest blocks, literals, emphasis and Sphinx roles — and the rule that
 * a role becomes a link only when the caller resolves it.
 */

describe("blocks", () => {
  it("dedents like inspect.cleandoc and joins a paragraph's lines", () => {
    expect(cleandoc("First line.\n\n    Second\n      indented\n")).toEqual(["First line.", "", "Second", "  indented"]);
    expect(parseDocstring("One sentence\nover two lines.\n\nAnother.")).toEqual([
      { kind: "paragraph", text: "One sentence over two lines." },
      { kind: "paragraph", text: "Another." },
    ]);
  });

  it("reads a bullet list whose items continue on indented lines", () => {
    const blocks = parseDocstring("Rules:\n\n* **One** clears\n  a field;\n* two keeps it.\n\nAfter.");
    expect(blocks).toEqual([
      { kind: "paragraph", text: "Rules:" },
      {
        kind: "list",
        ordered: false,
        start: 1,
        items: [[{ kind: "paragraph", text: "**One** clears a field;" }], [{ kind: "paragraph", text: "two keeps it." }]],
      },
      { kind: "paragraph", text: "After." },
    ]);
  });

  it("reads a numbered list, keeping where it starts", () => {
    const [list] = parseDocstring("3. third\n   rule;\n4. fourth.");
    expect(list).toEqual({
      kind: "list",
      ordered: true,
      start: 3,
      items: [[{ kind: "paragraph", text: "third rule;" }], [{ kind: "paragraph", text: "fourth." }]],
    });
  });

  it("holds a nested list and a second paragraph inside one item", () => {
    const [list] = parseDocstring("* outer\n\n  more of it\n\n  - inner\n* next");
    expect(list).toMatchObject({
      kind: "list",
      items: [
        [
          { kind: "paragraph", text: "outer" },
          { kind: "paragraph", text: "more of it" },
          { kind: "list", ordered: false, items: [[{ kind: "paragraph", text: "inner" }]] },
        ],
        [{ kind: "paragraph", text: "next" }],
      ],
    });
  });

  it("turns the block after `::` into code, with RST's three spellings of the colon", () => {
    expect(parseDocstring("Like this::\n\n    a = 1\n      b = 2\n\nAfter.")).toEqual([
      { kind: "paragraph", text: "Like this:" },
      { kind: "code", text: "a = 1\n  b = 2", doctest: false },
      { kind: "paragraph", text: "After." },
    ]);
    expect(parseDocstring("Like this ::\n\n    x")[0]).toEqual({ kind: "paragraph", text: "Like this" });
    expect(parseDocstring("Intro.\n\n::\n\n    x")).toEqual([
      { kind: "paragraph", text: "Intro." },
      { kind: "code", text: "x", doctest: false },
    ]);
  });

  it("keeps blank lines inside a code block, and ends it at the dedent", () => {
    const blocks = parseDocstring("Code::\n\n    one\n\n    two\nback to text.");
    expect(blocks[1]).toEqual({ kind: "code", text: "one\n\ntwo", doctest: false });
    expect(blocks[2]).toEqual({ kind: "paragraph", text: "back to text." });
  });

  it("reads a code block inside a list item", () => {
    const [list] = parseDocstring("* call it::\n\n      f(x)\n\n* done");
    expect(list).toMatchObject({
      items: [
        [
          { kind: "paragraph", text: "call it:" },
          { kind: "code", text: "f(x)" },
        ],
        [{ kind: "paragraph", text: "done" }],
      ],
    });
  });

  it("shows a doctest as code, prompt and output together", () => {
    expect(parseDocstring("Example:\n\n>>> canonical_locale('de_ch', ['de-CH'])\n'de-CH'\n\nAfter.")).toEqual([
      { kind: "paragraph", text: "Example:" },
      { kind: "code", text: ">>> canonical_locale('de_ch', ['de-CH'])\n'de-CH'", doctest: true },
      { kind: "paragraph", text: "After." },
    ]);
  });
});

describe("inline", () => {
  it("reads literals, emphasis and strong — strong around a literal too", () => {
    expect(parseInline("a ``null`` *is* **not ``None``**")).toEqual([
      { kind: "text", text: "a " },
      { kind: "code", text: "null" },
      { kind: "text", text: " " },
      { kind: "em", children: [{ kind: "text", text: "is" }] },
      { kind: "text", text: " " },
      { kind: "strong", children: [{ kind: "text", text: "not " }, { kind: "code", text: "None" }] },
    ]);
  });

  it("leaves arithmetic and stars inside a literal alone", () => {
    expect(parseInline("2 * 3 and a*b*c")).toEqual([{ kind: "text", text: "2 * 3 and a*b*c" }]);
    expect(parseInline("``*args``")).toEqual([{ kind: "code", text: "*args" }]);
  });

  it("reads a default-role `name` as code", () => {
    expect(parseInline("see `x`.")).toEqual([
      { kind: "text", text: "see " },
      { kind: "code", text: "x" },
      { kind: "text", text: "." },
    ]);
  });

  it("reads Sphinx roles: ~ shows the last segment, functions get (), a title wins, ! never links", () => {
    expect(parseInline(":func:`~eifi1_server_kit.errors.install_contract_error_handlers`")).toEqual([
      {
        kind: "ref",
        role: "func",
        target: "~eifi1_server_kit.errors.install_contract_error_handlers",
        display: "install_contract_error_handlers()",
        link: true,
      },
    ]);
    expect(parseInline(":class:`eifi1_server_kit.auth.AuthError`")[0]).toMatchObject({
      display: "eifi1_server_kit.auth.AuthError",
    });
    expect(parseInline(":data:`the limits <LIMITS>`")[0]).toMatchObject({ target: "LIMITS", display: "the limits" });
    expect(parseInline(":py:meth:`!Mailer.send`")[0]).toMatchObject({ role: "meth", link: false, display: "Mailer.send()" });
  });
});

describe("<Docstring>", () => {
  it("links a role the caller resolves, and shows any other as code", () => {
    const resolve = (target: string) => (target === "apply_patch" ? "/server-settings#settings.apply_patch" : undefined);
    render(
      <MemoryRouter>
        <Docstring
          text={"Calls :func:`apply_patch`, raises :class:`ValueError`.\n\n* **Bold** item\n\nCode::\n\n    x = 1"}
          resolve={resolve}
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "apply_patch()" });
    expect(link).toHaveAttribute("href", "/server-settings#settings.apply_patch");
    expect(screen.getByText("ValueError").tagName).toBe("CODE");
    expect(screen.queryByRole("link", { name: "ValueError" })).toBeNull();
    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(screen.getByText("x = 1").closest("pre")).not.toBeNull();
  });

  it("renders nothing for an empty docstring", () => {
    const { container } = render(<Docstring text="  " />);
    expect(container).toBeEmptyDOMElement();
  });
});
