// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  FEEDBACK_ATTACHMENT_ACCEPT,
  FEEDBACK_AUTHOR_EDITABLE_STATUSES,
  FEEDBACK_AWAITING_STATUSES,
  FEEDBACK_PICKABLE_CATEGORIES,
  FEEDBACK_REWORKABLE_STATUSES,
  appendRework,
  attachmentName,
  feedbackAttachmentLine,
  isImageAttachment,
  replaceDescription,
  reworkCount,
  splitBodyAttachments,
  splitDescription,
  type FeedbackRecord,
} from "../feedback-record";
import { FEEDBACK_STATUS_ORDER } from "../feedback-inbox";

/**
 * The feedback contract's body format (docs/feedback-harmonization.md §3.4) and its
 * constants (§3.5, §4.3). The `splitBodyAttachments` / `reworkCount` cases are keksdose's
 * own (`features/feedback/__tests__/body-attachments.test.ts`, `rework-count.test.ts`),
 * kept as they were so the kit's helpers answer the same questions the same way; the rest
 * is what the contract added: kastlan's keys, its folded comments, the editor's split.
 */

const A = "/api/v1/feedback/attachments";
// kastlan's storage keys: `<uuid32>_<sha12>.<ext>` (§3.5) — no fixed hex shape.
const KASTLAN_KEY = `${A}/0123456789abcdef0123456789abcdef_0123456789ab.png`;
const NOW = new Date("2026-10-04T09:12:34.567Z");

describe("splitBodyAttachments (keksdose live #291)", () => {
  it("leaves an ordinary body exactly as it was", () => {
    const body = "broken\n\n--- REWORK 2026-09-08 15:01 ---\nstill broken";
    expect(splitBodyAttachments(body)).toEqual({ text: body, urls: [] });
  });

  it("lifts the marker lines out of the prose, in order", () => {
    const body = [
      "broken",
      `[screenshot] ${A}/one.png`,
      "",
      "--- REWORK 2026-09-08 15:01 ---",
      "still broken",
      `[screenshot] ${A}/two.png`,
    ].join("\n");
    const { text, urls } = splitBodyAttachments(body);
    expect(urls).toEqual([`${A}/one.png`, `${A}/two.png`]);
    expect(text).toBe("broken\n\n--- REWORK 2026-09-08 15:01 ---\nstill broken");
  });

  it("ignores anything that is not the app's own attachment path", () => {
    const body = [
      "[screenshot] https://example.com/evil.png",
      "the [screenshot] shows it",
      `[screenshot] ${A}/ok.png and then some`,
    ].join("\n");
    expect(splitBodyAttachments(body).urls).toEqual([]);
    expect(splitBodyAttachments(body).text).toBe(body);
  });

  it("round-trips what the composer writes", () => {
    const url = `${A}/abc123.webp`;
    const { text, urls } = splitBodyAttachments(`note\n${feedbackAttachmentLine(url)}`);
    expect(urls).toEqual([url]);
    expect(text).toBe("note");
  });

  it("reads kastlan's keys too — the key is opaque, never a fixed hex shape", () => {
    expect(splitBodyAttachments(`note\n[screenshot] ${KASTLAN_KEY}`).urls).toEqual([KASTLAN_KEY]);
  });
});

describe("reworkCount (keksdose live #331)", () => {
  it("counts the composer's rule lines", () => {
    expect(reworkCount("just a report")).toBe(0);
    expect(reworkCount("report\n\n--- REWORK 2026-09-16 03:57 ---\nagain")).toBe(1);
    expect(
      reworkCount("report\n\n--- REWORK 2026-09-14 20:16 ---\none\n\n--- REWORK 2026-09-16 03:57 ---\ntwo"),
    ).toBe(2);
  });

  it("cannot be impersonated by something a user writes", () => {
    expect(reworkCount("I did a REWORK of my budget --- honestly")).toBe(0);
    expect(reworkCount("see --- REWORK --- in the middle of a sentence and more")).toBe(0);
  });

  it("never counts kastlan's folded comment blocks (§7.7)", () => {
    const body = "report\n\n--- COMMENT 2026-09-01 10:00 · Example Ltd ---\nseen it\n\n--- REWORK 2026-09-02 11:00 ---\nagain";
    expect(reworkCount(body)).toBe(1);
  });

  it("reads a body whose rework brought a file with it", () => {
    const body = `report\n\n--- REWORK 2026-09-16 03:57 ---\nstill wrong\n${feedbackAttachmentLine(`${A}/abc123.webp`)}`;
    expect(reworkCount(body)).toBe(1);
    expect(splitBodyAttachments(body).urls).toEqual([`${A}/abc123.webp`]);
  });
});

describe("appendRework (§3.4)", () => {
  it("appends a UTC-stamped block after a blank line, keeping the old body byte for byte", () => {
    const body = "Chart jumps on save  ";
    const next = appendRework(body, "  still jumps \n", undefined, NOW);
    expect(next).toBe("Chart jumps on save  \n\n--- REWORK 2026-10-04 09:12 ---\nstill jumps");
    // A strict extension of the old body is what the server recognises as an append.
    expect(next?.startsWith(body)).toBe(true);
    expect(reworkCount(next ?? "")).toBe(1);
  });

  it("leaves the blank line out when the body is empty", () => {
    expect(appendRework("", "note", null, NOW)).toBe("--- REWORK 2026-10-04 09:12 ---\nnote");
  });

  it("writes one file line under the note, which the readers find again", () => {
    const next = appendRework("report", "see this", KASTLAN_KEY, NOW) ?? "";
    expect(next).toBe(`report\n\n--- REWORK 2026-10-04 09:12 ---\nsee this\n[screenshot] ${KASTLAN_KEY}`);
    expect(splitBodyAttachments(next)).toEqual({
      text: "report\n\n--- REWORK 2026-10-04 09:12 ---\nsee this",
      urls: [KASTLAN_KEY],
    });
  });

  it("stamps in UTC whatever the clock's zone", () => {
    // 23:30 in UTC−5 is the next day in UTC.
    const late = new Date("2026-10-04T23:30:00-05:00");
    expect(appendRework("", "n", undefined, late)).toBe("--- REWORK 2026-10-05 04:30 ---\nn");
  });

  it("returns null for an empty note — a file alone cannot be sent", () => {
    expect(appendRework("report", "", undefined, NOW)).toBeNull();
    expect(appendRework("report", "  \n\t", `${A}/x.png`, NOW)).toBeNull();
  });

  it("throws on a file URL that is not an attachment of the contract's shape", () => {
    expect(() => appendRework("report", "note", "https://example.com/x.png", NOW)).toThrow(TypeError);
    expect(() => appendRework("report", "note", `${A}/../etc/passwd`, NOW)).toThrow(TypeError);
  });
});

describe("splitDescription / replaceDescription (§4.4.1)", () => {
  const body = [
    "The chart jumps.",
    "",
    "Second paragraph.",
    `[screenshot] ${A}/first.png`,
    "",
    "--- COMMENT 2026-09-01 10:00 · Example Ltd ---",
    "seen it",
    "",
    "--- REWORK 2026-09-02 11:00 ---",
    "still jumps",
    `[screenshot] ${A}/second.png`,
  ].join("\n");

  it("holds only the original description, without its file lines", () => {
    const { description, appended } = splitDescription(body);
    expect(description).toBe("The chart jumps.\n\nSecond paragraph.");
    expect(appended).toBe(body.slice(body.indexOf("--- COMMENT")));
  });

  it("puts the file lines and every appended block back unchanged", () => {
    const next = replaceDescription(body, "  The chart jumps on save.  ");
    expect(next).toBe(
      [
        "The chart jumps on save.",
        `[screenshot] ${A}/first.png`,
        "",
        body.slice(body.indexOf("--- COMMENT")),
      ].join("\n"),
    );
    expect(reworkCount(next)).toBe(1);
    expect(splitBodyAttachments(next).urls).toEqual([`${A}/first.png`, `${A}/second.png`]);
  });

  it("gives back a canonical body unchanged", () => {
    expect(replaceDescription(body, splitDescription(body).description)).toBe(body);
    const reworked = appendRework("desc", "note", `${A}/x.png`, NOW) ?? "";
    expect(replaceDescription(reworked, splitDescription(reworked).description)).toBe(reworked);
  });

  it("reads a title-only report that was reworked", () => {
    const reworked = appendRework("", "note", undefined, NOW) ?? "";
    expect(splitDescription(reworked)).toEqual({ description: "", appended: reworked });
    expect(replaceDescription(reworked, "")).toBe(reworked);
    expect(replaceDescription(reworked, "now with words")).toBe(`now with words\n\n${reworked}`);
  });

  it("clears to the empty body when there is nothing else", () => {
    expect(splitDescription("only this")).toEqual({ description: "only this", appended: "" });
    expect(replaceDescription("only this", "   ")).toBe("");
  });

  it("does not take a rule-like sentence for a block", () => {
    const prose = "it says --- REWORK --- somewhere\nand more";
    expect(splitDescription(prose)).toEqual({ description: prose, appended: "" });
  });
});

describe("attachment URLs", () => {
  it("tells pictures from downloads by the key's extension", () => {
    for (const ext of ["png", "jpg", "jpeg", "webp", "gif", "PNG"]) expect(isImageAttachment(`${A}/k.${ext}`)).toBe(true);
    for (const ext of ["pdf", "txt", "svg"]) expect(isImageAttachment(`${A}/k.${ext}`)).toBe(false);
    expect(isImageAttachment(KASTLAN_KEY)).toBe(true);
  });

  it("names a file by its key", () => {
    expect(attachmentName(`${A}/1ed84e1bc3c7.webp`)).toBe("1ed84e1bc3c7.webp");
    expect(attachmentName(KASTLAN_KEY)).toBe("0123456789abcdef0123456789abcdef_0123456789ab.png");
  });
});

describe("the contract's constants", () => {
  it("accepts images, a PDF and a text log — no SVG, no HTML", () => {
    expect(FEEDBACK_ATTACHMENT_ACCEPT).toEqual([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "application/pdf",
      "text/plain",
    ]);
  });

  it("never offers CRASH as a pick", () => {
    expect(FEEDBACK_PICKABLE_CATEGORIES).toEqual(["BUG", "IDEA", "QUESTION", "OTHER"]);
  });

  it("splits the statuses by who may act on them", () => {
    expect(FEEDBACK_AUTHOR_EDITABLE_STATUSES).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(FEEDBACK_REWORKABLE_STATUSES).toEqual(["IN_EVALUATION", "NEEDS_LIVE_TEST", "POSTPONED", "DONE", "WONT_DO"]);
    expect(FEEDBACK_AWAITING_STATUSES).toEqual(["IN_EVALUATION", "NEEDS_LIVE_TEST"]);
    // Author-editable and reworkable together are every status, and never overlap.
    expect([...FEEDBACK_AUTHOR_EDITABLE_STATUSES, ...FEEDBACK_REWORKABLE_STATUSES].sort()).toEqual(
      [...FEEDBACK_STATUS_ORDER].sort(),
    );
    expect(Object.isFrozen(FEEDBACK_REWORKABLE_STATUSES)).toBe(true);
  });

  it("takes an app's own row with extra fields as a FeedbackRecord", () => {
    const kastlanRow = {
      id: 1,
      user_id: null,
      title: "Example",
      body: "",
      category: "BUG" as const,
      status: "OPEN" as const,
      context: { route: "/x", viewport: "390x844", company_hint: 3 },
      screenshot_url: null,
      outcome: null,
      resolved_at: null,
      created_at: "2026-10-04T09:12:00Z",
      updated_at: "2026-10-04T09:12:00Z",
      company_id: 9,
      user_name: "Example Ltd",
    };
    const row: FeedbackRecord = kastlanRow;
    expect(row.attachment_urls ?? []).toEqual([]);
  });
});
