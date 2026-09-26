import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Star, Trash2 } from "lucide-react";
import {
  AuthedImage,
  Button,
  IconButton,
  ImageGrid,
  Lightbox,
  Switch,
  ToggleGroup,
  useAuthedSrc,
} from "@eifi1/ui-kit";
import type { AuthedFetcher, ImageItem } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * MEDIA — the photo grid, the viewer it opens, and the image that fetches itself with
 * the app's credentials. Everything on this page is generated here: the "photos" are
 * SVG scenes, the "floor plan" is a one-page PDF written out by hand, and the "API" is
 * a function that waits and then answers — so nothing leaves the machine.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const code = (s: string) => <code className="font-mono">{s}</code>;

/* ── Generated media ─────────────────────────────────────────────────────── */

/** A landscape-ish scene as SVG markup: a sky gradient, two hills, a sun, a title. */
function sceneSvg(title: string, from: string, to: string, hill: string, w = 640, h = 480): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.1}" fill="#fff" fill-opacity="0.8"/>
<path d="M0 ${h * 0.75} Q ${w * 0.25} ${h * 0.5} ${w * 0.5} ${h * 0.72} T ${w} ${h * 0.65} V ${h} H 0 Z" fill="${hill}"/>
<path d="M0 ${h * 0.88} Q ${w * 0.4} ${h * 0.7} ${w} ${h * 0.9} V ${h} H 0 Z" fill="${hill}" fill-opacity="0.6"/>
<text x="${w / 2}" y="${h - 28}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(Math.min(w, h) / 10)}" fill="#fff">${title}</text>
</svg>`;
}

const svgUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const SCENES = [
  { key: "kitchen", title: "Kitchen", from: "#f59e0b", to: "#fde68a", hill: "#92400e" },
  { key: "bath", title: "Bathroom", from: "#0ea5e9", to: "#bae6fd", hill: "#075985" },
  { key: "hall", title: "Hallway", from: "#8b5cf6", to: "#ddd6fe", hill: "#4c1d95" },
  { key: "balcony", title: "Balcony", from: "#10b981", to: "#a7f3d0", hill: "#065f46" },
  { key: "cellar", title: "Cellar (tall)", from: "#64748b", to: "#e2e8f0", hill: "#1e293b", w: 360, h: 640 },
] as const;

/** A one-page PDF, written out by hand. No xref table: every viewer rebuilds one. */
const PDF_SOURCE = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 52>>stream
BT /F1 24 Tf 60 150 Td (Floor plan, level 2) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`;

let pdfObjectUrl: string | null = null;
/** An object URL for the PDF, made once and kept for the page's life — `data:` URLs
 *  cannot be opened in a new tab, and jsdom (the render test) has no createObjectURL. */
function pdfUrl(): string {
  if (pdfObjectUrl) return pdfObjectUrl;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "floor-plan.pdf";
  try {
    pdfObjectUrl = URL.createObjectURL(new Blob([PDF_SOURCE], { type: "application/pdf" }));
  } catch {
    // Node's createObjectURL refuses jsdom's Blob — the render test only needs a string.
    return "floor-plan.pdf";
  }
  return pdfObjectUrl;
}

function publicItems(): ImageItem[] {
  return [
    ...SCENES.map((s) => ({
      key: s.key,
      src: svgUrl(sceneSvg(s.title, s.from, s.to, s.hill, "w" in s ? s.w : 640, "h" in s ? s.h : 480)),
      alt: `${s.title}, inspection photo`,
      caption: s.key === "cellar" ? "Damp patch, north wall" : `${s.title} · 12 Mar`,
      fileName: `${s.key}.svg`,
    })),
    {
      key: "plan",
      src: pdfUrl(),
      alt: "Floor plan, level 2",
      mimeType: "application/pdf",
      fileName: "floor-plan-level-2.pdf",
      caption: "Floor plan (PDF)",
    },
  ];
}

/* ── ImageGrid ───────────────────────────────────────────────────────────── */

function ImageGridSpecimen() {
  const initial = useMemo(() => publicItems(), []);
  const [items, setItems] = useState<ImageItem[]>(initial);
  const [starred, setStarred] = useState<string | null>("kitchen");
  const [aspect, setAspect] = useState<"square" | "video" | "auto">("square");
  const [loop, setLoop] = useState(false);
  const [zoom, setZoom] = useState(true);
  const [download, setDownload] = useState(true);
  const [ownDownload, setOwnDownload] = useState(false);
  const [log, setLog] = useState("—");

  return (
    <Example
      label="ImageGrid — actions, captions and a PDF tile"
      hint="click a tile to open the built-in Lightbox; the actions sit beside the open button, never inside it"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-xs text-[var(--text-muted)]">aspect</span>
          <ToggleGroup<"square" | "video" | "auto">
            ariaLabel="aspect"
            value={aspect}
            onChange={setAspect}
            options={[
              { value: "square", label: "square" },
              { value: "video", label: "video" },
              { value: "auto", label: "auto" },
            ]}
          />
        </div>
        <Switch label="lightbox.loop" checked={loop} onCheckedChange={setLoop} />
        <Switch label="lightbox.zoom" checked={zoom} onCheckedChange={setZoom} />
        <Switch label="lightbox.download" checked={download} onCheckedChange={setDownload} />
        <Switch
          label="lightbox.onDownload"
          description="The app's own download instead of a link"
          checked={ownDownload}
          onCheckedChange={setOwnDownload}
        />
      </div>
      <div className="mt-4">
        <ImageGrid
          items={items}
          aspect={aspect}
          minTileSize={112}
          renderActions={(item) => {
            const key = String(item.key);
            return (
              <>
                <IconButton
                  variant="overlay"
                  size="xs"
                  label={starred === key ? `Cover photo: ${item.alt}` : `Make ${item.alt} the cover`}
                  aria-pressed={starred === key}
                  onClick={() => {
                    setStarred(key);
                    setLog(`cover → ${key}`);
                  }}
                >
                  <Star className={starred === key ? "fill-current" : undefined} />
                </IconButton>
                <IconButton
                  variant="overlay"
                  size="xs"
                  label={`Delete ${item.alt}`}
                  onClick={() => {
                    setItems((all) => all.filter((i) => i.key !== item.key));
                    setLog(`deleted ${key}`);
                  }}
                >
                  <Trash2 />
                </IconButton>
              </>
            );
          }}
          lightbox={{
            loop,
            zoom,
            download,
            onDownload: ownDownload
              ? (item, index) => setLog(`onDownload(${item.fileName ?? item.alt}, ${index})`)
              : undefined,
          }}
        />
      </div>
      <Row className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setItems(initial);
            setLog("reset");
          }}
        >
          <RotateCcw className="size-4" aria-hidden /> Restore all six
        </Button>
        <span className={READOUT}>
          {items.length} items · last: {log}
        </span>
      </Row>
      <div className="mt-3 space-y-2">
        <Note>
          The PDF is known to be a file from its {code("mimeType")} (or a {code(".pdf")} in the URL, or —
          fetched — the type the server sent), so its tile is an icon and a name, and in the viewer it is a
          card with &ldquo;Open in new tab&rdquo; and the download. Delete the picture that is open behind the
          viewer and the viewer clamps to the set that is left.
        </Note>
        <Note>
          Responsive by default: {code("repeat(auto-fill, minmax(min(112px, 100%), 1fr))")} — three across
          on a phone, six on a desktop, no breakpoint chosen. {code("columns")} fixes the count instead.
        </Note>
      </div>
    </Example>
  );
}

/* ── Lightbox on its own ─────────────────────────────────────────────────── */

function LightboxSpecimen() {
  const items = useMemo(() => publicItems(), []);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rtl, setRtl] = useState(false);
  const [changes, setChanges] = useState<number[]>([]);

  return (
    <Example
      label="Lightbox — keys, swipe, zoom, download and a PDF card"
      hint="controlled: the index lives in the caller's state, so it could as well live in the URL"
    >
      <div dir={rtl ? "rtl" : undefined}>
        <Row>
          <Button
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
          >
            Open at the first photo
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIndex(items.length - 1);
              setOpen(true);
            }}
          >
            Open the PDF
          </Button>
          <Switch label="dir=rtl around it" checked={rtl} onCheckedChange={setRtl} />
        </Row>
        <Lightbox
          open={open}
          onClose={() => setOpen(false)}
          items={items}
          index={index}
          onIndexChange={(i) => {
            setIndex(i);
            setChanges((c) => [...c.slice(-5), i]);
          }}
        />
      </div>
      <p className={`mt-3 ${READOUT}`}>
        open: {String(open)} · index: {index} · onIndexChange: [{changes.join(", ")}]
      </p>
      <div className="mt-3 space-y-2">
        <Note>
          ← / → page (swapped when the viewer was rendered in a right-to-left subtree — flip the switch and
          try it), Home and End jump to the ends, Escape and Back close. On a touch screen a horizontal swipe
          of 50px or more pages; a mostly vertical drag is left to scroll. Double-click the picture, or press
          the zoom button, to see it at its natural size and pan by scrolling — the tall cellar photo shows
          it best. Paging resets the zoom.
        </Note>
        <Note>
          Built on {code("FullBleedDialog")}: the focus trap, the scroll lock and the history entry that makes
          Back close it are that component&apos;s, not re-implemented here.
        </Note>
      </div>
    </Example>
  );
}

/* ── The fake API ───────────────────────────────────────────────────────── */

const API_PHOTOS: Record<string, string> = {
  "/api/photos/1": sceneSvg("Protected: meter", "#be123c", "#fecdd3", "#4c0519"),
  "/api/photos/2": sceneSvg("Protected: boiler", "#0f766e", "#99f6e4", "#042f2e"),
  "/api/photos/2/thumb": sceneSvg("thumb: boiler", "#0f766e", "#99f6e4", "#042f2e", 160, 120),
};

type FetchLog = { url: string; outcome: string };

/**
 * An `AuthedFetcher` over the object above: waits `delay` ms, then answers with a Blob,
 * or rejects with "HTTP 404" / "HTTP 401". It honours `signal`, as a real one should.
 * `/api/photos/flaky` fails every other call — for `retry`.
 */
function useFakeFetcher(delay: number, onLog: (entry: FetchLog) => void) {
  const delayRef = useRef(delay);
  const logRef = useRef(onLog);
  useEffect(() => {
    delayRef.current = delay;
    logRef.current = onLog;
  });
  const flaky = useRef(0);
  return useMemo<AuthedFetcher>(
    () =>
      (url, { signal }) =>
        new Promise<Blob>((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => {
            settled = true;
            if (url === "/api/photos/flaky") {
              flaky.current += 1;
              if (flaky.current % 2 === 1) {
                logRef.current({ url, outcome: "HTTP 503" });
                reject(new Error("HTTP 503"));
                return;
              }
              logRef.current({ url, outcome: "200 image/svg+xml" });
              resolve(new Blob([sceneSvg("Second time lucky", "#2563eb", "#bfdbfe", "#1e3a8a")], { type: "image/svg+xml" }));
              return;
            }
            if (url === "/api/files/plan.pdf") {
              logRef.current({ url, outcome: "200 application/pdf" });
              resolve(new Blob([PDF_SOURCE], { type: "application/pdf" }));
              return;
            }
            if (url === "/api/photos/secret") {
              logRef.current({ url, outcome: "HTTP 401" });
              reject(new Error("HTTP 401"));
              return;
            }
            const svg = API_PHOTOS[url];
            if (!svg) {
              logRef.current({ url, outcome: "HTTP 404" });
              reject(new Error("HTTP 404"));
              return;
            }
            logRef.current({ url, outcome: "200 image/svg+xml" });
            resolve(new Blob([svg], { type: "image/svg+xml" }));
          }, delayRef.current);
          signal.addEventListener("abort", () => {
            // The hook aborts on every URL change, including after a finished fetch.
            if (settled) return;
            clearTimeout(timer);
            logRef.current({ url, outcome: "aborted" });
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    [],
  );
}

const DELAYS = [
  { value: "300", label: "300 ms" },
  { value: "1500", label: "1.5 s" },
  { value: "4000", label: "4 s" },
];

function AuthedImageSpecimen() {
  const [delay, setDelay] = useState("1500");
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<FetchLog[]>([]);
  const fetcher = useFakeFetcher(Number(delay), (entry) => setLog((l) => [...l.slice(-5), entry]));

  const gridItems: ImageItem[] = [
    { key: "a", src: "/api/photos/1", alt: "Meter reading" },
    { key: "b", src: "/api/photos/2", thumbnailSrc: "/api/photos/2/thumb", alt: "Boiler", caption: "thumbnailSrc" },
    { key: "c", src: "/api/photos/404", alt: "Deleted photo", caption: "404" },
    { key: "d", src: "/api/files/plan.pdf", mimeType: "application/pdf", alt: "Plan", fileName: "plan.pdf", caption: "PDF, fetched" },
  ];

  return (
    <Example
      label="AuthedImage — a fake fetcher with a delay and an error"
      hint="the app's authenticated GET goes in; a skeleton, the picture or a 'couldn't load' tile comes out"
    >
      <Row>
        <span className="text-xs text-[var(--text-muted)]">delay</span>
        <ToggleGroup ariaLabel="delay" value={delay} onChange={setDelay} options={DELAYS} />
        <Button variant="secondary" size="sm" onClick={() => setRound((r) => r + 1)}>
          <RotateCcw className="size-4" aria-hidden /> Fetch again
        </Button>
      </Row>
      <div key={round} className="mt-4 space-y-4">
        <div className="grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          <figure className="space-y-1">
            <AuthedImage src="/api/photos/1" alt="Meter" fetcher={fetcher} wrapperClassName="aspect-[4/3] w-full" className="h-full w-full rounded-md object-cover" />
            <figcaption className={READOUT}>200</figcaption>
          </figure>
          <figure className="space-y-1">
            <AuthedImage src="/api/photos/2" alt="Boiler" fetcher={fetcher} link wrapperClassName="aspect-[4/3] w-full" className="h-full w-full rounded-md object-cover" />
            <figcaption className={READOUT}>200 · link</figcaption>
          </figure>
          <figure className="space-y-1">
            <AuthedImage src="/api/photos/404" alt="Deleted photo" fetcher={fetcher} wrapperClassName="aspect-[4/3] w-full" className="h-full w-full rounded-md object-cover" />
            <figcaption className={READOUT}>404</figcaption>
          </figure>
          <figure className="space-y-1">
            <AuthedImage
              src="/api/photos/secret"
              alt="Someone else's photo"
              fetcher={fetcher}
              wrapperClassName="aspect-[4/3] w-full"
              className="h-full w-full rounded-md object-cover"
              errorFallback={
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-[var(--border)] p-2 text-center text-xs text-[var(--text-muted)]">
                  errorFallback: not yours to see
                </div>
              }
            />
            <figcaption className={READOUT}>401 · errorFallback</figcaption>
          </figure>
        </div>
        <ImageGrid items={gridItems} fetcher={fetcher} minTileSize={96} />
      </div>
      <ol className={`mt-3 space-y-0.5 ${READOUT}`} aria-label="Fetch log">
        {log.length === 0 ? <li>no fetch finished yet</li> : log.map((e, i) => <li key={i}>{e.url} → {e.outcome}</li>)}
      </ol>
      <div className="mt-3 space-y-2">
        <Note>
          {code("fetcher(url, { signal })")} resolves to a {code("Blob")} (axios with{" "}
          {code('responseType: "blob"')}) or a {code("Response")} (plain fetch, whose {code("ok")} is
          checked). The object URL is made when the bytes arrive and revoked when the URL changes or the
          image unmounts. {code("link")} wraps the picture in a link to its {code("blob:")} URL — the only
          address of a protected image a new tab can open. The same fetcher drives the grid below it and its
          lightbox, where the PDF opens as a file card.
        </Note>
      </div>
    </Example>
  );
}

function UseAuthedSrcSpecimen() {
  const [url, setUrl] = useState<string | null>("/api/photos/flaky");
  const [enabled, setEnabled] = useState(true);
  const [log, setLog] = useState<FetchLog[]>([]);
  const fetcher = useFakeFetcher(800, (entry) => setLog((l) => [...l.slice(-3), entry]));
  const { src, status, error, type, retry } = useAuthedSrc(url, { fetcher, enabled });

  return (
    <Example
      label="useAuthedSrc — status, type and retry"
      hint="the hook under AuthedImage and the lightbox, for a caller that draws its own"
    >
      <Row>
        <ToggleGroup<string>
          ariaLabel="url"
          value={url ?? "null"}
          onChange={(v) => setUrl(v === "null" ? null : v)}
          options={[
            { value: "/api/photos/flaky", label: "flaky" },
            { value: "/api/photos/1", label: "photo 1" },
            { value: "/api/files/plan.pdf", label: "PDF" },
            { value: "null", label: "null" },
          ]}
        />
        <Switch label="enabled" checked={enabled} onCheckedChange={setEnabled} />
        <Button variant="secondary" size="sm" onClick={retry}>
          retry()
        </Button>
      </Row>
      <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-hover)]">
          {status === "ready" && src && type?.startsWith("image/") ? (
            <img src={src} alt="Fetched" className="h-full w-full object-cover" />
          ) : status === "ready" && src ? (
            <a href={src} target="_blank" rel="noreferrer" className="text-sm text-[var(--brand)] underline">
              Open the {type || "file"}
            </a>
          ) : (
            <span className={READOUT}>{status}</span>
          )}
        </div>
        <dl className={`space-y-1 ${READOUT}`}>
          <div>status: {status}</div>
          <div>type: {String(type)}</div>
          <div>src: {src ? `${src.slice(0, 28)}…` : "null"}</div>
          <div>error: {error ? String((error as Error).message ?? error) : "—"}</div>
          <div>fetches: {log.map((e) => e.outcome).join(" · ") || "—"}</div>
        </dl>
      </div>
      <div className="mt-3">
        <Note>
          &ldquo;flaky&rdquo; answers 503 on every other call: it fails first, and {code("retry()")} fetches the
          same URL again and succeeds. {code("type")} is the blob&apos;s MIME type, which is how a caller that
          does not know whether a path is a picture or a PDF finds out. {code("enabled: false")} holds the fetch
          (a lightbox slide off screen); a {code("null")} URL is {code('"idle"')}.
        </Note>
      </div>
    </Example>
  );
}

export function MediaDemo() {
  return (
    <>
      <ImageGridSpecimen />
      <LightboxSpecimen />
      <AuthedImageSpecimen />
      <UseAuthedSrcSpecimen />
    </>
  );
}
