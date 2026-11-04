// All user-facing strings of `CameraButton` and `CameraCapture`, as the `camera` namespace
// of `<UiKitProvider labels>`, and per instance the `labels` prop over that (0.55, kastlan
// reuse audit 2026-11-02, proposal 8). A module with no component code, so the English
// catalogue (src/i18n/defaults.ts) imports the words without the viewfinder (0.34, KS U8).
//
// The wordings are the apps' own: keksdose's invoices.take_photo, camera_starting,
// camera_shutter and shots_captured (its locale JSONs), kastlan's handover.takePhoto
// ("Camera") as the viewfinder's name and wizard.newHandover.addPhoto as the button
// where there is no camera. keksdose's receipt-specific sentences are made general here
// ("Fill the frame with the receipt" → "Frame the picture"; "Analyse 3 photos" → "Use
// 3 photos"); keksdose passes its own through `labels`.

export interface CameraLabels {
  /** The button where there is a camera: it opens it. */
  takePhoto: string;
  /** The button where there is none: it opens the file picker for photos instead. */
  choosePhoto: string;
  /** The viewfinder's accessible name. */
  title: string;
  /** The line above the viewfinder before the first photo. */
  hint: string;
  /** Beside the spinner while the camera starts — the permission prompt is usually up. */
  starting: string;
  /** The shutter's accessible name (it shows a camera glyph and no word). */
  shutter: string;
  /** The line above the viewfinder once photos are taken and kept for one hand-over
   *  (`multiple`); it is a polite live region, so it is heard after each shot. */
  taken: (count: number) => string;
  /** The button that hands the photos taken so far to the app and closes the camera. */
  done: (count: number) => string;
}

export const DEFAULT_CAMERA_LABELS: CameraLabels = {
  takePhoto: "Take photo",
  choosePhoto: "Add photo",
  title: "Camera",
  hint: "Frame the picture, then tap the shutter.",
  starting: "Starting the camera…",
  shutter: "Take the photo",
  taken: (count) => (count === 1 ? "1 photo taken." : `${count} photos taken.`),
  done: (count) => (count === 1 ? "Use 1 photo" : `Use ${count} photos`),
};
