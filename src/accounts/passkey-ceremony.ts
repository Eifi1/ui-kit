/**
 * The browser's half of a passkey ceremony, with no library (docs/auth-harmonization.md §12.9:
 * the sign-in's passkey, an added passkey). server-kit's begin answers the options as JSON —
 * py_webauthn's `options_to_json`, its binary fields base64url — and its finish takes the
 * authenticator's answer as JSON in the same encoding. Between them the browser speaks
 * `ArrayBuffer`s. The apps did this with `@simplewebauthn/browser` (Kurvenschmiede's
 * `passkeys.ts`, keksdose's `passkey-actions`); the kit takes no dependency for a dozen fields,
 * so it converts them itself, the same fields that library converts.
 *
 * What it deliberately does not do: keksdose's PRF extension (its private mode's key), and a
 * scoped sign-in by address. Both stay the app's.
 */

/** Whether a passkey can be used on this page at all. The API existing is not enough:
 *  WebAuthn runs only in a secure context — HTTPS, or `http://localhost` — and a dev server
 *  reached from a phone over a LAN address exposes the API while failing every ceremony at
 *  the last moment (keksdose's feedback #200). */
export function passkeysAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext === true &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator !== "undefined" &&
    typeof navigator.credentials?.get === "function"
  );
}

/** base64url (no padding) → bytes. */
function fromBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** bytes → base64url (no padding), as py_webauthn reads it. */
function toBase64Url(buffer: ArrayBuffer | ArrayBufferView | null | undefined): string | undefined {
  if (!buffer) return undefined;
  const bytes =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Json = Record<string, unknown>;
const isJson = (value: unknown): value is Json => typeof value === "object" && value !== null;

/** A credential descriptor's `id` in bytes; the rest as it came. */
function descriptors(list: unknown): PublicKeyCredentialDescriptor[] | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.filter(isJson).map((entry) => ({
    ...(entry as unknown as PublicKeyCredentialDescriptor),
    id: fromBase64Url(String(entry.id)),
  }));
}

/** @internal The sign-in's options, JSON → what `navigator.credentials.get` takes. */
export function requestOptionsFromJson(json: Json): PublicKeyCredentialRequestOptions {
  return {
    ...(json as unknown as PublicKeyCredentialRequestOptions),
    challenge: fromBase64Url(String(json.challenge)),
    allowCredentials: descriptors(json.allowCredentials),
  };
}

/** @internal An added passkey's options, JSON → what `navigator.credentials.create` takes. */
export function creationOptionsFromJson(json: Json): PublicKeyCredentialCreationOptions {
  const user = isJson(json.user) ? json.user : {};
  return {
    ...(json as unknown as PublicKeyCredentialCreationOptions),
    challenge: fromBase64Url(String(json.challenge)),
    user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: fromBase64Url(String(user.id)) },
    excludeCredentials: descriptors(json.excludeCredentials),
  };
}

/** @internal The authenticator's answer → the JSON server-kit's finish parses
 *  (`@simplewebauthn/browser`'s shape). */
export function credentialToJson(credential: PublicKeyCredential): Json {
  const response = credential.response as AuthenticatorResponse &
    Partial<AuthenticatorAssertionResponse> &
    Partial<AuthenticatorAttestationResponse>;
  const encoded: Json = { clientDataJSON: toBase64Url(response.clientDataJSON) };
  if (response.attestationObject) {
    encoded.attestationObject = toBase64Url(response.attestationObject);
    if (typeof response.getTransports === "function") encoded.transports = response.getTransports();
  } else {
    encoded.authenticatorData = toBase64Url(response.authenticatorData);
    encoded.signature = toBase64Url(response.signature);
    const userHandle = toBase64Url(response.userHandle);
    if (userHandle !== undefined) encoded.userHandle = userHandle;
  }
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: encoded,
    clientExtensionResults:
      typeof credential.getClientExtensionResults === "function" ? credential.getClientExtensionResults() : {},
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  };
}

/**
 * The person closed the browser's prompt, or let it time out: both arrive as a
 * `NotAllowedError`. Neither is a failure worth a red line — they chose not to, or walked
 * away — so it becomes an `AbortError`, which the kit's forms pass over in silence.
 */
function quietDismissal(error: unknown): unknown {
  return error instanceof Error && error.name === "NotAllowedError"
    ? new DOMException("Dismissed", "AbortError")
    : error;
}

/** @internal `navigator.credentials.get` on the server's JSON, answered as JSON. */
export async function passkeyAssertion(options: Json): Promise<Json> {
  try {
    const credential = await navigator.credentials.get({ publicKey: requestOptionsFromJson(options) });
    if (!credential) throw new DOMException("No passkey was chosen", "AbortError");
    return credentialToJson(credential as PublicKeyCredential);
  } catch (error) {
    throw quietDismissal(error);
  }
}

/** @internal `navigator.credentials.create` on the server's JSON, answered as JSON. */
export async function passkeyAttestation(options: Json): Promise<Json> {
  try {
    const credential = await navigator.credentials.create({ publicKey: creationOptionsFromJson(options) });
    if (!credential) throw new DOMException("No passkey was made", "AbortError");
    return credentialToJson(credential as PublicKeyCredential);
  } catch (error) {
    throw quietDismissal(error);
  }
}
