import { useState } from "react";
import { ChevronDown, KeyRound, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { Chip, MenuItem, TopBarActionMenu, UserAvatar } from "@eifi1/ui-kit";
import type { TopBarMenuEntry } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * The ACCOUNT MENU built from `TopBarActionMenu` (0.11): an avatar `trigger` carrying a
 * `UserAvatar` badge, an identity `header`, entries with a danger row, a checked choice
 * and a current link, free `children` rows, and a legal `footer` in a named `<nav>`.
 */

type Theme = "light" | "dark";
type Workspace = "household" | "business";

function AccountMenu() {
  const [unread, setUnread] = useState(3);
  const [theme, setTheme] = useState<Theme>("light");
  const [workspace, setWorkspace] = useState<Workspace>("household");
  const [compact, setCompact] = useState(false);
  const [align, setAlign] = useState<"end" | "start">("end");
  const [chosen, setChosen] = useState("—");

  const entries: TopBarMenuEntry[] = [
    {
      kind: "link",
      key: "profile",
      icon: <User className="size-4" />,
      label: "Profile",
      to: "/settings",
    },
    {
      kind: "link",
      key: "shell",
      icon: <Settings className="size-4" />,
      label: "This page (Shell)",
      to: "/shell",
      current: true,
    },
    { kind: "divider", key: "d1" },
    {
      key: "light",
      icon: <Sun className="size-4" />,
      label: "Light",
      checked: theme === "light",
      onSelect: () => {
        setTheme("light");
        setChosen("theme → light");
      },
    },
    {
      key: "dark",
      icon: <Moon className="size-4" />,
      label: "Dark",
      checked: theme === "dark",
      onSelect: () => {
        setTheme("dark");
        setChosen("theme → dark");
      },
    },
    {
      key: "compact",
      label: "Compact tables",
      checkable: "checkbox",
      checked: compact,
      onSelect: () => {
        setCompact((v) => !v);
        setChosen(`compact tables → ${!compact}`);
      },
    },
    {
      key: "read",
      label: "Mark notifications read",
      trailing: unread > 0 ? <Chip size="xs">{unread}</Chip> : undefined,
      disabled: unread === 0,
      onSelect: () => {
        setUnread(0);
        setChosen("marked read");
      },
    },
    { kind: "divider", key: "d2" },
    {
      key: "signout",
      icon: <LogOut className="size-4" />,
      label: "Sign out",
      tone: "danger",
      onSelect: () => setChosen("Sign out"),
    },
  ];

  return (
    <Example
      label="TopBarActionMenu — an account menu"
      hint="avatar trigger with a badge, identity header, choices, a danger row, children rows and a legal footer"
    >
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">align</span>
        <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
          <input type="radio" name="account-align" checked={align === "end"} onChange={() => setAlign("end")} /> end
        </label>
        <label className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
          <input type="radio" name="account-align" checked={align === "start"} onChange={() => setAlign("start")} /> start
        </label>
        <button
          type="button"
          className="text-sm text-[var(--brand)] underline"
          onClick={() => setUnread((n) => n + 1)}
        >
          one more notification
        </button>
      </Row>
      <div className={`flex rounded-md border border-[var(--border)] bg-[var(--bg-surface-2)] p-2 ${align === "end" ? "justify-end" : "justify-start"}`}>
        <TopBarActionMenu
          ariaLabel="Account menu"
          align={align}
          triggerClassName="w-auto gap-1 rounded-full px-1"
          trigger={({ open }) => (
            <>
              <UserAvatar
                name="Marcel Eifert"
                email="marcel@example.com"
                badge={unread > 0 ? { label: `${unread} unread` } : null}
              />
              <ChevronDown
                aria-hidden
                className={`size-4 text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
              />
            </>
          )}
          header={{
            title: "Marcel Eifert",
            subtitle: "marcel@example.com",
            extra: (
              <Chip size="xs" tone="info">
                Owner
              </Chip>
            ),
          }}
          entries={entries}
          footerLabel="Legal"
          footer={(close) => (
            <>
              <a href="#/shell" onClick={close}>
                Privacy
              </a>
              <a href="#/shell" onClick={close}>
                Terms
              </a>
              <a href="#/shell" onClick={close}>
                Imprint
              </a>
            </>
          )}
          panelClassName="w-64"
        >
          {(close) => (
            <>
              <li className="my-1 border-t border-[var(--border)]" />
              {(["household", "business"] as const).map((w) => (
                <li key={w}>
                  <MenuItem
                    icon={KeyRound}
                    checked={workspace === w}
                    onClick={() => {
                      setWorkspace(w);
                      setChosen(`workspace → ${w}`);
                      close();
                    }}
                  >
                    {w === "household" ? "Household budget" : "Business budget"}
                  </MenuItem>
                </li>
              ))}
            </>
          )}
        </TopBarActionMenu>
      </div>
      <OutTable
        rows={[
          ["last chosen", chosen],
          ["theme (checked radio rows)", theme],
          ["compact tables (checkbox row)", String(compact)],
          ["workspace (children rows)", workspace],
          ["trigger's accessible name", `Account menu${unread > 0 ? ` ${unread} unread` : ""}`],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">trigger</code> draws the face INSIDE the kit&apos;s button, so the wiring stays —{" "}
          <code className="font-mono">aria-haspopup</code>, <code className="font-mono">aria-expanded</code>, the
          keyboard — and <code className="font-mono">open</code> turns the chevron. The button is named by{" "}
          <code className="font-mono">ariaLabel</code> plus the face&apos;s readable text, so the badge&apos;s
          &ldquo;3 unread&rdquo; is heard. <code className="font-mono">triggerClassName</code> rounds it round the
          avatar. The <code className="font-mono">header</code> is text, not a row: ↑/↓ skip it. Entries are{" "}
          <code className="font-mono">MenuItem</code>s — a <code className="font-mono">current</code> link (this page),
          radio-checked theme rows, a <code className="font-mono">checkable: &quot;checkbox&quot;</code> row, a disabled
          row once everything is read, and the <code className="font-mono">danger</code> sign-out.{" "}
          <code className="font-mono">children</code> adds rows the data cannot describe (the workspace switcher, given{" "}
          <code className="font-mono">close</code>). The <code className="font-mono">footer</code> is a{" "}
          <code className="font-mono">&lt;nav aria-label=&quot;Legal&quot;&gt;</code> (<code className="font-mono">footerLabel</code>):
          its links are not menu rows — the arrows skip them and Tab reaches them without closing the panel.{" "}
          <code className="font-mono">align</code> picks the edge of the trigger the panel lines up with.
        </Note>
      </div>
    </Example>
  );
}

export function AccountMenuDemo() {
  return <AccountMenu />;
}
