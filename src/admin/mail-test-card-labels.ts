// The English words of ./mail-test-card, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./mail-test-card re-exports them.

import { englishRateLimited } from "../auth/auth-errors-labels";
import type { MailTestCardLabels } from "./mail-test-card";

/** docs/admin-harmonization.md §9.2.4, word for word. */
export const DEFAULT_MAIL_TEST_CARD_LABELS: MailTestCardLabels = {
  title: "Test mail",
  description: "Sends one mail to your own address, through the transport this installation sends all its mail with.",
  transport: (backend) => `Transport: ${backend}`,
  action: "Send a test mail to me",
  sent: (address) => `Sent to ${address}. Check the inbox.`,
  console: "The console transport only logs mail; nothing was sent.",
  failed: "Could not send. The server log has the provider’s answer.",
  rateLimited: englishRateLimited,
  keywords: "test mail email e-mail transport smtp resend console send deliver",
};
