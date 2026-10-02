import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LegalLayout, LegalSection, TextLink, ToggleGroup } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * The legal pages' shell (0.19, harmonisation H10): keksdose's and kastlan's two copies,
 * once, for every app. The texts here are placeholders; an app's are its own.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

// Every link points at this page, so the demo never leaves it; in an app each is a route.
const HERE = "/auth-account";
const LINKS = [
  { href: HERE, label: "Imprint" },
  { href: `${HERE}?legal=privacy`, label: "Privacy Policy" },
  { href: `${HERE}?legal=terms`, label: "Terms" },
];

export function Legal019Demo() {
  const [notice, setNotice] = useState<"draft" | "none">("draft");
  return (
    <Example label="LegalLayout — Imprint, Privacy Policy, Terms" hint="a content column inside the app's own chrome; the texts stay the app's">
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Notice"
          value={notice}
          onChange={(v) => setNotice(v as "draft" | "none")}
          options={[
            { value: "draft", label: "Draft notice" },
            { value: "none", label: "No notice" },
          ]}
        />
        <div className="rounded-lg border border-[var(--border)]">
          <LegalLayout
            headingAs="h2"
            className="py-6"
            title="Imprint"
            back={
              <TextLink href={HERE} icon={ArrowLeft}>
                Back to the start page
              </TextLink>
            }
            notice={notice === "draft" ? "Closed beta: these texts are a draft and await a lawyer's review." : undefined}
            links={LINKS}
            currentHref={HERE}
          >
            <LegalSection headingAs="h3" heading="Provider" body={"Acme Books GmbH\nExample Street 1\n8000 Zurich, Switzerland"} />
            <LegalSection headingAs="h3" heading="Contact" body={"hello@acme-books.example\n+41 00 000 00 00"} />
            <LegalSection headingAs="h3" id="legal-demo-responsible" heading="Responsible for content">
              Erika Muster, address as above. See also the{" "}
              <TextLink href={`${HERE}?legal=privacy`}>Privacy Policy</TextLink>.
            </LegalSection>
          </LegalLayout>
        </div>
        <Note>
          {code("LegalLayout")} is a column, not a page: keksdose puts it inside its landing header and footer,
          kastlan inside {code('<AuthLayout width="wide" card={false}>')} — whose footer then takes{" "}
          {code("<LegalLinks links currentHref nav={false} />")}, since AuthLayout names its own {code("<nav>")}.{" "}
          {code("notice")} is per page (a {code('role="note"')} banner, not an alert); {code("LegalSection")} keeps a
          translation&apos;s line breaks in {code("body")} and takes children for links. Review the texts under the{" "}
          {code("legal")} area of the translation review.
        </Note>
      </div>
    </Example>
  );
}
