import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "../data-table";
import { DatePicker } from "../date-picker";
import { MiniCalendar } from "../mini-calendar";
import { CalculatorButton } from "../calculator";
import { NumberPadSheet } from "../numpad-sheet";
import { FileDropzone } from "../file-dropzone";
import { formatFileSize, UiKitProvider, type UiKitLabelOverrides } from "../../i18n/kit-labels";

/**
 * `<UiKitProvider>` reaching the data-and-input half of the kit: the table, the
 * calendars, the date pickers, the calculator keypads and the file size.
 *
 * The cases that matter most are the NESTED ones. A calendar inside the data table's
 * date filter, inside a portalled popover, had no call site anyone could pass labels
 * or a locale at — it rendered "Previous month" and an `"en"` grid in every language.
 * The provider is the only route in, so that is what is asserted on.
 *
 * And every component keeps its own props on top: prop > provider > English.
 */

const DE: UiKitLabelOverrides = {
  dataTable: { table: "Buchungen", pageSize: "Zeilen pro Seite", filter: "Filtern" },
  miniCalendar: { previousMonth: "Voriger Monat", nextMonth: "Nächster Monat" },
  datePicker: { panel: "Datum wählen", today: "Heute", clear: "Leeren" },
  calculator: { open: "Rechner öffnen", panel: "Rechner", clear: "Alles löschen", plus: "Plus (de)" },
};

function withKit(children: ReactNode, locale = "de-DE", labels: UiKitLabelOverrides = DE) {
  return (
    <UiKitProvider labels={labels} locale={locale}>
      {children}
    </UiKitProvider>
  );
}

interface Row {
  id: number;
  name: string;
  date: string;
}

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `Row ${i + 1}`,
  date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
}));

const COLUMNS: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "date", header: "Date", cell: (r) => r.date, filter: { type: "date", getValue: (r) => r.date } },
];

function table(props: { labels?: { table?: string }; locale?: string } = {}) {
  return (
    <MemoryRouter>
      <DataTable rows={ROWS} columns={COLUMNS} rowKey={(r) => r.id} defaultPageSize={10} {...props} />
    </MemoryRouter>
  );
}

describe("DataTable under a provider", () => {
  it("takes its name and its pager's labels from the provider", () => {
    render(withKit(table()));
    expect(screen.getByRole("table", { name: "Buchungen" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Zeilen pro Seite" })).toBeInTheDocument();
  });

  it("numbers its pages in the provider's locale", () => {
    render(withKit(table(), "ar-EG"));
    // Three pages of ten, written in the locale's own digits.
    expect(screen.getByRole("button", { name: "٢" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
  });

  it("lets the table's own `labels` beat the provider, key by key", () => {
    render(withKit(table({ labels: { table: "Konten" } })));
    expect(screen.getByRole("table", { name: "Konten" })).toBeInTheDocument();
    // …and the keys it did not name still come from the provider.
    expect(screen.getByRole("combobox", { name: "Zeilen pro Seite" })).toBeInTheDocument();
  });

  it("names the filter popover, and reaches the calendar nested in the date filter", () => {
    render(withKit(table()));
    fireEvent.click(screen.getByRole("button", { name: "Filtern" }));
    const panel = screen.getByRole("dialog", { name: "Filtern" });
    // The calendar three components deep speaks the provider's language …
    expect(within(panel).getByRole("button", { name: "Voriger Monat" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Nächster Monat" })).toBeInTheDocument();
    // … and formats in its locale rather than the old hard-wired "en".
    const monday = within(panel).getAllByRole("columnheader")[0];
    expect(monday).toHaveAttribute("aria-label", "Montag");
  });
});

describe("MiniCalendar week start", () => {
  const noop = () => {};

  it("starts the week on the locale's first day", () => {
    render(<MiniCalendar from="2026-09-14" to="2026-09-14" mode="single" locale="en-US" onSelect={noop} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-label", "Sunday");
  });

  it("lets `weekStartsOn` override the locale", () => {
    render(
      <MiniCalendar
        from="2026-09-14"
        to="2026-09-14"
        mode="single"
        locale="en-US"
        weekStartsOn={1}
        onSelect={noop}
      />,
    );
    expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-label", "Monday");
  });

  it("walks Home/End to the ends of a Sunday-first week", () => {
    render(<MiniCalendar from="2026-09-16" to="2026-09-16" mode="single" locale="en-US" onSelect={noop} />);
    const wed = screen.getByRole("gridcell", { name: "Wednesday, September 16, 2026" });
    wed.focus();
    fireEvent.keyDown(wed, { key: "Home" });
    expect(screen.getByRole("gridcell", { name: "Sunday, September 13, 2026" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(screen.getByRole("gridcell", { name: "Saturday, September 19, 2026" })).toHaveFocus();
  });

  it("writes its day numbers in the locale's digits", () => {
    render(<MiniCalendar from="2026-09-14" to="2026-09-14" mode="single" locale="ar-EG" onSelect={noop} />);
    expect(screen.getByRole("grid").textContent).toContain("١٤");
  });
});

describe("DatePicker under a provider", () => {
  it("names its today and clear buttons, and its panel, from the provider", () => {
    render(
      withKit(<DatePicker value="2026-09-14" onChange={() => {}} today="2026-09-20" clearable />),
    );
    expect(screen.getByRole("button", { name: "Heute" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leeren" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("dialog", { name: "Datum wählen" })).toBeInTheDocument();
    // No `locale` prop anywhere: the trigger and the calendar take the provider's.
    expect(screen.getByRole("combobox")).toHaveTextContent("14.9.2026");
  });

  it("keeps its older label props on top of the provider", () => {
    render(
      withKit(
        <DatePicker
          value="2026-09-14"
          onChange={() => {}}
          today="2026-09-20"
          todayLabel="Jetzt"
          clearable
          clearLabel="Weg damit"
        />,
      ),
    );
    expect(screen.getByRole("button", { name: "Jetzt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weg damit" })).toBeInTheDocument();
  });
});

describe("the calculator keypads under a provider", () => {
  it("names the trigger, the panel, the C key and the operators", () => {
    render(withKit(<CalculatorButton value="" onChange={() => {}} />));
    fireEvent.click(screen.getByRole("button", { name: "Rechner öffnen" }));
    const panel = screen.getByRole("dialog", { name: "Rechner" });
    expect(within(panel).getByRole("button", { name: "Alles löschen" })).toHaveTextContent("C");
    expect(within(panel).getByRole("button", { name: "Plus (de)" })).toHaveTextContent("+");
  });

  it("lets `ariaLabel` beat the provider's `calculator.open`", () => {
    render(withKit(<CalculatorButton value="" onChange={() => {}} ariaLabel="Summe rechnen" />));
    expect(screen.getByRole("button", { name: "Summe rechnen" })).toBeInTheDocument();
  });

  it("gives the phone pad the same translation, with `pad` still winning", () => {
    const { unmount } = render(withKit(<NumberPadSheet value="1" onChange={() => {}} onDone={() => {}} />));
    expect(screen.getByRole("group", { name: "Rechner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus (de)" })).toBeInTheDocument();
    unmount();
    render(
      withKit(<NumberPadSheet value="1" onChange={() => {}} onDone={() => {}} labels={{ pad: "Zahlenfeld" }} />),
    );
    expect(screen.getByRole("group", { name: "Zahlenfeld" })).toBeInTheDocument();
  });
});

describe("file sizes", () => {
  const file = new File([new Uint8Array(2048)], "beleg.pdf", { type: "application/pdf" });
  const dropzone = (
    <FileDropzone
      file={file}
      onFileSelected={() => {}}
      accept=".pdf"
      isValid={() => true}
      invalidMessage="-"
      dropLabel="-"
      browseLabel="-"
      emptyLabel="-"
      hint="-"
    />
  );

  it("formats in the provider's locale", () => {
    render(withKit(dropzone));
    expect(screen.getByText(formatFileSize(2048, "de-DE"))).toBeInTheDocument();
  });

  it("takes the provider's own `file.size` when it gives one", () => {
    render(withKit(dropzone, "de-DE", { file: { size: (bytes) => `${bytes} Bytes` } }));
    expect(screen.getByText("2048 Bytes")).toBeInTheDocument();
  });
});
