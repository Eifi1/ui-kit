/**
 * The address tag: `you@example.com` → `you+kastlan@example.com`, the app's own name as
 * a sub-address of the address a person types for themselves (docs/auth-harmonization.md
 * §4.5, Marcel 2026-10-05). Lifted from keksdose (`features/auth/email-tag.ts`, feedback
 * dev#481), where the tag was the constant `keksdose`; here it is the app's.
 *
 * **Structurally valid is not the same as deliverable.** `+` is an ordinary character in
 * the local part under RFC 5322, and sub-addressing — `user+tag@host` delivered to
 * `user@host` — is specified (RFC 5233). But it is specified as a convention the
 * RECEIVING server may implement: Gmail, Outlook, iCloud, Fastmail and Proton do; many
 * Exchange installs, small hosters and corporate filters do not, and some web forms
 * refuse the character outright.
 *
 * Which is why every caller OFFERS the result and never applies it. Silently registering
 * somebody as `you+kastlan@example.com` would send the verification mail — the one
 * message the account depends on — down a delivery path nobody checked, and make the
 * address they sign in with one they never typed. The tag is a convenience for the
 * person who wants it: one click, with the exact resulting address on the button
 * (`RegisterForm` does this with its `emailTag`).
 *
 * The tagged address is then the identity. The server trims and lower-cases an address
 * at every entry and never strips a tag, so `you@…` and `you+kastlan@…` are two
 * different accounts; sign-in stays exact (§4.5), which is why `SignInForm`'s hint after
 * a failed sign-in names the tagged address rather than trying it.
 *
 * Offer it only where a person types an address FOR THEMSELVES — sign-up, a later email
 * change in the profile — never in a field for someone else's (an invite dialog, a
 * share), where the tag would be a guess about another person's mail server.
 */

/** What a tag may be: the app's name, lower case — letters, digits, `.`, `_`, `-`. A
 *  space, `@` or `+` would make the result something other than a sub-address. */
const TAG_SHAPE = /^[a-z0-9][a-z0-9._-]*$/;

/**
 * `taggedEmail("you@example.com", "kastlan")` → `"you+kastlan@example.com"`, or `null`
 * when there is nothing to offer:
 *
 *  - the address is not complete enough to split — no local part, no domain, or a
 *    domain without an inner dot (the shape the field's own `type="email"` accepts), so
 *    the offer cannot appear before the address is plausible or linger once it stops
 *    being one;
 *  - the address already carries a `+` — the person's own scheme wins, and stacking a
 *    second tag on it would be wrong;
 *  - the tag is empty or not a plain name (see `TAG_SHAPE`).
 *
 * The tag is the app's name in lower case (`keksdose`, `kastlan`, `kurvenschmiede`); it
 * is trimmed and lower-cased here, so `"Kastlan"` gives the same answer. The address is
 * trimmed and otherwise kept as typed — normalising it is the server's job (server-kit's
 * `normalise_email`).
 */
export function taggedEmail(email: string, tag: string): string | null {
  const name = tag.trim().toLowerCase();
  if (!TAG_SHAPE.test(name)) return null;
  const parts = emailParts(email);
  if (!parts || parts.local.includes("+")) return null;
  return `${parts.local}+${name}@${parts.domain}`;
}

/**
 * The trimmed address split at its last `@`, or `null` while it is not complete enough
 * to split: no local part, no domain, or a domain without an inner dot — the shape the
 * field's own `type="email"` accepts.
 *
 * @internal `RegisterForm` gates its submit on it; not part of the barrel.
 */
export function emailParts(email: string): { local: string; domain: string } | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return null;
  return { local, domain };
}
