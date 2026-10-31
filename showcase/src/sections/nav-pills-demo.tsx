import { useState } from "react";
import { Link } from "react-router";
import { ArrowDownUp, Hand, Inbox, ListChecks, Mail, Receipt, Settings } from "lucide-react";
import { NavPills, PageHeader, SectionNav } from "@eifi1/ui-kit";
import type { NavPillLinkProps } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * NavPills (0.11): a wrapping set of links or buttons, the current one filled and marked
 * `aria-current` — Tabs-like looks, not tabs.
 */

const routerPill = ({ href, ...props }: NavPillLinkProps) => <Link to={href} {...props} />;

type Surface = "inbox" | "transactions" | "receipts" | "notifications" | "settings" | "reorder";

export function NavPillsDemo() {
  const [surface, setSurface] = useState<Surface>("transactions");
  const [clicked, setClicked] = useState("—");
  const [size, setSize] = useState<"md" | "sm">("md");
  return (
    <>
      <Example
        label="NavPills — links through renderLink"
        hint='a <nav> landmark of links; the current page is aria-current="page"'
      >
        <NavPills
          aria-label="Chrome pages"
          current="page-structure"
          renderLink={routerPill}
          onSelect={(v) => setClicked(v)}
          items={[
            { value: "shell", label: "Shell", href: "/shell" },
            { value: "page-structure", label: "Page header", href: "/page-structure" },
            { value: "settings", label: "Settings", href: "/settings" },
            { value: "wizard", label: "Wizard", href: "/wizard" },
          ]}
        />
        <OutTable rows={[["onSelect (runs before the router follows the link)", clicked]]} />
        <div className="mt-3">
          <Note>
            Items with an <code className="font-mono">href</code> are links, rendered through{" "}
            <code className="font-mono">renderLink</code> (react-router&apos;s <code className="font-mono">Link</code>{" "}
            here — no reload). &ldquo;Page header&rdquo; is this page, so it is filled and carries{" "}
            <code className="font-mono">aria-current=&quot;page&quot;</code>, the default{" "}
            <code className="font-mono">currentType</code> for links. Every pill is its own tab stop and the set is a
            list: a reader hears &ldquo;navigation, list, 4 items&rdquo; — there is no tablist, no tabpanel and no arrow
            keys, because these are not tabs.
          </Note>
        </div>
      </Example>

      <Example
        label="NavPills — buttons with onSelect, icons, disabled, sizes and landmark={false}"
        hint="switching a panel on the same page; wraps rather than scrolls at phone width"
      >
        <Row className="mb-3">
          <span className="text-xs text-muted">size</span>
          <label className="flex items-center gap-1 text-sm text-secondary">
            <input type="radio" name="pills-size" checked={size === "md"} onChange={() => setSize("md")} /> md
          </label>
          <label className="flex items-center gap-1 text-sm text-secondary">
            <input type="radio" name="pills-size" checked={size === "sm"} onChange={() => setSize("sm")} /> sm
          </label>
        </Row>
        <div className="max-w-md">
          <NavPills<Surface>
            aria-label="Swipe surface"
            landmark={false}
            size={size}
            current={surface}
            onSelect={setSurface}
            items={[
              { value: "inbox", label: "Inbox", icon: Inbox },
              { value: "transactions", label: "Transactions", icon: ArrowDownUp },
              { value: "receipts", label: "Receipts", icon: Receipt },
              { value: "notifications", label: "Notifications", icon: Mail },
              { value: "settings", label: "Settings", icon: Settings },
              { value: "reorder", label: "Reorder (soon)", icon: ListChecks, disabled: true },
            ]}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-subtle p-3 text-sm text-secondary">
          <Hand className="size-4 shrink-0" aria-hidden />
          {/* One span, so the sentence is one flex item that wraps as text rather than three
              items that each wrap in their own column. */}
          <span>
            Swipe actions for <strong className="text-primary">{surface}</strong> would be set up here.
          </span>
        </div>
        <div className="mt-3">
          <Note>
            Items without an <code className="font-mono">href</code> are buttons that call{" "}
            <code className="font-mono">onSelect</code>; the current one says{" "}
            <code className="font-mono">aria-current=&quot;true&quot;</code>, because a panel on the same page is not a
            page. <code className="font-mono">landmark=&#123;false&#125;</code> renders a{" "}
            <code className="font-mono">&lt;div role=&quot;group&quot;&gt;</code> instead of a{" "}
            <code className="font-mono">&lt;nav&gt;</code> — this picker is not the page&apos;s navigation. An{" "}
            <code className="font-mono">icon</code> sits before each label; the last is{" "}
            <code className="font-mono">disabled</code>. The strip is capped at{" "}
            <code className="font-mono">max-w-md</code> and WRAPS onto a second row rather than scrolling sideways;{" "}
            <code className="font-mono">size=&quot;sm&quot;</code> is the compact ToggleGroup size.
          </Note>
        </div>
      </Example>
    </>
  );
}

const CHROME_PAGES = [
  { value: "shell", label: "Shell", href: "/shell" },
  { value: "page-structure", label: "Page header", href: "/page-structure" },
  { value: "settings", label: "Settings", href: "/settings" },
  { value: "notifications", label: "Notifications", href: "/notifications" },
  { value: "auth-account", label: "Auth & account", href: "/auth-account" },
  { value: "user-admin", label: "User admin", href: "/user-admin" },
  { value: "subscription", label: "Subscription", href: "/subscription" },
];

/** SectionNav (0.49 KIT-6): a section's pages on a phone, under the page title. */
export function SectionNavDemo() {
  return (
    <Example
      label="SectionNav — a section's pages on the phone"
      hint={'deprecated in 0.52, removed in 0.53 — no app renders it; `<NavPills layout="scroll">` is the same row'}
    >
      <div className="max-w-sm overflow-hidden rounded-md border border-subtle bg-page p-3">
        <PageHeader as="h2" title="Page header" description="App chrome" />
        <SectionNav
          label="App chrome"
          items={CHROME_PAGES}
          current="page-structure"
          renderLink={routerPill}
          phoneOnly={false}
          className="mt-2"
        />
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">SectionNav</code> is <code className="font-mono">NavPills</code> with{" "}
          <code className="font-mono">layout=&quot;scroll&quot;</code>: one line, faded where it is cut, every pill a
          link and its own tab stop, the open one <code className="font-mono">aria-current=&quot;page&quot;</code>. By
          default it shows below <code className="font-mono">md</code> only (
          <code className="font-mono">phoneOnly</code>), where the sidebar that lists the same pages is gone; this frame
          passes <code className="font-mono">phoneOnly={"{false}"}</code> so it shows at every width.
        </Note>
      </div>
    </Example>
  );
}
