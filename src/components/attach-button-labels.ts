// All user-facing strings of `AttachButton`, as the `attach` namespace of `<UiKitProvider
// labels>`, and per instance the `labels` prop over that (0.66, docs: the AttachButton
// draft of 2026-11-16). A module with no component code, so the English catalogue
// (src/i18n/defaults.ts) imports the words without the component (0.34, KS U8).
//
// The viewfinder's own words (its title, shutter, "2 photos taken", "Use 2 photos") stay
// the `camera` namespace's: AttachButton opens the same CameraCapture as CameraButton, and
// one translation covers both. The refusals are the `filePicker` namespace's.

export interface AttachLabels {
  /** The trigger's word, beside the paperclip — and its accessible name with `iconOnly`. */
  trigger: string;
  /** The phone sheet's heading and the desktop menu's accessible name. */
  title: string;
  /** The tile that opens the camera in the page. */
  camera: string;
  /** The tile that opens the picker for pictures (the gallery on Android). */
  photos: string;
  /** The tile that opens the picker for files (the document picker on Android; on a
   *  desktop, the one file dialog for everything). */
  files: string;
  /** The tile that takes a screenshot of the app (`onCaptureScreenshot`). */
  screenshot: string;
  /** The sheet's ✕. */
  close: string;
  /** Where the camera has to be the phone's own camera app (no camera in the page): the
   *  button that takes one more page before the pages are handed over together. */
  anotherPage: string;
}

export const DEFAULT_ATTACH_LABELS: AttachLabels = {
  trigger: "Attach",
  title: "Add attachment",
  camera: "Camera",
  photos: "Photos",
  files: "Files",
  screenshot: "Screenshot",
  close: "Close",
  anotherPage: "Another page",
};
