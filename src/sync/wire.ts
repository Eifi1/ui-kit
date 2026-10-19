/*
 * The `/sync` wire as the engine speaks it: server-kit's `eifi1_server_kit.sync` shapes
 * (SyncRequest, SyncResponse, SyncRefusal, SyncRejection, SyncPageCursor; keksdose's, which
 * are canon, D10), plus kastlan's `pk` on a pulled change. Types only.
 */

/** One row's delta on the wire. */
export interface SyncWireChange {
  entity: string;
  id: string;
  op: "upsert" | "delete";
  data?: Record<string, unknown> | null;
  /** The device's edit time on a push (D2). */
  updated_at?: string | null;
  /** The server's id of the row, on a pull (kastlan). */
  pk?: number | null;
  knowledge?: number | null;
}

/** Where a paged pull stopped (server-kit `SyncPageCursor`); handed back as it came. */
export interface SyncPageCursor {
  entity: string;
  knowledge?: number | null;
  id?: string | null;
  window_end: number;
}

export interface SyncRequestBody {
  scope: string;
  last_knowledge: number;
  changes: SyncWireChange[];
  /** This client keeps refused changes and reads `refused` and `rejections` (D1). */
  refusals: true;
  /** The device's clock as the body is built, fresh for every request (D2 amendment). */
  client_now: string;
  paged?: boolean;
  page_cursor?: SyncPageCursor | null;
}

/** The WHOLE push refused (a lapsed plan): the pull is served all the same. */
export interface SyncRefusalBody {
  code: string;
  detail: string;
  change_ids: string[];
}

/** One pushed change the server did not apply, with its reason. */
export interface SyncRejectionBody {
  change_id: string;
  code: string;
  detail: string;
}

export interface SyncResponseBody {
  server_knowledge: number;
  changes: SyncWireChange[];
  refused?: SyncRefusalBody | null;
  rejections?: SyncRejectionBody[];
  /** Set while the pull did not fit one page; `null` on the last page (D12). */
  page_cursor?: SyncPageCursor | null;
}
