import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabels } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";
import { DEFAULT_LEGAL_LABELS } from "../legal";
import type { LegalOperator } from "../legal";
import { LegalKitSection, LegalPage } from "../legal-page";

/**
 * The privacy policy's "What your browser stores" (0.58; keksdose's legal audit against the
 * app, Marcel 2026-11-09, docs/legal-harmonization.md decision 10). Its tail said that
 * everything but the entries waiting to be sent "stays on your device", which read as
 * "never leaves it". The clause goes; what an account keeps on the server is each app's
 * to say, in its own sections.
 *
 * 0.59 (keksdose's scan for absolute claims, Marcel 2026-11-10, decision 10): the lead says
 * what the app sets, not that a page has no cookies at all; and `variant="commercial"`,
 * keyed as the disclaimer's and the changes clause's, says where the checkout's own
 * entries are and whose policy covers them. The operator is synthetic.
 */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

const B = DEFAULT_LEGAL_LABELS.sections.privacy.browser;
const section = () => document.getElementById("browser");

const CATALOGUES: Record<string, () => UiKitLabels> = {
  en: () => uiKitLabelsEn(),
  "de-CH": () => uiKitLabelsDeCh(),
  fr: () => uiKitLabelsFr(),
  it: () => uiKitLabelsIt(),
  es: () => uiKitLabelsEs(),
  hu: () => uiKitLabelsHu(),
  zh: () => uiKitLabelsZh(),
};

/** The clause that went, as each catalogue worded it. */
const GONE: Record<string, string> = {
  en: "everything else stays on your device",
  "de-CH": "alles andere bleibt auf Ihrem Gerät",
  fr: "tout le reste demeure sur votre appareil",
  it: "tutto il resto rimane sul Suo dispositivo",
  es: "todo lo demás permanece en su dispositivo",
  hu: "minden más az Ön eszközén marad",
  zh: "其他所有内容都保留在您的设备上",
};

/** Where the sentence now ends, and the next one starts: the rest is kept. */
const KEPT: Record<string, string> = {
  en: "Entries waiting to be sent are sent to us as soon as they can be. All of it disappears",
  "de-CH": "Noch nicht gesendete Einträge werden an uns übermittelt, sobald das möglich ist. Das alles verschwindet",
  fr: "Les éléments en attente d’envoi nous sont transmis dès que possible. Tout cela disparaît",
  it: "Le voci in attesa di invio ci vengono trasmesse non appena possibile. Tutto questo scompare",
  es: "Las entradas pendientes de envío se nos envían en cuanto sea posible. Todo ello desaparece",
  hu: "A küldésre váró bejegyzéseket a böngésző elküldi nekünk, amint lehetséges. Mindez eltűnik",
  zh: "等待发送的条目会尽快发送给我们。清除网站数据后",
};

/**
 * The lead as each catalogue words it since 0.59 (keksdose's scan for absolute claims,
 * Marcel 2026-11-10, decision 10): "No cookies." stood alone, a claim about the whole page —
 * which a pay host's checkout script could make untrue. It is a claim about the app now,
 * the one thing the kit can vouch for.
 */
const LEAD: Record<string, string> = {
  en: "The app sets no cookies and stores the following in your browser's storage:",
  "de-CH": "Die App setzt keine Cookies und legt Folgendes im Speicher Ihres Browsers ab:",
  fr: "L’app ne dépose aucun cookie et enregistre les éléments suivants dans le stockage de votre navigateur\u00a0:",
  it: "L’app non imposta alcun cookie e salva quanto segue nella memoria del Suo browser:",
  es: "La aplicación no instala cookies y guarda lo siguiente en el almacenamiento de su navegador:",
  hu: "Az alkalmazás nem helyez el sütiket, és a következőket tárolja az Ön böngészőjének tárhelyén:",
  zh: "应用程序不设置 Cookie，并会在您浏览器的存储中保存以下内容：",
};

describe('LegalKitSection section="browser": the lead (0.59)', () => {
  it("says the app sets no cookies, not that there are none", () => {
    render(<LegalKitSection section="browser" entries={["your sign-in tokens"]} />);
    const text = document.getElementById("browser")?.textContent ?? "";
    expect(text).toContain(`${LEAD.en}your sign-in tokens`);
    expect(text).not.toMatch(/No cookies\./);
  });

  it.each(Object.entries(CATALOGUES))("%s: the lead's claim is about the app", (code, make) => {
    expect(make().legal.sections.privacy.browser.lead).toBe(LEAD[code]);
  });
});

describe('LegalKitSection section="browser" (0.58)', () => {
  it("no longer says that everything else stays on the device", () => {
    render(<LegalKitSection section="browser" entries={["your sign-in tokens"]} />);
    const text = document.getElementById("browser")?.textContent ?? "";
    expect(text).toContain(DEFAULT_LEGAL_LABELS.sections.privacy.browser.tail);
    expect(text).not.toContain("stays on your device");
    expect(text).toContain(KEPT.en);
  });

  it.each(Object.entries(CATALOGUES))("%s: the clause is gone and the rest of the tail is kept", (code, make) => {
    const { tail } = make().legal.sections.privacy.browser;
    expect(tail).not.toContain(GONE[code]);
    expect(tail).toContain(KEPT[code]);
  });
});

/**
 * The checkout's sentence, as each catalogue words it (0.59): the lead's probe of Paddle.js
 * v2 found that the app's own pay page stores nothing, while the checkout frame, served from
 * Paddle's domain, keeps entries of its own there (a security cookie, settings). It names
 * none of them: the full sandbox check is still open.
 */
const CHECKOUT: Record<string, string> = {
  en: "The payment runs in a Paddle window on Paddle's own domain; what that window stores there (such as a security cookie and settings) is governed by Paddle's privacy policy.",
  "de-CH":
    "Die Zahlung läuft in einem Fenster von Paddle auf Paddles eigener Domain; was dieses dort speichert (etwa ein Sicherheits-Cookie und Einstellungen), regelt die Datenschutzerklärung von Paddle.",
  fr: "Le paiement se déroule dans une fenêtre de Paddle, sur le propre domaine de Paddle\u202f; ce que cette fenêtre y enregistre (par exemple un cookie de sécurité et des paramètres) relève de la politique de confidentialité de Paddle.",
  it: "Il pagamento avviene in una finestra di Paddle, sul dominio proprio di Paddle; ciò che questa finestra vi salva (ad esempio un cookie di sicurezza e alcune impostazioni) è disciplinato dall’informativa sulla privacy di Paddle.",
  es: "El pago se realiza en una ventana de Paddle, en el propio dominio de Paddle; lo que esa ventana guarda allí (por ejemplo, una cookie de seguridad y ajustes) se rige por la política de privacidad de Paddle.",
  hu: "A fizetés a Paddle egy ablakában, a Paddle saját domainjén zajlik; amit ez az ablak ott tárol (például egy biztonsági sütit és beállításokat), arra a Paddle adatvédelmi tájékoztatója vonatkozik.",
  zh: "付款在 Paddle 自有域名上的 Paddle 窗口中进行；该窗口在那里存储的内容（例如一个安全 Cookie 和一些设置）受 Paddle 隐私政策的约束。",
};

describe('LegalKitSection section="browser" variant="commercial" (0.59)', () => {
  const ENTRIES = ["your sign-in tokens"];

  it("says nothing of a checkout by default", () => {
    const { rerender } = render(<LegalKitSection section="browser" entries={ENTRIES} />);
    expect(section()?.textContent).not.toContain("Paddle");
    rerender(<LegalKitSection section="browser" variant="non-commercial" entries={ENTRIES} />);
    expect(section()?.textContent).not.toContain("Paddle");
    expect(section()).toHaveTextContent(B.tail);
  });

  it("the same lead and list, then the tail with the checkout's sentence, then the app's paragraph", () => {
    render(
      <LegalPage page="privacy" operator={OPERATOR}>
        <LegalKitSection section="controller" />
        <LegalKitSection section="browser" variant="commercial" entries={ENTRIES}>
          Signing out also removes the offline copy.
        </LegalKitSection>
      </LegalPage>,
    );
    expect(screen.getByRole("heading", { level: 2, name: `2. ${B.title}` })).toBeInTheDocument();
    // After the tail, not before it: "None of it is used to track you" and "All of it
    // disappears when you clear the site's data" are the app's promises about its list, and
    // the checkout's entries, on Paddle's domain, are not the app's to promise anything of.
    expect(section()?.textContent).toBe(
      `2. ${B.title}${B.lead}your sign-in tokens${B.commercial}Signing out also removes the offline copy.`,
    );
    expect(B.commercial).toBe(`${B.tail} ${CHECKOUT.en}`);
  });

  it("takes the provider's words, and English where a tree has no commercial text", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ legal: { sections: { privacy: { browser: { commercial: "Mit Bezahlfenster." } } } } }}>
        <LegalKitSection section="browser" variant="commercial" entries={ENTRIES} />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent("Mit Bezahlfenster.");
    rerender(
      <UiKitProvider
        labels={{ legal: { sections: { privacy: { browser: { title: "Browser", lead: "Vorn:", tail: "Hinten." } } } } }}
      >
        <LegalKitSection section="browser" variant="commercial" entries={ENTRIES} />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent(B.commercial ?? "");
  });

  it.each(Object.entries(CATALOGUES))("%s: no checkout by default; the commercial tail adds it", (code, make) => {
    const { lead, tail, commercial } = make().legal.sections.privacy.browser;
    expect(`${lead}${tail}`).not.toContain("Paddle");
    expect(commercial).toBeDefined();
    // Word for word the default tail, then the one sentence: the two cannot drift apart.
    expect(commercial!.startsWith(tail)).toBe(true);
    expect(commercial!.slice(tail.length).trim()).toBe(CHECKOUT[code]);
  });
});

describe("the browser section's standard entries (0.61, Marcel 2026-11-12)", () => {
  /** The shared-computer choice's name, as each catalogue's `sharedComputer.label` says it:
   *  the two lines quote the box the reader ticked. */
  const BOX: Record<string, string> = {
    en: "This is a shared computer",
    "de-CH": "Dies ist ein gemeinsam genutzter Computer",
    fr: "C’est un ordinateur partagé",
    it: "Questo è un computer condiviso",
    es: "Este es un ordenador compartido",
    hu: "Ez egy közös használatú számítógép",
    zh: "这是一台共用电脑",
  };

  it.each(Object.keys(CATALOGUES))("%s: the cache line names its hours and the box, the flag line the box", (lang) => {
    const labels = CATALOGUES[lang]!();
    const standard = labels.legal!.sections!.privacy!.browser!.standardEntries!;
    expect(labels.sharedComputer!.label).toBe(BOX[lang]);
    const cache = standard.recentData!(24);
    expect(cache).toContain("24");
    expect(cache).toContain(BOX[lang]);
    expect(standard.sharedComputer).toContain(BOX[lang]);
  });

  // 0.62 (Marcel 2026-11-13): an entry in an app's list, and no app's list (keksdose,
  // kastlan, Kurvenschmiede, in every language) closes an entry with a full stop.
  it.each(Object.keys(CATALOGUES))("%s: neither line closes with a full stop, as the apps' entries", (lang) => {
    const standard = CATALOGUES[lang]!().legal!.sections!.privacy!.browser!.standardEntries!;
    expect(standard.recentData!(24)).not.toMatch(/[.。]$/);
    expect(standard.sharedComputer).not.toMatch(/[.。]$/);
  });

  it("are entries the app places in its own list, as the kit words them", () => {
    const standard = B.standardEntries!;
    render(
      <LegalKitSection
        section="browser"
        entries={["your sign-in tokens", standard.recentData(24), standard.sharedComputer]}
      />,
    );
    const items = Array.from(section()!.querySelectorAll("li"), (li) => li.textContent);
    expect(items).toEqual([
      "your sign-in tokens",
      "Recently loaded data, so pages also open without a connection; what is older than 24 hours the app no longer uses and removes the next time it opens. None of it is kept when you sign in with “This is a shared computer”",
      // A flag in the tab's storage comes back with a reopened tab; the sign-in is in page memory.
      "Whether you chose “This is a shared computer” at sign-in, kept with the tab",
    ]);
  });
});
