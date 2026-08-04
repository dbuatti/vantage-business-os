/**
 * Converts a hex color (e.g. "#6366f1") to the space-separated HSL triplet
 * format this app's CSS custom properties expect (e.g. "239 84% 67%"), so it
 * can be written directly into `--primary` and read back via `hsl(var(--primary))`.
 * Returns null for anything that isn't a valid 6-digit hex color.
 */
export function hexToHslString(hex: string): string | null {
  const cleaned = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;

  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Applies a hex brand color to the CSS custom properties that drive the
 * "primary" accent throughout the app (buttons, links, active nav state,
 * focus rings). Invalid input is ignored rather than clearing the theme.
 */
export function applyBrandColor(hex: string | null | undefined): void {
  if (!hex) return;
  const hsl = hexToHslString(hex);
  if (!hsl) return;
  const root = document.documentElement.style;
  root.setProperty('--primary', hsl);
  root.setProperty('--ring', hsl);
  root.setProperty('--sidebar-ring', hsl);
}
