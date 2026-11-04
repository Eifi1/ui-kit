import { useSyncExternalStore } from "react";

/**
 * Does this device have a camera to take a photo WITH? keksdose's `useHasCamera`
 * (shared/hooks/use-has-camera.ts:28, live #292 round three: *"If there is no device to
 * take a photo can the take photo button be hidden? … If they do not have a web cam?"*),
 * for every app — kastlan's handover photo buttons offer the camera on a desktop that has
 * none (kastlan reuse audit 2026-11-02, proposal 8).
 *
 * `navigator.mediaDevices.enumerateDevices()` is the only honest answer there is. It
 * reports the PRESENCE of a video input without a permission: the spec hides a device's
 * label and id until the camera is granted, not the device, so counting `videoinput`
 * entries asks the user nothing and opens no prompt. A webcam plugged in later fires
 * `devicechange`, which asks again.
 *
 * **It fails OPEN, as keksdose's does.** Every answer that is not a positive "no" keeps
 * the camera: no `mediaDevices` at all (an insecure context — `http://` on a LAN address
 * is how the apps are developed), an `enumerateDevices` that rejects (a permissions
 * policy), and — the one place this goes further than keksdose — a list with nothing in
 * it whatever its kind: a device with no camera still has a speaker or a microphone to
 * list, so an empty list is a browser declining to say (older WebKit, a hardened
 * privacy mode), not a device without one. Hiding the control that opens the camera
 * because the browser would not say takes the feature away from the phone it is for;
 * showing it on a desktop that cannot use it costs one tap.
 *
 * **Cached**, unlike keksdose's: one answer for the page, shared by every button that
 * asks. The first to mount asks the browser and listens for `devicechange`; the rest
 * read the answer, and a button mounted later starts from it — so a desktop with no
 * webcam does not show "Take photo" for a frame on every page that has the button.
 * When the last one unmounts the listener goes, and the next first mount asks again (a
 * camera may have come or gone in between). Before an answer, on the server and in
 * jsdom (which has no `mediaDevices`), it is `true`.
 *
 * What it does not answer is whether a file input's `capture` will be HONOURED — a
 * desktop Chrome with a webcam reports a video input and then ignores `capture`. That is
 * why {@link CameraButton} opens the camera with `getUserMedia`, not with `capture`.
 */
export function useHasCamera(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

/** The last answer: `undefined` until there is one, or when the browser would not say. */
let known: boolean | undefined;
const listeners = new Set<() => void>();
/** The `MediaDevices` the `devicechange` listener is on, while anyone listens. */
let watched: MediaDevices | null = null;

function settle(next: boolean | undefined) {
  if (next === known) return;
  known = next;
  for (const listener of listeners) listener();
}

function ask() {
  const media = watched;
  if (!media) return;
  media.enumerateDevices().then(
    (devices) => {
      // An answer that arrives after the last listener left still counts: it is about
      // the device, and the next mount starts from it.
      settle(devices.length === 0 ? undefined : devices.some((d) => d.kind === "videoinput"));
    },
    // A refusal is not an absence — see "fails open" above.
    () => settle(undefined),
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    const media = typeof navigator === "undefined" ? undefined : navigator.mediaDevices;
    if (media && typeof media.enumerateDevices === "function") {
      watched = media;
      media.addEventListener?.("devicechange", ask);
      ask();
    } else {
      // Nothing to ask: an unknown, whatever an earlier page (or test) found.
      settle(undefined);
    }
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || !watched) return;
    watched.removeEventListener?.("devicechange", ask);
    watched = null;
  };
}

function snapshot(): boolean {
  return known ?? true;
}

function serverSnapshot(): boolean {
  return true;
}
