import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RoleVocabulary } from "../../components/account-chips";
import { UiKitProvider } from "../../i18n/kit-labels";
import { RoleSelect, RolesEditor } from "../role-select";

/**
 * §4.1, §9.6: a role the server would refuse is shown unavailable, with why — the last
 * admin, yourself, or the app's own reason — rather than answered after a dialog.
 */

type Role = "ADMIN" | "MEMBER" | "CUSTOMER" | "REVIEWER";
const ROLES: RoleVocabulary<Role> = {
  ADMIN: { label: "Admin" },
  MEMBER: { label: "Member" },
  CUSTOMER: { label: "Customer" },
  REVIEWER: { label: "Reviewer" },
};

const options = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((o) => `${o.textContent}${(o as HTMLOptionElement).disabled ? " [x]" : ""}`);

describe("RoleSelect", () => {
  it("offers the vocabulary, says why an option is out, and reports a pick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RoleSelect<Role>
        name="Ada Example"
        value="ADMIN"
        roles={ROLES}
        offered={["ADMIN", "MEMBER", "CUSTOMER"]}
        optionDisabledReason={(role) => (role === "MEMBER" ? "last_admin" : role === "CUSTOMER" ? "owns work" : undefined)}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole("combobox", { name: "Role of Ada Example" });
    expect(options(select)).toEqual([
      "Admin",
      "Member (not for the last administrator) [x]",
      "Customer (owns work) [x]",
    ]);
    await user.selectOptions(select, "ADMIN");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a held role it does not offer, and calls back on another one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RoleSelect<Role> value="REVIEWER" roles={ROLES} offered={["ADMIN", "MEMBER"]} onChange={onChange} />);
    const select = screen.getByRole("combobox", { name: "Role" }) as HTMLSelectElement;
    expect(options(select)).toEqual(["Admin", "Member", "Reviewer"]);
    expect(select.value).toBe("REVIEWER");
    await user.selectOptions(select, "MEMBER");
    expect(onChange).toHaveBeenCalledWith("MEMBER");
  });

  it("locks the whole control with the kit's words, or the app's, and keeps it focusable", () => {
    const { rerender } = render(
      <RoleSelect<Role> name="Ada Example" value="ADMIN" roles={ROLES} disabledReason="self" onChange={() => undefined} />,
    );
    const select = screen.getByRole("combobox", { name: "Role of Ada Example" });
    expect(select).toHaveAttribute("aria-disabled", "true");
    expect(select).not.toBeDisabled();
    expect(select).toHaveAccessibleDescription("You can’t change your own role.");
    rerender(
      <RoleSelect<Role> name="Ada Example" value="ADMIN" roles={ROLES} disabledReason="last_admin" onChange={() => undefined} />,
    );
    expect(select).toHaveAccessibleDescription("The last active administrator keeps this role.");
    rerender(
      <RoleSelect<Role> name="Ada Example" value="ADMIN" roles={ROLES} disabledReason="Demo accounts keep their role." onChange={() => undefined} />,
    );
    expect(select).toHaveAccessibleDescription("Demo accounts keep their role.");
  });

  it("speaks the provider's words", () => {
    render(
      <UiKitProvider labels={{ roleSelect: { roleOf: (name) => `Rolle von ${name}` } }}>
        <RoleSelect<Role> name="Ada Example" value="ADMIN" roles={ROLES} onChange={() => undefined} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Rolle von Ada Example" })).toBeInTheDocument();
  });
});

describe("RolesEditor", () => {
  function Harness(props: { initial: Role[]; lockedReason?: string }) {
    const [value, setValue] = useState<Role[]>(props.initial);
    return (
      <>
        <RolesEditor<Role>
          value={value}
          roles={ROLES}
          offered={["ADMIN", "MEMBER", "CUSTOMER"]}
          optionDisabledReason={(role) => (role === "ADMIN" ? "last_admin" : undefined)}
          disabledReason={props.lockedReason}
          legend="Roles in Example Ltd"
          onChange={setValue}
        />
        <output data-testid="value">{value.join(",")}</output>
      </>
    );
  }

  it("ticks several roles; a locked one keeps its box and says why", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["ADMIN", "REVIEWER"]} />);
    const group = screen.getByRole("group", { name: "Roles in Example Ltd" });
    const admin = within(group).getByRole("checkbox", { name: "Admin" });
    expect(admin).toBeChecked();
    expect(admin).toBeDisabled();
    expect(admin).toHaveAccessibleDescription("The last active administrator keeps this role.");
    // Held but not offered: shown, not changeable.
    expect(within(group).getByRole("checkbox", { name: "Reviewer" })).toBeDisabled();
    await user.click(within(group).getByRole("checkbox", { name: "Member" }));
    expect(screen.getByTestId("value")).toHaveTextContent("ADMIN,MEMBER,REVIEWER");
  });

  it("locks every box with one reason", () => {
    render(<Harness initial={["MEMBER"]} lockedReason="self" />);
    const member = screen.getByRole("checkbox", { name: "Member" });
    expect(member).toHaveAttribute("aria-disabled", "true");
    expect(member).toHaveAccessibleDescription(/You can’t change your own role\./);
  });
});
