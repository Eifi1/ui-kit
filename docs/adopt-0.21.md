# Adopting `@eifi1/ui-kit` 0.21

One addition, from keksdose's feedback run 71 (dev #585, Marcel). Opt-in; nothing changes
on the bump. `CHANGELOG.md` → `0.21.0` has the release notes.

## Everyone

1. Bump to `^0.21.0` by hand; a caret below 1.0 locks the minor version.

## New, opt-in

| Area | API |
|---|---|
| TopBarActionMenu (keksdose dev #585) | `href` — the trigger becomes the router's link (`aria-haspopup="menu"`, `aria-expanded`, named by `ariaLabel`): a click or Enter follows it and shuts the panel, hover still opens the list after the usual delay, ↓/↑ on the focused trigger still open it onto the first/last row. A tap on a phone follows the link, so point it where everything in the menu is reachable. Works with `icon`, `iconBadge` and a custom `trigger`. `HoverMenu`'s `trigger` render prop also gets `close` |

## keksdose

- The guided-tours compass (`features/tour/tour-menu.tsx`): `href="/tours"` on its
  `TopBarActionMenu`. "All tours" can stay as the last row (the keyboard path to it).
