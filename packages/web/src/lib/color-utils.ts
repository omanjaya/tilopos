// ============================================================================
// Brand color utilities — generate full palette from a single hex color
// ============================================================================

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface BrandPreset {
  id: string;
  label: string;
  hex: string;
  description: string;
}

// ── Presets ──────────────────────────────────────────────────────────────────

export const BRAND_PRESETS: BrandPreset[] = [
  { id: 'slate', label: 'Slate', hex: '#475569', description: 'Netral & profesional' },
  { id: 'ocean', label: 'Ocean', hex: '#0284c7', description: 'Segar & modern' },
  { id: 'emerald', label: 'Emerald', hex: '#059669', description: 'Natural & sehat' },
  { id: 'sunset', label: 'Sunset', hex: '#ea580c', description: 'Hangat, cocok cafe' },
  { id: 'rose', label: 'Rose', hex: '#e11d48', description: 'Bold, fashion & beauty' },
  { id: 'amber', label: 'Amber', hex: '#d97706', description: 'Hangat, bakery & kopi' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed', description: 'Kreatif & modern' },
  { id: 'teal', label: 'Teal', hex: '#0d9488', description: 'Tenang, spa & servis' },
];

export const DEFAULT_BRAND_COLOR = '#475569'; // slate

// ── Conversions ─────────────────────────────────────────────────────────────

export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function hexToHSL(hex: string): HSL {
  const { r: r255, g: g255, b: b255 } = hexToRGB(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToString(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

// ── Palette generation ──────────────────────────────────────────────────────

/**
 * Generate a full shade palette from a single hex color.
 * Returns HSL strings for shades 50 through 950.
 */
export function generatePalette(hex: string): Record<string, string> {
  const { h, s } = hexToHSL(hex);

  // Lightness values for each shade (inspired by Tailwind's scale)
  const shades: Record<string, number> = {
    '50': 97,
    '100': 94,
    '200': 86,
    '300': 74,
    '400': 60,
    '500': 47,
    '600': 38,
    '700': 30,
    '800': 23,
    '900': 17,
    '950': 10,
  };

  const palette: Record<string, string> = {};
  for (const [shade, lightness] of Object.entries(shades)) {
    // Desaturate slightly at extreme lightness values for natural look
    const adjustedS = lightness > 90 ? Math.max(s - 20, 10) : lightness < 15 ? Math.max(s - 10, 5) : s;
    palette[shade] = `${h} ${adjustedS}% ${lightness}%`;
  }

  return palette;
}

// ── CSS Variable generation ─────────────────────────────────────────────────

/**
 * Generate CSS custom property overrides for the brand color.
 * These override the defaults in globals.css.
 */
export function generateBrandCSSVariables(
  hex: string,
  isDark: boolean,
): Record<string, string> {
  const palette = generatePalette(hex);
  const { h, s } = hexToHSL(hex);

  const p = (shade: string) => palette[shade] ?? `${h} ${s}% 50%`;

  if (isDark) {
    return {
      // Primary uses lighter shade in dark mode for contrast
      '--primary': p('400'),
      '--primary-foreground': `${h} ${Math.min(s, 20)}% 5%`,
      '--ring': p('400'),

      // Sidebar colors — dark theme
      '--sidebar': `${h} ${Math.max(Math.min(s, 20), 5)}% 6%`,
      '--sidebar-foreground': `${h} ${Math.max(Math.min(s, 15), 5)}% 85%`,
      '--sidebar-muted': `${h} ${Math.max(Math.min(s, 20), 5)}% 12%`,
      '--sidebar-muted-foreground': `${h} ${Math.max(Math.min(s, 12), 5)}% 50%`,
      '--sidebar-accent': `${h} ${Math.max(Math.min(s, 20), 5)}% 15%`,
      '--sidebar-accent-foreground': `${h} ${Math.max(Math.min(s, 15), 5)}% 95%`,
      '--sidebar-border': `${h} ${Math.max(Math.min(s, 20), 5)}% 12%`,
      '--sidebar-primary': p('400'),
    };
  }

  return {
    // Primary
    '--primary': p('600'),
    '--primary-foreground': '0 0% 100%',
    '--ring': p('600'),

    // Sidebar colors — light theme
    '--sidebar': `${h} ${Math.max(Math.min(s, 15), 5)}% 97%`,
    '--sidebar-foreground': `${h} ${Math.max(Math.min(s, 15), 5)}% 15%`,
    '--sidebar-muted': `${h} ${Math.max(Math.min(s, 15), 5)}% 93%`,
    '--sidebar-muted-foreground': `${h} ${Math.max(Math.min(s, 12), 5)}% 45%`,
    '--sidebar-accent': `${h} ${Math.max(Math.min(s, 15), 5)}% 90%`,
    '--sidebar-accent-foreground': `${h} ${Math.max(Math.min(s, 15), 5)}% 10%`,
    '--sidebar-border': `${h} ${Math.max(Math.min(s, 12), 5)}% 90%`,
    '--sidebar-primary': p('600'),
  };
}

/**
 * Apply brand CSS variables to the document root element.
 */
export function applyBrandTheme(hex: string, isDark: boolean): void {
  const vars = generateBrandCSSVariables(hex, isDark);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Remove brand CSS variable overrides (revert to CSS defaults).
 */
export function removeBrandTheme(): void {
  const keys = [
    '--primary', '--primary-foreground', '--ring',
    '--sidebar', '--sidebar-foreground', '--sidebar-muted',
    '--sidebar-muted-foreground', '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-border', '--sidebar-primary',
  ];
  const root = document.documentElement;
  for (const key of keys) {
    root.style.removeProperty(key);
  }
}

/**
 * Check if a string is a valid hex color.
 */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
