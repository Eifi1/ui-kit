// The showcase's two stylesheets, imported for their side effect (main.tsx): its own app.css
// and flag-icons'. TypeScript 6 checks side-effect imports (`noUncheckedSideEffectImports`
// is on by default), and Vite's own `vite/client` shims stay out of this project on purpose
// (src/vite-env.d.ts). The library imports no CSS, so this declares nothing it could lean on.
declare module "*.css";
