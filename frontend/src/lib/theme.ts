// Theme preference lives in one place. The settings page writes it, the inline
// script below reads it before first paint so there is no flash of the wrong theme.

export const THEME_STORAGE_KEY = "standbydev:theme";

export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export type Theme = (typeof THEME_OPTIONS)[number];

export const DEFAULT_THEME: Theme = "dark";

/** Applies `.dark` to <html> from the stored preference. Idempotent, safe to call on change. */
export function applyTheme(theme: Theme): void {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

/** Inlined into <head> by layout.tsx. Must stay dependency-free and ES5-safe. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || ${JSON.stringify(DEFAULT_THEME)};
    var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`.trim();
