import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { MailTestCard, maskMailAddress } from "../mail-test-card";
import type { MailTestAnswer } from "../mail-test-card";

/** docs/admin-harmonization.md §9.2.4: the card reads `mail_backend` first. */

const ADDRESS = "ada@example.com";
const button = () => screen.getByRole("button", { name: "Send a test mail to me" });

function renderCard(send: () => Promise<MailTestAnswer>, mailBackend = "resend") {
  return render(<MailTestCard mailBackend={mailBackend} send={send} address={ADDRESS} />);
}

describe("MailTestCard", () => {
  it("shows the transport as a chip before any send", () => {
    renderCard(vi.fn());
    expect(screen.getByText("Transport: resend")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("sent: names the masked address, never the whole one", async () => {
    const send = vi.fn().mockResolvedValue({ sent: true, mail_backend: "resend" });
    renderCard(send);
    await userEvent.click(button());
    expect(await screen.findByRole("status")).toHaveTextContent("Sent to a…@example.com. Check the inbox.");
    expect(send).toHaveBeenCalledTimes(1);
    expect(document.body).not.toHaveTextContent(ADDRESS);
  });

  it("console: says nothing was sent although the answer says sent", async () => {
    renderCard(() => Promise.resolve({ sent: true, mail_backend: "console" }), "resend");
    await userEvent.click(button());
    expect(await screen.findByRole("status")).toHaveTextContent("The console transport only logs mail; nothing was sent.");
    expect(screen.queryByText(/Sent to/)).toBeNull();
    // The chip follows the answer's transport.
    expect(screen.getByText("Transport: console")).toBeInTheDocument();
  });

  it("failed: an answer of sent=false, and a request that throws", async () => {
    const send = vi
      .fn<() => Promise<MailTestAnswer>>()
      .mockResolvedValueOnce({ sent: false, mail_backend: "smtp" })
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 502 }));
    renderCard(send);
    await userEvent.click(button());
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not send. The server log has the provider’s answer.");
    await userEvent.click(button());
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not send.");
  });

  it("429: the limiter's line, with Retry-After when there is one", async () => {
    const send = vi
      .fn<() => Promise<MailTestAnswer>>()
      .mockRejectedValueOnce({ response: { status: 429, headers: { "retry-after": "120" } } })
      .mockRejectedValueOnce({ status: 429 });
    renderCard(send);
    await userEvent.click(button());
    expect(await screen.findByRole("status")).toHaveTextContent("Too many attempts. Try again in 2 min.");
    await userEvent.click(button());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Too many attempts. Wait a moment and try again."));
  });

  it("mailBackend is optional: no chip until an answer names the transport, then it stays (0.46, N1)", async () => {
    const send = vi
      .fn<() => Promise<MailTestAnswer>>()
      .mockResolvedValueOnce({ sent: true, mail_backend: "smtp" })
      .mockRejectedValueOnce({ status: 429 });
    render(<MailTestCard send={send} address={ADDRESS} />);
    expect(screen.queryByText(/Transport:/)).toBeNull();
    await userEvent.click(button());
    expect(await screen.findByText("Transport: smtp")).toBeInTheDocument();
    // A later send that brings no answer (the limiter) keeps the transport it learnt.
    await userEvent.click(button());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Too many attempts."));
    expect(screen.getByText("Transport: smtp")).toBeInTheDocument();
  });

  it("is busy while sending and sends once", async () => {
    let resolve!: (answer: MailTestAnswer) => void;
    const send = vi.fn(() => new Promise<MailTestAnswer>((r) => (resolve = r)));
    renderCard(send);
    await userEvent.click(button());
    expect(button()).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button());
    expect(send).toHaveBeenCalledTimes(1);
    resolve({ sent: true, mail_backend: "resend" });
    await screen.findByRole("status");
    expect(button()).not.toHaveAttribute("aria-busy", "true");
  });
});

describe("maskMailAddress", () => {
  it("keeps the first character and the domain", () => {
    expect(maskMailAddress("ada@example.com")).toBe("a…@example.com");
    expect(maskMailAddress("  b.sample+tag@mail.example.ch ")).toBe("b…@mail.example.ch");
    expect(maskMailAddress("élise@example.fr")).toBe("é…@example.fr");
    expect(maskMailAddress("nodomain")).toBe("n…");
    expect(maskMailAddress("")).toBe("");
  });
});

describe("MailTestCard — seven languages", () => {
  const CATALOGUES = {
    "de-CH": UI_KIT_LABELS_DE_CH,
    es: UI_KIT_LABELS_ES,
    fr: UI_KIT_LABELS_FR,
    hu: UI_KIT_LABELS_HU,
    it: UI_KIT_LABELS_IT,
    zh: UI_KIT_LABELS_ZH,
  } as const;
  const english = DEFAULT_UI_KIT_LABELS.mailTestCard;

  it.each(Object.entries(CATALOGUES))("%s: its own words, the console line from the provider", async (_code, catalogue) => {
    const words = catalogue.mailTestCard;
    for (const key of ["title", "description", "action", "console", "failed", "keywords"] as const) {
      expect(words[key].trim(), key).not.toBe("");
      expect(words[key], key).not.toBe(english[key]);
    }
    expect(words.sent("a…@example.com")).toContain("a…@example.com");
    expect(words.transport("smtp")).toContain("smtp");
    expect(words.rateLimited()).not.toBe(english.rateLimited());
    render(
      <UiKitProvider labels={catalogue}>
        <MailTestCard mailBackend="console" address={ADDRESS} send={() => Promise.resolve({ sent: true, mail_backend: "console" })} />
      </UiKitProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: words.action }));
    expect(await screen.findByRole("status")).toHaveTextContent(words.console);
  });

  it("de-CH is Swiss: no ß", () => {
    expect(JSON.stringify(UI_KIT_LABELS_DE_CH.mailTestCard)).not.toContain("ß");
  });
});
