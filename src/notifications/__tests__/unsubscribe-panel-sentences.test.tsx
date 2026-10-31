import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { UnsubscribePanel } from "../unsubscribe-panel";

/**
 * The outcome's two sentences are joined by the catalogue, not by the panel: an ASCII
 * space between them is English typography, and Chinese writes "…照常发送。您可以…"
 * (refactor audit 2026-10-30, DOC-11).
 */

const b64url = (text: string) => btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const TOKEN = `v1.${b64url("42:feedback_answered")}.${b64url("not-a-real-mac-32-bytes-long!!!!")}`;

async function stopped(labels?: typeof UI_KIT_LABELS_ZH) {
  const user = userEvent.setup();
  render(
    <UiKitProvider labels={labels}>
      <UnsubscribePanel
        token={TOKEN}
        appName="Example"
        onStop={vi.fn(async () => undefined)}
        onStopAll={vi.fn(async () => undefined)}
        settingsHref="/settings/notifications"
      />
    </UiKitProvider>,
  );
  await user.click(screen.getAllByRole("button")[0]);
}

describe("UnsubscribePanel — the outcome's two sentences", () => {
  it("in Chinese, with no space between them", async () => {
    await stopped(UI_KIT_LABELS_ZH);
    expect(await screen.findByText("有关您账户的邮件仍会照常发送。您可以随时在“设置”中重新开启。")).toBeInTheDocument();
  });

  it("in English, with one", async () => {
    await stopped();
    expect(
      await screen.findByText(
        "E-mails about your account still come. You can turn them back on at any time in Settings.",
      ),
    ).toBeInTheDocument();
  });
});
