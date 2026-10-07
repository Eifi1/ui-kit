import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RoleVocabulary } from "../../components/account-chips";
import { UiKitProvider } from "../../i18n/kit-labels";
import { InvitationsPanel } from "../invitations-panel";
import type { InvitationRow } from "../invitations-panel";

/**
 * §5: a form (address, role, scope, language, note), rows with their status, and
 * resend / copy link / revoke — the link shown once, while mail goes to the console.
 */

type Role = "MEMBER" | "CUSTOMER";
const ROLES: RoleVocabulary<Role> = { MEMBER: { label: "Member" }, CUSTOMER: { label: "Customer", tone: "warning" } };

const ROWS: InvitationRow<Role>[] = [
  {
    id: 1,
    email: "nina@example.com",
    role: "CUSTOMER",
    scope: "t1",
    note: "Workshop lead",
    invited_by: { first: "Ada", last: "Example" },
    created_at: "2026-10-06T10:00:00Z",
    expires_at: "2026-10-20T10:00:00Z",
    status: "open",
  },
  { id: 2, email: "tim@example.com", role: "MEMBER", created_at: "2026-09-01T10:00:00Z", status: "accepted" },
  { id: 3, email: "old@example.com", created_at: "2026-08-01T10:00:00Z", status: "expired" },
  { id: 4, email: "gone@example.com", created_at: "2026-08-02T10:00:00Z", status: "revoked" },
];

const SCOPES = [
  { value: "t1", label: "Workshop" },
  { value: "t2", label: "Office" },
];

const rowOf = (email: string) => screen.getByText(email).closest("li")!;

describe("InvitationsPanel", () => {
  it("invites with the address, role, scope, language and note — and offers no address tag", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn(async () => ({ id: 9 }));
    render(
      <UiKitProvider locale="fr">
        <InvitationsPanel<Role>
          invitations={[]}
          roles={ROLES}
          scopes={SCOPES}
          languages={["de-CH", "en", "fr"]}
          onInvite={onInvite}
        />
      </UiKitProvider>,
    );
    expect(screen.getByText("Nobody has been invited yet.")).toBeInTheDocument();
    const invite = screen.getByRole("button", { name: "Invite" });
    expect(invite).toBeDisabled();

    const email = screen.getByLabelText("Email address");
    await user.type(email, "not an address");
    await user.click(invite);
    expect(screen.getByText("Enter a complete email address.")).toBeInTheDocument();
    expect(onInvite).not.toHaveBeenCalled();
    // Someone else's address: no "+app" tag is offered.
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();

    await user.clear(email);
    await user.type(email, " nina@example.com ");
    await user.selectOptions(screen.getByRole("combobox", { name: "Role" }), "CUSTOMER");
    await user.selectOptions(screen.getByRole("combobox", { name: "Scope" }), "t1");
    expect((screen.getByRole("combobox", { name: "Language of the invitation" }) as HTMLSelectElement).value).toBe("fr");
    await user.selectOptions(screen.getByRole("combobox", { name: "Language of the invitation" }), "de-CH");
    await user.type(screen.getByLabelText("Note"), "Workshop lead");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    expect(onInvite).toHaveBeenCalledWith({
      email: "nina@example.com",
      role: "CUSTOMER",
      scope: "t1",
      note: "Workshop lead",
      locale: "de-CH",
    });
    await waitFor(() => expect(screen.getByLabelText("Email address")).toHaveValue(""));
  });

  it("draws each row's status, role, scope, dates and who sent it", () => {
    render(<InvitationsPanel<Role> invitations={ROWS} roles={ROLES} scopes={SCOPES} />);
    const nina = rowOf("nina@example.com");
    expect(nina).toHaveAttribute("data-status", "open");
    expect(within(nina).getByText("Open")).toBeInTheDocument();
    expect(within(nina).getByText("Customer")).toBeInTheDocument();
    expect(within(nina).getByText("Workshop")).toBeInTheDocument();
    expect(nina).toHaveTextContent(/Sent .*2026/);
    expect(nina).toHaveTextContent(/Expires .*2026/);
    expect(nina).toHaveTextContent("by Ada Example");
    expect(nina).toHaveTextContent("Workshop lead");
    expect(within(rowOf("tim@example.com")).getByText("Accepted")).toBeInTheDocument();
    expect(within(rowOf("old@example.com")).getByText("Expired")).toBeInTheDocument();
    expect(rowOf("old@example.com")).not.toHaveTextContent("Expires");
    expect(within(rowOf("gone@example.com")).getByText("Revoked")).toBeInTheDocument();
    // No callbacks, no form and no buttons: a list to look at.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("resends open and expired ones, revokes open ones", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(async () => undefined);
    const onRevoke = vi.fn(async () => undefined);
    render(<InvitationsPanel<Role> invitations={ROWS} roles={ROLES} onResend={onResend} onRevoke={onRevoke} />);
    expect(within(rowOf("tim@example.com")).queryByRole("button")).not.toBeInTheDocument();
    expect(within(rowOf("gone@example.com")).queryByRole("button")).not.toBeInTheDocument();
    expect(
      within(rowOf("old@example.com")).queryByRole("button", { name: "Revoke the invitation for old@example.com" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Send old@example.com a new link" }));
    expect(onResend).toHaveBeenCalledWith(ROWS[2]);
    await user.click(screen.getByRole("button", { name: "Revoke the invitation for nina@example.com" }));
    expect(onRevoke).toHaveBeenCalledWith(ROWS[0]);
  });

  it("hints at console mail and keeps a link shown once, on its row", async () => {
    const user = userEvent.setup();
    const onResend = vi.fn(async () => ({ link: "https://app.example.com/register?invite=fresh", sent: true }));
    render(
      <InvitationsPanel<Role>
        invitations={[ROWS[0], { ...ROWS[1], id: 7, status: "open", email: "max@example.com", link: "https://app.example.com/register?invite=given" }]}
        roles={ROLES}
        mailBackend="console"
        onResend={onResend}
      />,
    );
    expect(screen.getByText(/written to the server log/)).toBeInTheDocument();
    // The link the app handed in with the row.
    expect(within(rowOf("max@example.com")).getByRole("button", { name: "Copy invitation link" })).toBeInTheDocument();
    // None yet for Nina; the resend's answer brings one.
    expect(within(rowOf("nina@example.com")).queryByRole("button", { name: "Copy invitation link" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send nina@example.com a new link" }));
    expect(
      await within(rowOf("nina@example.com")).findByRole("button", { name: "Copy invitation link" }),
    ).toBeInTheDocument();
  });

  it("says when the mail was not sent, and why a callback failed", async () => {
    const user = userEvent.setup();
    const onInvite = vi.fn(async () => ({ id: 3, sent: false }));
    const onRevoke = vi.fn(async () => {
      throw new Error("nope");
    });
    render(
      <InvitationsPanel<Role>
        invitations={ROWS.slice(0, 1)}
        onInvite={onInvite}
        onRevoke={onRevoke}
        describeError={() => "The invitation is gone already."}
      />,
    );
    // No roles: no role field, and none is sent.
    expect(screen.queryByRole("combobox", { name: "Role" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Email address"), "pat@example.com");
    await user.click(screen.getByRole("button", { name: "Invite" }));
    expect(onInvite).toHaveBeenCalledWith(expect.not.objectContaining({ role: expect.anything() }));
    expect(await screen.findByText("pat@example.com is invited, but the mail couldn’t be sent. Resend it.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Revoke the invitation for nina@example.com" }));
    expect(await screen.findByText("The invitation is gone already.")).toBeInTheDocument();
  });
});
