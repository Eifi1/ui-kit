import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { UiKitLabels } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";
import { DEFAULT_LEGAL_LABELS } from "../legal";
import { LegalKitSection } from "../legal-page";

/**
 * The privacy policy's "What your browser stores" (0.58; keksdose's legal audit against the
 * app, Marcel 2026-11-09, docs/legal-harmonization.md decision 10). Its tail said that
 * everything but the entries waiting to be sent "stays on your device", which read as
 * "never leaves it". The clause goes; what an account keeps on the server is each app's
 * to say, in its own sections.
 *
 * 0.59 (keksdose's scan for absolute claims, Marcel 2026-11-10, decision 10): the lead says
 * what the app sets, not that a page has no cookies at all.
 */

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
