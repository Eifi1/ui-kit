import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Breadcrumbs } from "../breadcrumbs";
import { PageHeader } from "../page-header";
import { UiKitProvider } from "../../i18n/kit-labels";
import { DEFAULT_DOCUMENT_TITLE_FORMAT, formatDocumentTitle } from "../../lib/document-title";
import { useDocumentTitle } from "../../hooks/use-document-title";

describe("formatDocumentTitle (KIT-9)", () => {
  it("writes page · section · app by default", () => {
    expect(DEFAULT_DOCUMENT_TITLE_FORMAT).toBe("{page} · {section} · {app}");
    expect(
      formatDocumentTitle(DEFAULT_DOCUMENT_TITLE_FORMAT, { page: "Invoices", section: "Finance", app: "Kastlan" }),
    ).toBe("Invoices · Finance · Kastlan");
  });

  it("drops a missing part together with its separator", () => {
    const f = DEFAULT_DOCUMENT_TITLE_FORMAT;
    expect(formatDocumentTitle(f, { page: "Invoices", app: "Kastlan" })).toBe("Invoices · Kastlan");
    expect(formatDocumentTitle(f, { page: "Invoices", section: "Finance" })).toBe("Invoices · Finance");
    expect(formatDocumentTitle(f, { section: "Finance", app: "Kastlan" })).toBe("Finance · Kastlan");
    expect(formatDocumentTitle(f, { app: "Kastlan" })).toBe("Kastlan");
    expect(formatDocumentTitle(f, { page: "  ", section: "", app: "Kastlan" })).toBe("Kastlan");
    expect(formatDocumentTitle(f, {})).toBe("");
  });

  it("keeps another order and another separator, and the text around the parts", () => {
    expect(formatDocumentTitle("{app} | {page}", { page: "Budget", app: "Keksdose" })).toBe("Keksdose | Budget");
    expect(formatDocumentTitle("{app} | {page}", { page: "Budget" })).toBe("Budget");
    expect(formatDocumentTitle("[{page} – {app}]", { app: "KS" })).toBe("[KS]");
  });
});

describe("useDocumentTitle (KIT-9)", () => {
  let before: string;
  beforeEach(() => {
    before = document.title;
    document.title = "Start";
  });
  afterEach(() => {
    document.title = before;
  });

  function Titled({ parts }: { parts: (string | undefined)[] }) {
    useDocumentTitle(parts);
    return null;
  }

  it("writes the parts in the provider's format, the provider's app last, and puts the old title back", () => {
    const { unmount } = render(
      <UiKitProvider appName="Kastlan">
        <Titled parts={["Invoices", "Finance"]} />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Invoices · Finance · Kastlan");
    unmount();
    expect(document.title).toBe("Start");
  });

  it("takes the provider's format and drops a missing section", () => {
    render(
      <UiKitProvider appName="Keksdose" documentTitleFormat="{app}: {page} / {section}">
        <Titled parts={["Budget", undefined]} />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Keksdose: Budget");
  });

  it("writes nothing for parts that are all empty", () => {
    render(
      <UiKitProvider appName="Kastlan">
        <Titled parts={[undefined, ""]} />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Start");
  });
});

describe("PageHeader documentTitle (KIT-9)", () => {
  let before: string;
  beforeEach(() => {
    before = document.title;
    document.title = "Start";
  });
  afterEach(() => {
    document.title = before;
  });

  it("titles the window with its string title by default", () => {
    render(
      <UiKitProvider appName="Kastlan">
        <PageHeader title="Units" />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Units · Kastlan");
  });

  it("takes documentTitle for a title that is not a string, parts for a section, false for none", () => {
    const { rerender } = render(
      <UiKitProvider appName="Kastlan">
        <PageHeader title={<span>Unit 4</span>} documentTitle="Unit 4" />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Unit 4 · Kastlan");
    rerender(
      <UiKitProvider appName="Kastlan">
        <PageHeader title="Invoices" documentTitle={["Invoices", "Finance"]} />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Invoices · Finance · Kastlan");
    rerender(
      <UiKitProvider appName="Kastlan">
        <PageHeader title="Invoices" documentTitle={false} />
      </UiKitProvider>,
    );
    expect(document.title).toBe("Start");
  });

  it("leaves the window alone for a header that is not the page's h1", () => {
    render(<PageHeader as="h2" title="Guided tours" />);
    expect(document.title).toBe("Start");
  });
});

const TRAIL = [
  { label: "Home", href: "/", home: true },
  { label: "Buildings", href: "/buildings" },
  { label: "Lindenstrasse 12", href: "/buildings/12" },
  { label: "Unit 4", href: "/units/4" },
];

describe("Breadcrumbs hideCurrent (KIT-9)", () => {
  it("inside a titled PageHeader hides the current entry; the one before stays a link, nothing is current", () => {
    render(
      <PageHeader title="Unit 4" documentTitle={false} breadcrumbs={<Breadcrumbs items={TRAIL} collapse={false} />} />,
    );
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).not.toHaveTextContent("Unit 4");
    expect(screen.getByRole("link", { name: "Lindenstrasse 12" })).toHaveAttribute("href", "/buildings/12");
    expect(nav.querySelector("[aria-current]")).toBeNull();
    expect(nav.querySelectorAll("li")).toHaveLength(3);
  });

  it("hideCurrent={false} keeps the current entry as aria-current=page text", () => {
    render(
      <PageHeader
        title="Unit 4"
        documentTitle={false}
        breadcrumbs={<Breadcrumbs items={TRAIL} hideCurrent={false} collapse={false} />}
      />,
    );
    const current = screen.getByText("Unit 4", { selector: "nav span" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Unit 4" })).toBeNull();
  });

  it("outside a PageHeader shows the current entry by default", () => {
    render(<Breadcrumbs items={TRAIL} collapse={false} />);
    expect(screen.getByText("Unit 4")).toHaveAttribute("aria-current", "page");
  });

  it("standalone hideCurrent hides the last entry and links the one before", () => {
    render(<Breadcrumbs items={TRAIL} hideCurrent collapse={false} />);
    expect(screen.queryByText("Unit 4")).toBeNull();
    expect(screen.getByRole("link", { name: "Lindenstrasse 12" })).toBeInTheDocument();
  });

  it("a PageHeader draws no trail when only the home entry would remain", () => {
    const home = [
      { label: "Home", href: "/", home: true },
      { label: "Units", href: "/units" },
    ];
    render(<PageHeader title="Units" documentTitle={false} breadcrumbs={<Breadcrumbs items={home} />} />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("an entry linking to / counts as home", () => {
    render(
      <PageHeader
        title="Units"
        documentTitle={false}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Start", href: "/" },
              { label: "Units", href: "/units" },
            ]}
          />
        }
      />,
    );
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("a PageHeader without a title-string still hides the current entry", () => {
    render(<PageHeader title={<span>Unit 4</span>} breadcrumbs={<Breadcrumbs items={TRAIL} collapse={false} />} />);
    expect(screen.getByRole("navigation")).not.toHaveTextContent("Unit 4");
  });
});
