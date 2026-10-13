import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkProps } from "../../i18n/kit-labels";
import { UnsubscribePanel, unsubscribeTokenType } from "../unsubscribe-panel";
import { refusal } from "../../test/fake-push";
import { axeViolations } from "../../test/axe";

/**
 * docs/notifications-harmonization.md §3.6, §4.2: the signed-out unsubscribe page — both
 * POSTs, both done states, a refused token, and a token that does not parse sends
 * nothing. Tokens are built as server-kit writes them; the MAC is a stand-in (the kit
 * never reads it).
 */

const b64url = (text: string) => btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const token = (claim: string) => `v1.${b64url(claim)}.${b64url("not-a-real-mac-32-bytes-long!!!!")}`;

const TOKEN = token("42:feedback_answered");

describe("unsubscribeTokenType", () => {
  it("reads the type from the token's claim", () => {
    expect(unsubscribeTokenType(TOKEN)).toBe("feedback_answered");
    expect(unsubscribeTokenType(token("8b6e3f0c-1c2d-4e5f-9a8b-7c6d5e4f3a2b:invoices_overdue"))).toBe(
      "invoices_overdue",
    );
  });

  it.each([
    ["empty", ""],
    ["two parts", `v1.${b64url("42:digest")}`],
    ["another version", `v2.${b64url("42:digest")}.mac`],
    ["no user", token(":digest")],
    ["no colon", token("42digest")],
    ["a bad type id", token("42:Digest")],
    ["padding", `v1.${btoa("42:digest!")}.mac`],
    ["not base64url", "v1.***.mac"],
    ["an empty MAC", `v1.${b64url("42:digest")}.`],
  ])("is null for %s", (_name, value) => {
    expect(unsubscribeTokenType(value)).toBeNull();
  });
});

const panel = (overrides: Partial<Parameters<typeof UnsubscribePanel>[0]> = {}) => {
  const props = {
    token: TOKEN,
    appName: "Example",
    typeLabel: "Answers to your reports",
    onStop: vi.fn(async () => undefined),
    onStopAll: vi.fn(async () => undefined),
    settingsHref: "/settings/notifications",
    ...overrides,
  };
  render(<UnsubscribePanel {...props} />);
  return props;
};

describe("UnsubscribePanel", () => {
  it("asks first — a GET never unsubscribes — naming the type and that account mail still comes", () => {
    const props = panel();
    expect(screen.getByRole("heading", { level: 2, name: "E-mail notifications" })).toBeInTheDocument();
    expect(screen.getByText("You get e-mails about: Answers to your reports.")).toBeInTheDocument();
    expect(screen.getByText("E-mails about your account still come.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop these e-mails" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop all notification e-mails from Example" })).toBeInTheDocument();
    expect(props.onStop).not.toHaveBeenCalled();
    expect(props.onStopAll).not.toHaveBeenCalled();
  });

  it("without the type's name, says only that notification mail comes", () => {
    panel({ typeLabel: undefined });
    expect(screen.getByText("You get notification e-mails.")).toBeInTheDocument();
  });

  it("“Stop these e-mails” posts the token, then says it is done and how to turn them back on", async () => {
    const user = userEvent.setup();
    const props = panel();
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(props.onStop).toHaveBeenCalledWith(TOKEN);
    expect(props.onStopAll).not.toHaveBeenCalled();
    const done = await screen.findByText("Done. You won’t get these e-mails any more.");
    expect(done).toBeInTheDocument();
    expect(screen.getByText(/You can turn them back on at any time in Settings\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Settings" })).toHaveAttribute("href", "/settings/notifications");
    // Focus follows to the outcome: the pressed button is gone.
    expect(document.activeElement).toContainElement(done);
  });

  it("“Stop all” posts to /all and says so with the app's name", async () => {
    const user = userEvent.setup();
    const props = panel();
    await user.click(screen.getByRole("button", { name: "Stop all notification e-mails from Example" }));
    expect(props.onStopAll).toHaveBeenCalledWith(TOKEN);
    expect(
      await screen.findByText("Done. You won’t get notification e-mails from Example any more."),
    ).toBeInTheDocument();
  });

  it("a token the server refuses (400 unsubscribe_invalid) is an invalid link", async () => {
    const user = userEvent.setup();
    panel({ onStop: vi.fn(() => Promise.reject(refusal(400, "unsubscribe_invalid"))) });
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(
      await screen.findByText("This link doesn’t work any more. You can turn e-mails off in Settings instead."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop these e-mails" })).not.toBeInTheDocument();
  });

  it("any other failure says try again, the buttons still there", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn().mockRejectedValueOnce(refusal(503)).mockResolvedValue(undefined);
    panel({ onStop });
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn’t work. Please try again.");
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(await screen.findByText("Done. You won’t get these e-mails any more.")).toBeInTheDocument();
    expect(onStop).toHaveBeenCalledTimes(2);
  });

  it("a token that does not parse is invalid at once, and sends nothing", () => {
    const props = panel({ token: "not-a-token" });
    expect(
      screen.getByText("This link doesn’t work any more. You can turn e-mails off in Settings instead."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(props.onStop).not.toHaveBeenCalled();
  });

  it("takes the app's `isInvalid`, its heading level, or none", async () => {
    const user = userEvent.setup();
    panel({
      onStop: vi.fn(() => Promise.reject({ gone: true })),
      isInvalid: (error) => (error as { gone?: boolean }).gone === true,
      headingAs: "h1",
    });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(await screen.findByText(/This link doesn’t work any more/)).toBeInTheDocument();
  });

  it("the settings link goes through the provider's link component", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    const Link = ({ href, children, ...rest }: KitLinkProps) => {
      seen.push(href);
      return (
        <a href={href} data-router-link="" {...rest}>
          {children}
        </a>
      );
    };
    render(
      <UiKitProvider linkComponent={Link}>
        <UnsubscribePanel
          token={TOKEN}
          appName="Example"
          onStop={vi.fn(async () => undefined)}
          onStopAll={vi.fn(async () => undefined)}
          settingsHref="/settings/notifications"
          title={null}
        />
      </UiKitProvider>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    expect(await screen.findByRole("link", { name: "Open Settings" })).toHaveAttribute("data-router-link");
    expect(seen).toContain("/settings/notifications");
  });

  it("passes axe, asking and done", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <UnsubscribePanel
        token={TOKEN}
        appName="Example"
        typeLabel="Answers to your reports"
        onStop={vi.fn(async () => undefined)}
        onStopAll={vi.fn(async () => undefined)}
        settingsHref="/settings"
      />,
    );
    expect(await axeViolations(container)).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Stop these e-mails" }));
    await screen.findByText("Done. You won’t get these e-mails any more.");
    expect(await axeViolations(container)).toEqual([]);
  });
});
