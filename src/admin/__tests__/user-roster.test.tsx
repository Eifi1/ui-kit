import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ShieldCheck } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../../components/data-table";
import type { DataTableColumn } from "../../components/data-table";
import { GROW_PEER_CELL_CLASS, fitHideOrder } from "../../components/data-table-fit";
import { mobileCardColumns } from "../../components/data-table-mobile";
import type { RoleVocabulary } from "../../components/account-chips";
import { UiKitProvider } from "../../i18n/kit-labels";
import {
  UserIdentityCell,
  adminUserStates,
  userRosterColumns,
  userRosterSort,
  useUserRosterColumns,
} from "../user-roster";
import type { UserRosterColumnsOptions, UserRosterRow } from "../user-roster";

/**
 * docs/user-admin-harmonization.md §3: the roster is the app's DataTable with the kit's
 * column preset — identity, role, states, the two dates, the app's columns and a menu.
 */

type Role = "ADMIN" | "MEMBER" | "CUSTOMER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin", tone: "brand", icon: ShieldCheck },
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer", tone: "warning" },
};

interface Row extends UserRosterRow {
  role: Role;
  owned: number;
}

const ADA: Row = {
  id: 1,
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Example",
  role: "ADMIN",
  is_active: true,
  email_verified: true,
  created_at: "2026-01-05T10:00:00Z",
  last_login_at: null,
  owned: 3,
};
const BEN: Row = {
  id: 2,
  email: "ben@example.com",
  first_name: "Ben",
  last_name: "Sample",
  role: "MEMBER",
  is_active: false,
  email_verified: false,
  password_change_required_at: "2026-10-01T00:00:00Z",
  created_at: "2026-02-01T10:00:00Z",
  last_login_at: "2026-10-06T10:00:00Z",
  owned: 0,
};
const CY: Row = {
  id: 3,
  email: "cy@example.com",
  first_name: "",
  last_name: "",
  role: "CUSTOMER",
  is_active: false,
  deletion_requested_at: "2026-10-01T00:00:00Z",
  deletion_scheduled_at: "2026-10-31T00:00:00Z",
  created_at: "2026-03-01T10:00:00Z",
  owned: 0,
};

/** A viewport the test decides: wide = the table, narrow = the phone cards. */
/** A wide or a narrow screen: a `max-*` query (`(width < …)` since 0.32.1) is the exact
 *  complement of its `min-*` one, so "every query true" no longer means "wide". */
function stubViewport(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: wide !== query.includes("width <"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const OWNED: DataTableColumn<Row> = { key: "owned", header: "Owned", cell: (r) => String(r.owned) };

function Roster(
  props: Partial<UserRosterColumnsOptions<Row, Role>> & { rows?: Row[]; locale?: string; grow?: string },
) {
  const { rows = [ADA, BEN, CY], locale, grow, ...options } = props;
  const columns = userRosterColumns<Row, Role>({ roles: ROLES, extra: [OWNED], ...options }).map((c) =>
    c.key === grow ? { ...c, grow: true } : c,
  );
  return (
    <UiKitProvider locale={locale}>
      <MemoryRouter>
        <DataTable rows={rows} columns={columns} rowKey={(r) => r.id} paginated={false} />
      </MemoryRouter>
    </UiKitProvider>
  );
}

describe("userRosterColumns", () => {
  it("keys its columns by the server's sort keys, the app's columns before the menu", () => {
    const keys = userRosterColumns<Row, Role>({ roles: ROLES, extra: [OWNED], actions: () => [] }).map((c) => c.key);
    expect(keys).toEqual(["name", "role", "state", "created", "last_login", "owned", "actions"]);
    expect(userRosterColumns<Row, Role>({ roles: ROLES, emailColumn: true }).map((c) => c.key)).toContain("email");
  });

  it("draws its actions in the phone card's actions row, never one of the three fields (0.49)", () => {
    const columns = userRosterColumns<Row, Role>({
      roles: ROLES,
      extra: [{ ...OWNED, mobile: "secondary" }],
      actions: () => [],
    });
    const { fields, actions } = mobileCardColumns(columns.filter((c) => !c.mobileHidden && c.mobile !== "hidden"));
    expect(actions.map((c) => c.key)).toEqual(["actions"]);
    expect(fields.map((c) => c.key)).toEqual(["role", "last_login", "owned"]);
  });

  it("renders identity, role, states, dates and the app's column", () => {
    stubViewport(true);
    render(<Roster locale="en-GB" />);
    const ada = screen.getByRole("row", { name: /Ada Example/ });
    expect(within(ada).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(ada).getByText("Admin").closest("[data-role]")).toHaveAttribute("data-role", "ADMIN");
    expect(within(ada).getByText("Active").closest("[data-state]")).toHaveAttribute("data-state", "active");
    expect(within(ada).getByText("Never")).toBeInTheDocument();
    expect(within(ada).getByText("5 Jan 2026").tagName).toBe("TIME");
    expect(within(ada).getByText("3")).toBeInTheDocument();

    const ben = screen.getByRole("row", { name: /Ben Sample/ });
    expect(within(ben).getByText("Inactive")).toBeInTheDocument();
    expect(within(ben).getByText("Unverified")).toBeInTheDocument();
    expect(within(ben).getByText("Must change password")).toBeInTheDocument();

    // No name yet: the address once, as the name; deletion in place of "inactive".
    const cy = screen.getByRole("row", { name: /cy@example\.com/ });
    expect(within(cy).getAllByText("cy@example.com")).toHaveLength(1);
    expect(within(cy).getByText("Deletion on 31 Oct 2026").closest("[data-state]")).toHaveAttribute(
      "data-state",
      "deletion",
    );
    expect(within(cy).queryByText("Inactive")).not.toBeInTheDocument();
  });

  it("lets a row's chips stack beside a `grow` column; its text cells keep one line (kastlan S1, 0.48 review 2)", () => {
    // 0.48's first fix held the chip rows to one line too: "Active" and "Not verified"
    // side by side widened Status, and kastlan's roster (583px admin pane, both
    // `fitPriority` columns out, Name at its 10rem floor) scrolled 21px at 1280px. A row
    // of badges reads as well stacked, so it wraps again.
    stubViewport(true);
    render(<Roster grow="name" />);
    const ben = screen.getByRole("row", { name: /Ben Sample/ });
    const states = within(ben).getByText("Unverified").closest("[data-state]")!.parentElement!;
    expect(states).toHaveClass("flex-wrap");
    expect(states.className).not.toMatch(/flex-nowrap/);
    const role = within(ben).getByText("Member").closest("[data-role]")!.parentElement!;
    expect(role).toHaveClass("flex-wrap");
    expect(role.className).not.toMatch(/flex-nowrap/);
    expect(screen.getByRole("table")).toHaveAttribute("data-fit-grow");
    // last_login / created: one line from the cell's own nowrap.
    expect(
      within(ben)
        .getAllByRole("cell")
        .find((c) => c.dataset.col === "last_login"),
    ).toHaveClass(GROW_PEER_CELL_CLASS);
  });

  it("fits by default: Name grows, Created then Last login leave a narrow table (0.50, kastlan K2)", () => {
    const columns = userRosterColumns<Row, Role>({
      roles: ROLES,
      extra: [OWNED],
      actions: () => [],
      emailColumn: true,
    });
    const fit = Object.fromEntries(columns.map((c) => [c.key, [c.grow ?? null, c.fitPriority ?? null]]));
    expect(fit).toEqual({
      name: [true, null],
      email: [null, null],
      role: [null, null],
      state: [null, null],
      created: [null, 1],
      last_login: [null, 2],
      owned: [null, null],
      actions: [null, null],
    });
    // The one grow column, and the order the table leaves columns out in.
    expect(columns.filter((c) => c.grow)).toHaveLength(1);
    expect(fitHideOrder(columns).map((c) => c.key)).toEqual(["created", "last_login"]);
    // The phone card is unchanged by it: created stays off, last login stays a field.
    const { fields } = mobileCardColumns(columns.filter((c) => !c.mobileHidden && c.mobile !== "hidden"));
    expect(fields.map((c) => c.key)).toEqual(["role", "last_login"]);
  });

  it("with the default fit, the chips still stack and the text cells keep one line (0.48 rules hold)", () => {
    stubViewport(true);
    render(<Roster />);
    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("data-fit-grow");
    const ben = screen.getByRole("row", { name: /Ben Sample/ });
    const cells = within(ben).getAllByRole("cell");
    const cell = (key: string) => cells.find((c) => c.dataset.col === key)!;
    expect(cell("name")).toHaveClass("w-full", "max-w-0", "truncate-until-large");
    for (const key of ["role", "state", "created", "last_login", "owned"]) {
      expect(cell(key)).toHaveClass(GROW_PEER_CELL_CLASS);
    }
    for (const chip of [within(ben).getByText("Unverified"), within(ben).getByText("Member")]) {
      const row = chip.closest("[data-state], [data-role]")!.parentElement!;
      expect(row).toHaveClass("flex-wrap");
      expect(row.className).not.toMatch(/flex-nowrap/);
    }
    // The 0.49 layout, for an app that wants it back: no grow, nothing classed.
    const plain = userRosterColumns<Row, Role>({ roles: ROLES }).map((c) => ({
      ...c,
      grow: undefined,
      fitPriority: undefined,
    }));
    expect(plain.some((c) => c.grow || c.fitPriority != null)).toBe(false);
  });

  it("writes the name in the reader's order", () => {
    stubViewport(true);
    render(<Roster locale="hu" rows={[ADA]} />);
    expect(screen.getByText("Example Ada")).toBeInTheDocument();
  });

  it("is a RoleSelect where the row is editable, with the reasons, and a chip elsewhere", async () => {
    stubViewport(true);
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    render(
      <Roster
        onRoleChange={onRoleChange}
        editableRole={(row) =>
          row.id === 1
            ? { disabledReason: "self" }
            : row.id === 2
              ? { optionDisabledReason: (role) => (role === "CUSTOMER" ? "owns work" : undefined) }
              : false
        }
      />,
    );
    const own = screen.getByRole("combobox", { name: "Role of Ada Example" });
    expect(own).toHaveAttribute("aria-disabled", "true");
    expect(own).toHaveAccessibleDescription("You can’t change your own role.");

    const ben = screen.getByRole("combobox", { name: "Role of Ben Sample" }) as HTMLSelectElement;
    const customer = within(ben).getByRole("option", { name: "Customer (owns work)" }) as HTMLOptionElement;
    expect(customer.disabled).toBe(true);
    await user.selectOptions(ben, "ADMIN");
    expect(onRoleChange).toHaveBeenCalledWith(BEN, "ADMIN");
    // Controlled: the select stays on the server's role until the row comes back.
    expect(ben.value).toBe("MEMBER");

    const cy = screen.getByRole("row", { name: /cy@example\.com/ });
    expect(within(cy).queryByRole("combobox")).not.toBeInTheDocument();
    expect(within(cy).getByText("Customer").closest("[data-role]")).toHaveAttribute("data-role", "CUSTOMER");
  });

  // Kurvenschmiede N5 (KS review, 0.49 and 0.50): beside the `grow` Name every column is
  // squeezed to its min-content, and a `w-full` select has none, so the role column was its
  // header's 92px and the select read "Meml…", "Admi…" (Chromium: a 68px select, 30px for
  // the value). The cell now holds an invisible floor of the role words in the select's own
  // box: 109–150px across en/de-CH/es/hu, every value whole (docs/adopt-0.51.md).
  it("keeps room in the role column for the longest role word, in the app's words (Kurvenschmiede N5)", () => {
    stubViewport(true);
    const AUDITOR = { ...CY, id: 4, email: "dee@example.com", role: "AUDITOR" as Role };
    render(
      <Roster
        rows={[ADA, BEN, CY, AUDITOR]}
        onRoleChange={() => {}}
        editableRole={(row) =>
          row.id === 2
            ? {
                offered: ["ADMIN", "MEMBER"],
                optionDisabledReason: (role) => (role === "ADMIN" ? "owns work" : undefined),
              }
            : row.id !== 3
        }
      />,
    );
    const floorOf = (name: string) =>
      screen
        .getByRole("combobox", { name: `Role of ${name}` })
        .closest("td")!
        .querySelector("[data-select-floor]");
    const words = (floor: Element | null) => [...(floor?.children ?? [])].map((c) => c.getAttribute("data-value"));

    // Every word of the vocabulary, whatever the row offers, and never an option's reason.
    const ben = floorOf("Ben Sample");
    expect(words(ben)).toEqual(["Admin", "Member", "Customer"]);
    // A held key the vocabulary does not know is a value the select shows, so it counts.
    expect(words(floorOf("dee@example.com"))).toEqual(["Admin", "Member", "Customer", "AUDITOR"]);
    // A chip row has no select and no floor.
    const cy = screen.getByRole("row", { name: /cy@example\.com/ });
    expect(cy.querySelector("[data-select-floor]")).toBeNull();

    // The select's own horizontal box (padding, chevron room, type, border), with no height,
    // not painted and hidden from a screen reader.
    const select = screen.getByRole("combobox", { name: "Role of Ben Sample" });
    for (const cls of ["ps-2", "pe-7", "text-xs", "border"]) {
      expect(select).toHaveClass(cls);
      expect(ben).toHaveClass(cls);
    }
    expect(ben).toHaveClass("invisible", "h-0", "py-0", "border-y-0", "whitespace-nowrap");
    expect(ben).toHaveAttribute("aria-hidden", "true");
    // Generated content, not text: Ben's row shows no "Customer" (not offered, not held).
    expect(within(screen.getByRole("row", { name: /ben@example\.com/ })).queryByText("Customer")).toBeNull();
  });

  it("opens the row's action menu; an entry runs, a locked one says why", async () => {
    stubViewport(true);
    const user = userEvent.setup();
    const deactivate = vi.fn();
    const resend = vi.fn();
    render(
      <Roster
        rows={[ADA, BEN]}
        actions={(row) => [
          { label: "Resend verification", onSelect: () => resend(row.id) },
          row.is_active && {
            label: "Deactivate",
            tone: "danger",
            onSelect: () => deactivate(row.id),
            disabledReason: row.id === 1 ? "You can’t deactivate yourself." : undefined,
          },
          { label: "Hidden", onSelect: () => undefined, hidden: true },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Ada Example" }));
    const menu = await screen.findByRole("dialog", { name: "Actions for Ada Example" });
    expect(within(menu).queryByText("Hidden")).not.toBeInTheDocument();
    const locked = within(menu).getByRole("button", { name: "Deactivate" });
    expect(locked).toHaveAttribute("aria-disabled", "true");
    await user.click(locked);
    expect(deactivate).not.toHaveBeenCalled();
    await user.click(within(menu).getByRole("button", { name: "Resend verification" }));
    expect(resend).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Ben is inactive: no deactivate entry at all.
    await user.click(screen.getByRole("button", { name: "Actions for Ben Sample" }));
    const other = await screen.findByRole("dialog", { name: "Actions for Ben Sample" });
    expect(
      within(other)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Resend verification"]);
  });

  it("makes phone cards from the same columns: the identity heads the card, the actions stay on it, created is left off", () => {
    stubViewport(false);
    render(<Roster rows={[BEN]} locale="en-GB" actions={() => [{ label: "Resend", onSelect: () => undefined }]} />);
    const card = screen.getByRole("listitem");
    expect(within(card).getByText("Ben Sample")).toBeInTheDocument();
    expect(within(card).getByText("Role")).toBeInTheDocument();
    expect(within(card).getByText("Last login")).toBeInTheDocument();
    // The states are chips beside the name, not one of the card's three fields.
    expect(within(card).queryByText("State")).not.toBeInTheDocument();
    expect(within(card).queryByText("Created")).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Actions for Ben Sample" })).toBeInTheDocument();
  });

  it("reads its words from the provider through the hook", () => {
    stubViewport(true);
    function HookRoster() {
      const columns = useUserRosterColumns<Row, Role>({ roles: ROLES });
      return (
        <MemoryRouter>
          <DataTable rows={[ADA]} columns={columns} rowKey={(r) => r.id} paginated={false} />
        </MemoryRouter>
      );
    }
    render(
      <UiKitProvider labels={{ userRoster: { lastLogin: "Zuletzt angemeldet", never: "Nie" } }}>
        <HookRoster />
      </UiKitProvider>,
    );
    expect(screen.getByRole("columnheader", { name: /Zuletzt angemeldet/ })).toBeInTheDocument();
    expect(screen.getByText("Nie")).toBeInTheDocument();
  });
});

describe("adminUserStates", () => {
  it("maps the contract's row to the chips", () => {
    expect(adminUserStates({ is_active: true, email_verified: true })).toEqual(["active"]);
    expect(adminUserStates({ is_active: false, email_verified: false, password_change_required_at: "x" })).toEqual([
      "inactive",
      "unverified",
      "passwordChange",
    ]);
    // Operator mode: requested, nothing scheduled.
    expect(adminUserStates({ is_active: false, deletion_requested_at: "2026-10-01" })).toEqual([
      { state: "deletion", date: null },
    ]);
  });
});

describe("userRosterSort", () => {
  it("sends the first key the server knows, in the DataTable's encoding", () => {
    expect(userRosterSort([{ key: "last_login", dir: "desc" }])).toBe("last_login.desc");
    expect(
      userRosterSort([
        { key: "owned", dir: "asc" },
        { key: "name", dir: "asc" },
      ]),
    ).toBe("name");
    expect(userRosterSort([])).toBeUndefined();
  });
});

describe("UserIdentityCell", () => {
  it("falls back to the whole name, and to the address alone", () => {
    const { rerender } = render(<UserIdentityCell name="Ada Example" email="ada@example.com" />);
    expect(screen.getByText("Ada Example")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    rerender(<UserIdentityCell email="ada@example.com" avatar={false} />);
    expect(screen.getAllByText("ada@example.com")).toHaveLength(1);
  });

  it('ends the name and the address in "…" at Normal only: truncate-until-large (0.33, §10.17)', () => {
    render(<UserIdentityCell name="Ada Example" email="ada@example.com" />);
    for (const text of ["Ada Example", "ada@example.com"]) {
      const own = screen.getByText(text).className.split(" ");
      expect(own, text).toContain("truncate-until-large");
      expect(own, text).not.toContain("truncate");
    }
  });
});
