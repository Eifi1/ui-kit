import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ShieldCheck } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "../../components/data-table";
import type { DataTableColumn } from "../../components/data-table";
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
function stubViewport(wide: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: wide,
    media: "",
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const OWNED: DataTableColumn<Row> = { key: "owned", header: "Owned", cell: (r) => String(r.owned) };

function Roster(props: Partial<UserRosterColumnsOptions<Row, Role>> & { rows?: Row[]; locale?: string }) {
  const { rows = [ADA, BEN, CY], locale, ...options } = props;
  const columns = userRosterColumns<Row, Role>({ roles: ROLES, extra: [OWNED], ...options });
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
    expect(within(other).getAllByRole("button").map((b) => b.textContent)).toEqual(["Resend verification"]);
  });

  it("makes phone cards from the same columns: the identity heads the card, created is left off", () => {
    stubViewport(false);
    render(<Roster rows={[BEN]} locale="en-GB" actions={() => [{ label: "Resend", onSelect: () => undefined }]} />);
    const card = screen.getByRole("listitem");
    expect(within(card).getByText("Ben Sample")).toBeInTheDocument();
    expect(within(card).getByText("Last login")).toBeInTheDocument();
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
    expect(userRosterSort([{ key: "owned", dir: "asc" }, { key: "name", dir: "asc" }])).toBe("name");
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
});
