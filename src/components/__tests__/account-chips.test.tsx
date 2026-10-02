import { render, screen, within } from "@testing-library/react";
import { ShieldCheck } from "lucide-react";
import { AccountStateChip, DateMark, RoleChip, dateColumn } from "../account-chips";
import type { RoleVocabulary } from "../account-chips";
import { MemoryRouter } from "react-router";
import { DataTable } from "../data-table";

type Role = "ADMIN" | "MEMBER" | "CUSTOMER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck },
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer", tone: "warning" },
};

describe("RoleChip", () => {
  it("looks the key up in the app's vocabulary", () => {
    render(<RoleChip value="ADMIN" roles={ROLES} data-testid="chip" />);
    const chip = screen.getByTestId("chip");
    expect(chip).toHaveTextContent("Admin");
    expect(chip).toHaveAttribute("data-role", "ADMIN");
    expect(chip.querySelector("svg")).not.toBeNull();
  });

  it("shows an unknown key as itself and renders nothing for no role", () => {
    const { container, rerender } = render(<RoleChip<string> value="AUDITOR" roles={ROLES} />);
    expect(screen.getByText("AUDITOR")).toBeInTheDocument();
    rerender(<RoleChip value={null} roles={ROLES} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("AccountStateChip", () => {
  it("speaks English by default, the app's words over it, and children over both", () => {
    render(
      <>
        <AccountStateChip state="inactive" data-testid="a" />
        <AccountStateChip state="inactive" labels={{ inactive: "Deactivated", active: undefined }} data-testid="b" />
        <AccountStateChip state="passwordChange" data-testid="c">
          Reset pending
        </AccountStateChip>
      </>,
    );
    expect(screen.getByTestId("a")).toHaveTextContent("Inactive");
    expect(screen.getByTestId("a")).toHaveAttribute("data-state", "inactive");
    expect(screen.getByTestId("b")).toHaveTextContent("Deactivated");
    expect(screen.getByTestId("c")).toHaveTextContent("Reset pending");
  });
});

describe("DateMark / dateColumn", () => {
  const NOW = new Date("2026-10-02T12:00:00Z");

  it("prints a date, a relative time with the date in a tooltip, or the empty word", () => {
    render(
      <>
        <DateMark value="2026-07-08" locale="en-US" />
        <DateMark
          value="2026-09-29T12:00:00Z"
          display="relative"
          relative={{ now: NOW, numeric: "always" }}
          locale="en-US"
        />
        <DateMark value={null} empty="Never" />
      </>,
    );
    expect(screen.getByText("Jul 8, 2026").tagName).toBe("TIME");
    expect(screen.getByText("3 days ago")).toHaveAttribute("dateTime", "2026-09-29T12:00:00.000Z");
    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("sorts by the instant, newest first, with no date last; filters on the ISO day", () => {
    interface Row {
      id: number;
      name: string;
      last: string | null;
    }
    const rows: Row[] = [
      { id: 1, name: "Ann", last: "2026-09-01T08:00:00Z" },
      { id: 2, name: "Bob", last: null },
      { id: 3, name: "Cy", last: "2026-09-30T08:00:00Z" },
    ];
    const col = dateColumn<Row>({
      key: "last",
      header: "Last login",
      value: (r) => r.last,
      filter: true,
    });
    expect(col.firstSort).toBe("desc");
    expect(col.sortBy!(rows[0])).toBe(Date.parse("2026-09-01T08:00:00Z"));
    expect(col.sortBy!(rows[1])).toBeNull();
    expect(col.filter).toEqual({
      type: "date",
      getValue: expect.any(Function),
    });
    if (col.filter?.type === "date") expect(col.filter.getValue(rows[2])).toBe("2026-09-30T08:00:00Z");

    render(
      <MemoryRouter>
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "name", header: "Name", cell: (r) => r.name },
            dateColumn<Row>({
              key: "last",
              header: "Last login",
              value: (r) => r.last,
              empty: "Never",
              locale: "en-US",
            }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(within(screen.getAllByRole("table")[0]).getByText("Never")).toBeInTheDocument();
  });
});
