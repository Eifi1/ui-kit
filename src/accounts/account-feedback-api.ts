import type { FeedbackPublicApi, FeedbackPublicRequest } from "../feedback/feedback-public-page";
import type {
  FeedbackComment,
  FeedbackPublicListItem,
  FeedbackPublicRecord,
  FeedbackVoteState,
} from "../feedback/feedback-public-types";
import type { FeedbackRecord } from "../feedback/feedback-record";
import type { FeedbackDetailPatch } from "../feedback/feedback-row-detail";
import type { FeedbackCreatePayload } from "../feedback/feedback-submit";
import type { FeedbackStatus } from "../feedback/feedback-vocabulary";
import type { AccountsHttp, AccountsRequest } from "./accounts-client";

/**
 * The routes of server-kit 0.31's `feedback_router` (docs/feedback-harmonization.md in this
 * repository, the contract's routes and nothing of an app's own), typed once on the account
 * client's `http` — its bearer and refresh in place. Kurvenschmiede's and keksdose's
 * `feedbackApi`, which each wrote out route by route. Its own module, not `client.api`: the
 * feedback pages load where they are drawn, not with every sign-in.
 *
 * Files go up first, one per request, and a report names the URLs that came back, so a
 * report never names a file that did not arrive.
 */
export interface AccountFeedbackApi<T extends FeedbackRecord = FeedbackRecord> extends FeedbackPublicApi {
  /** `GET /feedback/my`: the caller's own reports, an admin's too. */
  mine(): Promise<T[]>;
  /** `GET /feedback`: every report, with its author's address — the admin's inbox. */
  all(): Promise<T[]>;
  /** `POST /feedback/attachments`: one file, before the report names it → its URL. */
  upload(file: Blob): Promise<string>;
  /** A file a report names, through the session: an `<img src>` would send no bearer. */
  file(url: string, init?: { signal?: AbortSignal }): Promise<Blob>;
  /** `POST /feedback`. */
  create(payload: FeedbackCreatePayload): Promise<T>;
  /** `PATCH /feedback/{id}`: the admin's triage or the author's own edit; the server decides
   *  what the caller may send. */
  update(patch: FeedbackDetailPatch): Promise<T>;
  /** `POST /feedback/{id}/replies`: the admin's answer, the status it moves the report to, and
   *  at most one file. Answers the whole report with its replies. */
  reply(id: number, body: string, status?: FeedbackStatus, attachmentUrl?: string): Promise<T>;
  /** `POST /feedback/{id}/rework`: the author sends an answered report back. */
  rework(id: number, body: string, attachmentUrl?: string): Promise<T>;
  /** `GET /feedback/public`: the titles everybody the server admits may read, sorted, searched
   *  and paged on the server. */
  publicList(request: FeedbackPublicRequest): Promise<FeedbackPublicListItem[]>;
  /** `GET /feedback/public/{id}`: one public report with its replies. */
  publicOne(id: number): Promise<FeedbackPublicRecord>;
}

/** The path part of the base URL (`/api/v1` of `https://site/api/v1`). */
function basePath(baseURL: string | undefined): string {
  if (!baseURL) return "";
  try {
    return new URL(baseURL, "http://x").pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/** The feedback routes on the account client's instance: `accountFeedbackApi(client.http)`. */
export function accountFeedbackApi<T extends FeedbackRecord = FeedbackRecord>(
  http: AccountsHttp,
): AccountFeedbackApi<T> {
  const send = async <R>(request: AccountsRequest): Promise<R> => (await http.request(request)).data as R;
  const call = <R>(method: AccountsRequest["method"], url: string, data?: unknown) => send<R>({ method, url, data });
  // A file's URL names its route under the API's prefix already (`/api/v1/feedback/…`), and
  // the instance would put its base URL in front of it again: the prefix comes off.
  const prefix = basePath(http.defaults?.baseURL);
  const withAttachment = (body: string, attachmentUrl?: string) =>
    attachmentUrl ? { body, attachment_url: attachmentUrl } : { body };
  return {
    mine: () => call("get", "/feedback/my"),
    all: () => call("get", "/feedback"),
    upload: async (file) => {
      const form = new FormData();
      form.append("file", file);
      // No Content-Type of the client's: the browser sets the multipart boundary.
      const answer = await send<{ url: string }>({
        method: "post",
        url: "/feedback/attachments",
        data: form,
        headers: { "Content-Type": undefined },
      });
      return answer.url;
    },
    file: (url, init) =>
      send<Blob>({
        method: "get",
        url: prefix && url.startsWith(`${prefix}/`) ? url.slice(prefix.length) : url,
        responseType: "blob",
        signal: init?.signal,
      }),
    create: (payload) => call("post", "/feedback", payload),
    update: ({ id, ...patch }) => call("patch", `/feedback/${id}`, patch),
    reply: (id, body, status, attachmentUrl) =>
      call("post", `/feedback/${id}/replies`, {
        ...withAttachment(body, attachmentUrl),
        ...(status ? { status } : {}),
      }),
    rework: (id, body, attachmentUrl) => call("post", `/feedback/${id}/rework`, withAttachment(body, attachmentUrl)),
    publicList: ({ sort, q, limit, offset }) =>
      send({
        method: "get",
        url: "/feedback/public",
        params: { sort, limit, offset, ...(q ? { q } : {}) },
      }),
    publicOne: (id) => call("get", `/feedback/public/${id}`),
    comments: (id) => call<FeedbackComment[]>("get", `/feedback/${id}/comments`),
    comment: (id, body, attachmentUrl) => call("post", `/feedback/${id}/comments`, withAttachment(body, attachmentUrl)),
    hideComment: (id, commentId, hidden) => call("patch", `/feedback/${id}/comments/${commentId}`, { hidden }),
    deleteComment: async (id, commentId) => {
      await call("delete", `/feedback/${id}/comments/${commentId}`);
    },
    vote: (id, next) => call<FeedbackVoteState>(next ? "put" : "delete", `/feedback/${id}/vote`),
  };
}
