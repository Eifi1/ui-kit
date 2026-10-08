import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useHref, useLocation, useParams } from "react-router";
import {
  ALargeSmall,
  ArrowLeft,
  ArrowRight,
  Contrast,
  ListTree,
  MonitorSmartphone,
  PanelLeft,
  PanelRight,
  PanelRightOpen,
  Server,
} from "lucide-react";
import {
  AppShell,
  Button,
  ConfirmProvider,
  EmptyState,
  IconButton,
  LanguageMenu,
  LoadingState,
  OptionSwitcherMenu,
  PALETTES,
  PageContents,
  PageContentsLayout,
  PaletteMenu,
  ThemeToggle,
  Tooltip,
  Toaster,
  TopBar,
  TourProvider,
  UiKitProvider,
  useScrollSpy,
} from "@eifi1/ui-kit";
import type { AppShellNavItem, KitLinkComponent } from "@eifi1/ui-kit";
// 0.32: from the source until the barrel names them (the coordinator wires src/index.ts).
import { useAppearanceLabels } from "../../src/components/appearance-labels";
import { usePhoneLayout } from "../../src/hooks/use-breakpoint";
import { TEXT_SIZES, resolveTextSize } from "../../src/theme/text-size";
import type { TextSize } from "../../src/theme/text-size";
import { CONTRAST_MODES, resolveContrastMode } from "../../src/theme/contrast";
import type { ContrastMode } from "../../src/theme/contrast";
import { SectionBoundary } from "./lib/error-boundary";
import { DevicePreview, isEmbedded } from "./lib/device-preview";
import { useScrollRestoration } from "./lib/use-scroll-restoration";
import { serverModulesFor, serverPageOf } from "./server-kit/links";
import { ShowcaseSearch } from "./search/showcase-search";
import { GROUPS, HOME_SLUG, NAV, PAGES, RETIRED_SLUGS, groupOf, hasOverview } from "./routes";
import type { ShowcasePage } from "./routes";
import { LOCALE_OPTIONS, en, useGroupLabel, useLocale, usePageText, useT } from "./i18n";
import {
  useApplyContrast,
  useApplyPalette,
  useApplyTextSize,
  useApplyTheme,
  useContentsPosition,
  useContrastStore,
  usePalette,
  useSidebarStyle,
  useTextSizeStore,
  useTheme,
  URL_TEXT_SIZE,
} from "./stores";

/**
 * The navigation, translated.
 *
 * `routes.tsx` is the registry and stays in English: its labels and titles are the KEYS
 * the dictionaries are written against, so translating it in place would delete the only
 * stable identity a page has. The chrome translates on the way out instead — every
 * lookup here is tolerant, so a page added to `routes.tsx` this afternoon appears in
 * English in all seven languages rather than appearing as `undefined` in six.
 */
function useTranslatedNav(): AppShellNavItem[] {
  const t = useT();
  // Below `md` the sub-items are only ever rendered as the phone's row of page pills,
  // which WRAPS: a group of ten pages with their full titles ("Data table: server, URL &
  // phone") filled five lines over the content. There each pill takes the page's short
  // title instead. Above `md` the same items are the sidebar's, which has the room for
  // the full one — so the switch is by width, not a second list.
  const phone = usePhoneLayout();
  return useMemo(
    () =>
      NAV.map((item, i) => {
        // `NAV` is `GROUPS.map(...)`, so the index is exact; the `to` match is what keeps
        // it exact if that ever stops being true.
        const group =
          GROUPS.find((g) => `/${hasOverview(g) ? g.slug : g.pages[0].slug}` === item.to) ??
          GROUPS[i];
        const title = (slug: string) => t.pages[slug]?.title ?? en.pages[slug]?.title ?? slug;
        const short = (slug: string) =>
          t.pages[slug]?.short ?? en.pages[slug]?.short ?? title(slug);
        return {
          ...item,
          label: t.groups[group.label] ?? en.groups[group.label] ?? group.label,
          // `shortLabel` is a per-item override in routes.tsx ("App chrome" → "Chrome")
          // for the bottom bar, keyed in the dictionaries by the group's English label
          // like `groups` is. It used to be translated only when it happened to equal the
          // group's first page title, which left "Start", "Display" and "Chrome" English
          // in all seven languages.
          shortLabel: item.shortLabel
            ? (t.groupShort[group.label] ?? en.groupShort[group.label] ?? item.shortLabel)
            : undefined,
          items: item.items?.map((sub) => {
            const slug = sub.to.replace(/^\//, "");
            return { ...sub, label: phone ? short(slug) : title(slug) };
          }),
        };
      }),
    [t, phone],
  );
}

/**
 * The text size and the contrast, beside the theme and the palette (0.32,
 * docs/text-size-harmonization.md §8): the page's own stores, so every page can be read at
 * Large and Extra large and with More contrast. Inside the provider, so the menus speak
 * the page's language through the kit's `appearance` labels.
 */
function AppearanceSwitches() {
  const labels = useAppearanceLabels();
  const stored = resolveTextSize(useTextSizeStore((s) => s.size));
  // A preview frame shows the size it was loaded at (`?text-size=`, stores.ts).
  const size = URL_TEXT_SIZE ?? stored;
  const setSize = useTextSizeStore((s) => s.setSize);
  const contrast = resolveContrastMode(useContrastStore((s) => s.contrast));
  const setContrast = useContrastStore((s) => s.setContrast);
  return (
    <>
      <OptionSwitcherMenu<TextSize>
        icon={<ALargeSmall className="size-4" />}
        ariaLabel={labels.textSize}
        title={labels.textSize}
        heading={labels.textSize}
        options={TEXT_SIZES.map((value) => ({ value, label: labels.textSizes[value] }))}
        value={size}
        onSelect={setSize}
      />
      <OptionSwitcherMenu<ContrastMode>
        icon={<Contrast className="size-4" />}
        ariaLabel={labels.contrast}
        title={labels.contrast}
        heading={labels.contrast}
        options={CONTRAST_MODES.map((value) => ({ value, label: labels.contrastModes[value] }))}
        value={contrast}
        onSelect={setContrast}
      />
    </>
  );
}

export function Showcase() {
  useApplyTheme();
  useApplyPalette();
  // After the palette, so its tokens are stepped on the first effect pass too.
  useApplyTextSize();
  useApplyContrast();
  const mode = useTheme((s) => s.mode);
  const toggle = useTheme((s) => s.toggle);
  const paletteId = usePalette((s) => s.id);
  const setPaletteId = usePalette((s) => s.setId);
  const t = useT();
  const { code, setCode, tag } = useLocale();
  const nav = useTranslatedNav();
  const [sidebarStyle, setSidebarStyle] = useSidebarStyle();
  const [contentsPosition, setContentsPosition] = useContentsPosition();
  // Not persisted: a reader who reloads is reading, not comparing screen sizes.
  const [preview, setPreview] = useState(false);
  const embedded = useMemo(() => isEmbedded(), []);

  // `AppShell` scrolls an inner <main>, so the browser has no document scroll to
  // restore on Back. See use-scroll-restoration for what that costs and why.
  //
  // `useLayoutEffect`, and that is load-bearing: <main> belongs to AppShell, so the only
  // way to reach it is to query for it after render. Passive effects run in declaration
  // order, so a plain useEffect here — declared after the hook — assigned the ref AFTER
  // the hook had already looked at it, found null, and returned without attaching its
  // scroll listener. Layout effects run before every passive effect regardless of order.
  const mainRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    mainRef.current = document.querySelector("main");
  }, []);
  useScrollRestoration(mainRef);

  return (
    // The kit's half of the language switch. Every kit component below — the data
    // table's pager, the calendar inside its date filter, the sidebar's collapse
    // button — reads its words and its locale from here, so the sections do not thread
    // label props by hand. This one line is what a consuming app writes.
    <UiKitProvider labels={t.kit} locale={tag} linkComponent={RouterLink}>
    {/* Below the provider, so the tour card speaks the page's language. */}
    <TourProvider>
    {/* The one confirm host for every `useConfirm()` on every page — inside the
        UiKitProvider, so its Confirm/Cancel fallbacks follow the language menu. */}
    <ConfirmProvider>
    <AppShell
      nav={nav}
      subNav={sidebarStyle}
      // One scrolling row of section chips on a phone: the wrapped bar took ~130px of a
      // 390px screen on the long groups (showcase audit, decided 2026-09-27).
      mobileSubNavLayout="scroll"
      footer={
        <footer className="border-t border-[var(--border)] px-6 py-3 text-xs text-[var(--text-muted)]">
          {/* One translated sentence, not three fragments with markup between them. The
              paths used to be wrapped in <code>; word order is the first thing that moves
              between these seven languages, and a sentence interrupted by two elements is a
              sentence no translator can reorder. Losing the monospace is the cheaper half
              of that trade. */}
          {t.chrome.renderedFrom}
        </footer>
      }
      topBar={
        <TopBar
          brand={
            <Link
              to={`/${HOME_SLUG}`}
              className="truncate font-semibold text-[var(--text-primary)] hover:underline"
            >
              {/* `dir="ltr"` is load-bearing, not decoration. The brand is a Latin
                  package name inside a paragraph that is right-to-left on Arabic, and
                  the Unicode bidi algorithm treats the leading "@" as NEUTRAL: with no
                  strong left-to-right character before it, it adopts the paragraph's
                  direction and is reordered to the far end. Observed, not theorised —
                  it rendered "eifi1/ui-kit@". An identifier has a direction of its own
                  and has to declare it. */}
              <span dir="ltr">{t.chrome.brand}</span>
            </Link>
          }
          actions={
            <>
              {/* ⌘K / Ctrl K from anywhere: components, examples, and what a reader
                  needs in their own words — the kit's GlobalSearch, fed like an app feeds
                  it (see search/showcase-search.tsx). */}
              <ShowcaseSearch />
              <ThemeToggle
                mode={mode}
                onToggle={toggle}
                ariaLabel={t.chrome.toggleTheme}
                // Was "Dark"/"Light" — the current mode, which the sun/moon glyph already
                // says. The tooltip now names the ACTION, which is the half a translator
                // has words for and the half a screen-reader user needs.
                title={t.chrome.toggleTheme}
              />
              <PaletteMenu
                palettes={PALETTES}
                activeId={paletteId}
                mode={mode}
                onSelect={setPaletteId}
                ariaLabel={t.chrome.palette}
                heading={t.chrome.palette}
              />
              <AppearanceSwitches />
              {/* Driven by the locale registry, so adding a dictionary to `LOCALES` adds
                  it here. Each entry is labelled with its ENDONYM — a reader looking for
                  Arabic is looking for العربية, not for the English word "Arabic" they
                  cannot read. */}
              <LanguageMenu
                options={LOCALE_OPTIONS}
                current={code}
                onChange={setCode}
                ariaLabel={t.chrome.language}
              />
              <SidebarStyleToggle style={sidebarStyle} onChange={setSidebarStyle} />
              {/* Never inside a preview frame (it would nest), and only from `md`: on a
                  phone the reader already sees the phone layout. A labelled button, not
                  a bare icon — readers who never resize a window are who this is for. */}
              {!embedded && (
                <Tooltip label={t.chrome.devicePreview} side="bottom" portal className="hidden md:block">
                  <Button variant={preview ? "primary" : "ghost"} size="sm" aria-pressed={preview} onClick={() => setPreview((v) => !v)}>
                    <MonitorSmartphone aria-hidden className="size-4" />
                    <span className="max-lg:sr-only">{t.chrome.previewShort}</span>
                  </Button>
                </Tooltip>
              )}
              {/* Desktop-wide only, like the rail it moves. */}
              <span className="hidden xl:contents">
                <OptionSwitcherMenu
                  icon={contentsPosition === "start" ? <PanelLeft className="size-4" /> : <PanelRight className="size-4" />}
                  ariaLabel={t.chrome.contentsPosition}
                  title={t.chrome.contentsPosition}
                  heading={t.chrome.contentsPosition}
                  options={[
                    { value: "start", label: t.chrome.positionStart },
                    { value: "end", label: t.chrome.positionEnd },
                  ]}
                  value={contentsPosition}
                  onSelect={setContentsPosition}
                />
              </span>
            </>
          }
        />
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to={`/${HOME_SLUG}`} replace />} />
        <Route
          path="/:slug"
          element={
            <RetiredSlugRedirect>
              {preview ? <PreviewRoute onExit={() => setPreview(false)} /> : <PageRoute contentsPosition={contentsPosition} />}
            </RetiredSlugRedirect>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* The kit's toaster: its placement (bottom above the nav on a phone, top on
          desktop), z-index, tones and labels, and the theme read off <html> — inside
          UiKitProvider so the close button and the undo action speak the page's language. */}
      <Toaster />
    </AppShell>
    </ConfirmProvider>
    </TourProvider>
    </UiKitProvider>
  );
}

/**
 * The app's router link, handed to the kit ONCE through `UiKitProvider linkComponent` —
 * every kit link below (TextLink, ListItem, Breadcrumbs, Button `href`, ActionCard…)
 * then routes inside the HashRouter instead of reloading the page. The kit decides the
 * href and the attributes; this only maps `href` to react-router's `to`.
 *
 * The kit only hands it an in-app href: "/buttons", or the hash-router form "#/buttons"
 * a demo may write by hand (mapped to the route "/buttons" here). An external href and
 * an in-page "#anchor" never get here — every kit link draws those as a plain `<a>`
 * (`pickLinkRenderer`).
 */
const RouterLink: KitLinkComponent = ({ href, ...rest }) => (
  <Link to={href.startsWith("#/") ? href.slice(1) : href} {...rest} />
);

/**
 * Flyout ⇄ inline. The icon shows what a click switches TO, and the tooltip says it in
 * words; `aria-pressed` carries the state for a screen reader. Desktop only — the phone
 * bottom bar has no sub-items in either style.
 */
function SidebarStyleToggle({
  style,
  onChange,
}: {
  style: "flyout" | "inline";
  onChange: (next: "flyout" | "inline") => void;
}) {
  const t = useT();
  const inline = style === "inline";
  const label = t.kit.common.fieldValue(
    t.chrome.sidebarStyle,
    inline ? t.chrome.sidebarInline : t.chrome.sidebarFlyout,
  );
  return (
    // `portal`: this is the last control in the bar, flush with the window's right
    // edge. The CSS-only bubble is centred on its trigger and cannot move, so half of
    // it was off screen; the portalled one measures itself and is clamped inside.
    <Tooltip label={label} side="bottom" portal className="hidden md:block">
      <IconButton
        aria-label={t.chrome.sidebarInline}
        aria-pressed={inline}
        onClick={() => onChange(inline ? "flyout" : "inline")}
      >
        {inline ? <PanelRightOpen className="size-4" /> : <ListTree className="size-4" />}
      </IconButton>
    </Tooltip>
  );
}

/**
 * A slug retired by a page split (see `RETIRED_SLUGS` in routes.tsx) goes to the page
 * that took over its first specimens. `replace`, so Back does not bounce the reader into
 * the redirect again. The query and the `#anchor` ride along: an anchor whose section
 * moved to that first page still scrolls to it, and one that moved to a sibling page
 * lands at the top of the first — the showcase's own links were rewritten to the
 * precise page, so only links from outside take that road.
 */
function RetiredSlugRedirect({ children }: { children: ReactNode }) {
  const { slug } = useParams();
  const { search, hash } = useLocation();
  const target = slug ? RETIRED_SLUGS[slug] : undefined;
  if (target) return <Navigate to={{ pathname: `/${target}`, search, hash }} replace />;
  return <>{children}</>;
}

/** The preview replaces the page: the frames ARE the page, three times over. */
function PreviewRoute({ onExit }: { onExit: () => void }) {
  const { slug } = useParams();
  const { title } = usePageText(slug ?? "");
  return (
    <div className="w-full px-4 py-6 md:px-6">
      <h1 className="mb-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
      <DevicePreview onExit={onExit} />
    </div>
  );
}

function PageRoute({ contentsPosition }: { contentsPosition: "start" | "end" }) {
  const { slug } = useParams();
  const index = PAGES.findIndex((p) => p.slug === slug);
  if (index === -1) return <NotFound />;
  return <PageView page={PAGES[index]} index={index} contentsPosition={contentsPosition} />;
}

function PageView({
  page,
  index,
  contentsPosition,
}: {
  page: ShowcasePage;
  index: number;
  contentsPosition: "start" | "end";
}) {
  const prev = index > 0 ? PAGES[index - 1] : undefined;
  const next = index < PAGES.length - 1 ? PAGES[index + 1] : undefined;
  const group = groupOf(page.slug);
  const isOverview = group?.slug === page.slug;

  const t = useT();
  const { dir } = useLocale();
  const { title, blurb } = usePageText(page.slug);
  const groupLabel = useGroupLabel(group?.label ?? "");

  // Lucide's arrows are glyphs, not text: `dir="rtl"` reverses the row they sit in but
  // cannot reverse the arrows themselves, so "previous" would point away from previous.
  // Swapping the component is the whole fix on this side of the boundary — the kit's own
  // chevrons are not this file's to change.
  const PrevArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    // Two columns from `xl`: the page, and the contents rail beside it — on the side
    // picked in the top bar. Below that the rail would squeeze the specimens, so the
    // same list folds into a disclosure under the title instead.
    <PageContentsLayout
      key={page.slug}
      position={contentsPosition}
      contents={<PageContentsRail />}
      className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6"
    >
      <nav aria-label={t.chrome.breadcrumb} className="text-xs text-[var(--text-muted)]">
        {isOverview || !group ? (
          <span className="text-[var(--text-secondary)]">{groupLabel || title}</span>
        ) : (
          <>
            {/* The group links to its overview when it has one — the breadcrumb's
                parent is a place, not a caption. */}
            {hasOverview(group) ? (
              <Link to={`/${group.slug}`} className="hover:text-[var(--text-secondary)] hover:underline">
                {groupLabel}
              </Link>
            ) : (
              groupLabel
            )}{" "}
            <span aria-hidden>/</span> <span className="text-[var(--text-secondary)]">{title}</span>
          </>
        )}
      </nav>

      <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{blurb}</p>
      <ServerSideLinks slug={page.slug} />

      <PageContentsMenu />

      {/* The prose inside a section is English and deliberately stays English — it is
          developer documentation about the kit's internals, which the scope note in
          i18n/types.ts puts out of translation. Marking it `ltr` is therefore CORRECT
          rather than a workaround: content declares the direction it is actually
          written in. Inheriting `rtl` from the page put the full stop of every English
          sentence on the left. The chrome around it stays in the document direction. */}
      <div className="mt-8 space-y-10" dir="ltr">
        <SectionBoundary title={title}>
          {/* Every section is its own chunk (lib/lazy-section.ts). Inside the boundary,
              so a chunk that fails to load is a red box naming the page, not a blank. */}
          <Suspense fallback={<LoadingState size="lg" data-page-loading="" />}>
            <page.Body />
          </Suspense>
        </SectionBoundary>
      </div>

      <nav
        aria-label={t.chrome.pagination}
        // Two equal columns, not `justify-between`: in a flex row the two links shrank
        // together and both titles truncated ("Buttons & surf…") with the room between
        // them unused. Each side now owns half the row and wraps inside it.
        className="mt-12 grid grid-cols-2 items-center gap-4 border-t border-[var(--border)] pt-6"
      >
        {prev ? (
          <PagerLink
            to={`/${prev.slug}`}
            kicker={t.chrome.previous}
            slug={prev.slug}
            arrow={<PrevArrow className="size-4 shrink-0" aria-hidden />}
            arrowFirst
          />
        ) : (
          <span />
        )}
        {next && (
          <PagerLink
            to={`/${next.slug}`}
            kicker={t.chrome.next}
            slug={next.slug}
            arrow={<NextArrow className="size-4 shrink-0" aria-hidden />}
          />
        )}
      </nav>
    </PageContentsLayout>
  );
}

/**
 * Under a kit page's title: the server-kit modules it is the client half of, each a link
 * to its entry in the Server kit group — the kit side of the cross-links, from the one map
 * in server-kit/links.ts that the server pages' "Kit counterparts" read too. Here, in the
 * frame, so no section file has to remember it; nothing at all on a page with no server
 * half.
 */
function ServerSideLinks({ slug }: { slug: string }) {
  const t = useT();
  const links = serverModulesFor(slug).flatMap((module) => {
    const page = serverPageOf(module);
    return page ? [{ module, to: `/${page}#${module}` }] : [];
  });
  if (links.length === 0) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
      <Server aria-hidden className="size-3.5 shrink-0" />
      <span>{t.chrome.serverSide}</span>
      {links.map(({ module, to }) => (
        // A module name is an identifier: never translated, always left-to-right.
        <Link
          key={module}
          to={to}
          dir="ltr"
          className="rounded border border-[var(--border)] bg-[var(--bg-surface-2)] px-1.5 py-px font-mono text-caption text-[var(--brand)] hover:underline"
        >
          {module}
        </Link>
      ))}
    </p>
  );
}

/** One side of the pager. Extracted only so the neighbour's title can be looked up by
 *  slug — `usePageText` is a hook, and the two sides used to be inline JSX. */
function PagerLink({
  to,
  kicker,
  slug,
  arrow,
  arrowFirst,
}: {
  to: string;
  kicker: string;
  slug: string;
  arrow: ReactNode;
  arrowFirst?: boolean;
}) {
  const { title } = usePageText(slug);
  const label = (
    <span className="min-w-0">
      <span className="block text-caption text-[var(--text-muted)]">{kicker}</span>
      {/* Two lines before an ellipsis: a title is a few words, and half a phone row is
          about fifteen characters. */}
      <span className="line-clamp-2">{title}</span>
    </span>
  );
  return (
    <Link
      to={to}
      // `text-end`, not `text-right`: the trailing side of the pager is the right in
      // English and the left in Arabic, and only the logical property knows which.
      className={`group flex min-w-0 items-center gap-2 text-sm text-[var(--brand)] hover:underline${
        arrowFirst ? " justify-self-start" : " justify-self-end text-end"
      }`}
    >
      {arrowFirst ? arrow : label}
      {arrowFirst ? label : arrow}
    </Link>
  );
}

/**
 * The in-page contents, built by READING THE DOM rather than from a registry.
 *
 * Each section file owns its own `<Example label>` headings, and there is no list of
 * them anywhere — a registry would be a second source of truth that drifts the first
 * time somebody adds an example. Reading the rendered headings cannot drift.
 *
 * The entry text is therefore NOT translated, and deliberately so: those headings are
 * the section prose, which is developer documentation about the kit's internals and is
 * out of scope for the same reason the rest of that prose is. The landmark's accessible
 * name is translated, because that one is chrome.
 *
 * It used to be a sticky row of chips above the page. That covered the content it was
 * an index of — on a long page the chips wrapped to four rows, a fifth of the screen —
 * and field labels scrolling under it printed over the chips. A rail BESIDE the content
 * covers nothing, shows every entry at once, and has room to mark where you are.
 */
function usePageSections(): {
  items: Array<{ id: string; label: string }>;
  current: string | null;
} {
  const [items, setItems] = useState<Array<{ id: string; label: string }>>([]);
  const location = useLocation();
  const [main, setMain] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // After paint: the sections render their headings as children, so they do not
    // exist when this component's own effect first runs in the same commit.
    const frame = requestAnimationFrame(() => {
      const headings = [...document.querySelectorAll<HTMLElement>("main h3[id]")];
      setItems(headings.map((h) => ({ id: h.id, label: h.textContent?.trim() ?? "" })));
      setMain(document.querySelector("main"));
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const current = useScrollSpy(ids, { root: main });
  return { items, current };
}

/** The kit's `PageContents`, fed from the DOM. Links come from the ROUTER: under
 *  HashRouter the URL's hash is the route, so a bare `#id` navigated to the path `/id`
 *  and showed "No such page"; the router answers `#/page#id`, and use-scroll-restoration
 *  scrolls a location's hash into view. */
function useSectionHref(): (id: string) => string {
  const base = useHref("");
  const { pathname } = useLocation();
  // `useHref` cannot be called per entry inside a map, so build the same string it
  // would: the router's href for this path, plus the entry's hash.
  const path = useHref(pathname);
  return useCallback((id: string) => `${path || base}#${id}`, [path, base]);
}

function PageContentsRail() {
  const { items, current } = usePageSections();
  const hrefFor = useSectionHref();
  if (items.length < 2) return null;
  return <PageContents items={items} activeId={current} hrefFor={hrefFor} />;
}

/** Below `xl`, where the rail is not rendered: the same list, folded under the title. */
function PageContentsMenu() {
  const { items, current } = usePageSections();
  const hrefFor = useSectionHref();
  if (items.length < 2) return null;
  return (
    <PageContents
      variant="disclosure"
      items={items}
      activeId={current}
      hrefFor={hrefFor}
      className="mt-5 xl:hidden"
    />
  );
}

function NotFound() {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 md:px-6">
      <EmptyState title={t.chrome.notFoundTitle} hint={t.chrome.notFoundHint} />
      <div className="mt-4 flex justify-center">
        <Link to={`/${HOME_SLUG}`} className="text-sm text-[var(--brand)] hover:underline">
          {t.chrome.backToStart}
        </Link>
      </div>
    </div>
  );
}
