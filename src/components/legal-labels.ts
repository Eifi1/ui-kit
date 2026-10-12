// The English words of ./legal, in a module with no component code: the English catalogue
// (src/i18n/defaults.ts) imports them without the component, so `en` loads as one chunk
// like the other languages (0.34, KS U8). ./legal re-exports them.

import type { LegalLabels } from "./legal";

export const DEFAULT_LEGAL_LABELS: LegalLabels = {
  navLabel: "Legal",
  links: {
    impressum: "Imprint",
    privacy: "Privacy Policy",
    terms: "Terms",
  },
  titles: {
    impressum: "Imprint",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
  backHome: "Back to home",
  accept: "I accept the {terms} and the {privacy}",
  notice: {
    beta: "Closed beta. These texts have not been reviewed by a lawyer yet and will be before a public launch.",
    privacy:
      "Closed beta. The legal wording below has not been reviewed by a lawyer yet and will be before a public launch. The technical descriptions — what is stored, where, and who can read it — describe what the software actually does today, and are meant to be checked against it.",
  },
  translation: {
    note: (o) =>
      `This is a translation for your convenience. The ${o.bindingLanguage} version is binding.`,
    show: (o) => `Show the ${o.bindingLanguage} version`,
  },
  sections: {
    impressum: {
      operator: {
        title: "Operator",
        body: (o) =>
          `${o.name}\n${o.postalCode} ${o.city}\n${o.country}\n\nThe full postal address is supplied on request to anyone with a legitimate legal interest; write to the contact address below.`,
      },
      contact: {
        title: "Contact",
        body: (o) => `Email: ${o.email}`,
      },
      disclaimer: {
        title: "Liability for content and links",
        body: "This is a private, non-commercial project offered during a closed beta, without warranty. External sites we link to are the responsibility of their respective operators; we have no control over their content.",
        commercial:
          "This is a commercial service. Paid plans are sold by our reseller, which acts as the Merchant of Record: it sells the subscription in its own name, takes the payment, issues the invoice and handles VAT, and its terms of sale apply to the purchase. We take care that the content of this service is accurate, but cannot guarantee that it is complete or up to date. External sites we link to are the responsibility of their respective operators; we have no control over their content.",
      },
    },
    privacy: {
      controller: {
        title: "Controller",
        body: (o) =>
          `The party responsible for processing personal data in this service is:\n${o.name}\n${o.postalCode} ${o.city}, ${o.country}\nEmail: ${o.email}\n\nThe full postal address is supplied on request to data subjects and supervisory authorities.`,
      },
      legal_basis: {
        title: "Legal basis",
        body: "As the operator is based in Switzerland, processing is governed by the Swiss Federal Act on Data Protection (FADP). Where the EU General Data Protection Regulation (GDPR) applies to you, we rely on the performance of a contract to provide the service (Art. 6(1)(b) GDPR) and our legitimate interest in operating and securing it (Art. 6(1)(f) GDPR).",
      },
      browser: {
        title: "What your browser stores",
        lead: "No cookies. The app keeps the following in your browser's storage:",
        tail: "None of it is used to track you. Entries waiting to be sent are sent to us as soon as they can be; everything else stays on your device. All of it disappears when you clear the site's data, and signing out removes the sign-in tokens.",
      },
      rights: {
        title: "Your rights",
        lead: "You have the right to access, rectification, erasure, restriction, data portability and objection.",
        tail: "If you are in Switzerland you may contact the Federal Data Protection and Information Commissioner (FDPIC); if you are in the EU you may lodge a complaint with your local supervisory authority.",
      },
      contact: {
        title: "Contact for data protection",
        body: (o) => `For any privacy request, contact: ${o.email}`,
      },
    },
    terms: {
      warranty: {
        title: "No warranty",
        body: 'The service is provided "as is" and "as available", without warranties of any kind to the extent permitted by law. As a beta it may contain errors, change, or be interrupted at any time — keep your own backups of important data.',
      },
      liability: {
        title: "Limitation of liability",
        body: "To the extent permitted by applicable law, the operator is not liable for any indirect or consequential damage arising from the use of, or inability to use, the service. Nothing here limits liability that cannot be limited by law.",
      },
      changes: {
        title: "Changes to these terms",
        body: "These terms may be updated as the service evolves. Material changes will be announced by email or in the app; continued use after a change means you accept it.",
      },
      language: {
        title: "Language",
        body: (o) =>
          `These terms are written in ${o.bindingLanguage}. Translations into other languages are provided for convenience only; where a translation differs, the ${o.bindingLanguage} version prevails.`,
      },
      law: {
        title: "Governing law",
        body: (o) =>
          `These terms are governed by Swiss law, excluding its conflict-of-laws rules. As far as legally permissible, the place of jurisdiction is ${o.city} (${o.region}), ${o.country}.`,
      },
    },
  },
};
