// The English words of ./iban-input, in a module with no component code: the English
// catalogue (src/i18n/defaults.ts) imports them without the component, so `en` loads as one
// chunk like the other languages (0.34, KS U8). ./iban-input re-exports them.

import type { IbanInputLabels } from "./iban-input";

export const DEFAULT_IBAN_INPUT_LABELS: IbanInputLabels = {
  format: "An IBAN starts with a two-letter country code and two check digits.",
  country: (code) => `“${code}” is not the country code of an IBAN.`,
  length: (actual, expected) => `An IBAN from this country has ${expected} characters — this one has ${actual}.`,
  checksum: "The check digits don’t match — a character is probably mistyped.",
  qrRequired: "This is a regular IBAN. A QR-bill needs the account’s QR-IBAN.",
  qrNotAllowed: "This is a QR-IBAN, which only receives QR-bill payments. Enter the account’s regular IBAN.",
};
