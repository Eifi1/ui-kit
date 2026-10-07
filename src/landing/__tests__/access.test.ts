import { describe, expect, it } from "vitest";

import { accessAction } from "../access";

/** The query of a `mailto:` as the mail client reads it. */
function mailParts(href: string) {
  const [to, query = ""] = href.slice("mailto:".length).split("?");
  const params = Object.fromEntries(
    query.split("&").map((pair) => {
      const [key, value = ""] = pair.split("=");
      return [key, decodeURIComponent(value)];
    }),
  );
  return { to, ...params } as { to: string; subject?: string; body?: string };
}

describe("accessAction — §4.2", () => {
  it("makes a request a mail to support, with the subject and the body template", () => {
    const link = accessAction({ kind: "request", email: "support@example.com", app: "Ada's Garden Planner" });
    expect(link.kind).toBe("request");
    expect(link.label).toBe("Request access");
    const mail = mailParts(link.href);
    expect(mail.to).toBe("support@example.com");
    expect(mail.subject).toBe("Access to Ada's Garden Planner");
    expect(mail.body).toBe("Name:\r\nWhat would you use it for:");
  });

  it("encodes for RFC 6068: %20 for a space, CRLF between lines, the apostrophe too, the @ left alone", () => {
    const { href } = accessAction({ kind: "request", email: "support@example.com", app: "Ada's Garden Planner" });
    expect(href).toBe(
      "mailto:support@example.com?subject=Access%20to%20Ada%27s%20Garden%20Planner" +
        "&body=Name%3A%0D%0AWhat%20would%20you%20use%20it%20for%3A",
    );
    // A `+` would be read as a literal plus by a mail client, never as a space.
    expect(href).not.toContain("+");
  });

  it("adds kastlan's Company line when asked", () => {
    const { href } = accessAction({ kind: "request", email: "support@example.com", app: "Kastlan", askCompany: true });
    expect(mailParts(href).body).toBe("Name:\r\nCompany:\r\nWhat would you use it for:");
  });

  it("writes the mail in the labels' language, UTF-8 percent-encoded", () => {
    const { href, label } = accessAction(
      { kind: "request", email: "support@example.com", app: "Gärtnerei" },
      {
        requestAccess: "Zugang anfragen",
        accessSubject: (app) => `Zugang zu ${app ?? "der App"}`,
        accessName: "Name:",
        accessUse: "Wofür möchten Sie es nutzen?",
      },
    );
    expect(label).toBe("Zugang anfragen");
    expect(href).toContain("subject=Zugang%20zu%20G%C3%A4rtnerei");
    expect(mailParts(href).body).toBe("Name:\r\nWofür möchten Sie es nutzen?");
  });

  it("says 'Access request' when the app named none, and keeps the English for an undefined key", () => {
    const { href, label } = accessAction(
      { kind: "request", email: "support@example.com" },
      { requestAccess: undefined },
    );
    expect(label).toBe("Request access");
    expect(mailParts(href).subject).toBe("Access request");
  });

  it("encodes an address with characters that would break the URL", () => {
    const { href } = accessAction({ kind: "request", email: "support+ada?x@example.com" });
    expect(href.startsWith("mailto:support%2Bada%3Fx@example.com?subject=")).toBe(true);
  });

  it("turns into Get started → the register page once an app opens registration", () => {
    expect(accessAction({ kind: "register", href: "/register" })).toEqual({
      kind: "register",
      href: "/register",
      label: "Get started",
    });
  });
});
