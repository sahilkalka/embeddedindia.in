// src/services/themeEngine.js

const PREDEFINED_PALETTES = {
  'cyber-emerald': {
    id: 'cyber-emerald',
    name: 'Cyber Emerald',
    bgPrimary: '#0b1412',
    bgSurface: '#13221e',
    textPrimary: '#f1f5f9',
    textMuted: '#94a3b8',
    accentPrimary: '#059669',
    accentSecondary: '#55a630',
    borderColor: '#1e3831',
    swatchHex: '#007f5f'
  },
  'quantum-cyan': {
    id: 'quantum-cyan',
    name: 'Quantum Cyan',
    bgPrimary: '#08101a',
    bgSurface: '#0f1d2e',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    accentPrimary: '#0ea5e9',
    accentSecondary: '#06b6d4',
    borderColor: '#172a42',
    swatchHex: '#0284c7'
  },
  'titanium-slate': {
    id: 'titanium-slate',
    name: 'Titanium Slate',
    bgPrimary: '#090d16',
    bgSurface: '#0f172a',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    accentPrimary: '#38bdf8',
    accentSecondary: '#64748b',
    borderColor: '#334155',
    swatchHex: '#475569'
  },
  'solar-amber': {
    id: 'solar-amber',
    name: 'Solar Amber',
    bgPrimary: '#18181b',
    bgSurface: '#27272a',
    textPrimary: '#fafafa',
    textMuted: '#a1a1aa',
    accentPrimary: '#f59e0b',
    accentSecondary: '#fbbf24',
    borderColor: '#3f3f46',
    swatchHex: '#d97706'
  },
  'supernova-violet': {
    id: 'supernova-violet',
    name: 'Supernova Violet',
    bgPrimary: '#0f0c1b',
    bgSurface: '#18142a',
    textPrimary: '#faf5ff',
    textMuted: '#c084fc',
    accentPrimary: '#a855f7',
    accentSecondary: '#c084fc',
    borderColor: '#3b2d54',
    swatchHex: '#9333ea'
  },
  'clean-light': {
    id: 'clean-light',
    name: 'Clean Enterprise',
    bgPrimary: '#f8fafc',
    bgSurface: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    accentPrimary: '#2563eb',
    accentSecondary: '#3b82f6',
    borderColor: '#e2e8f0',
    swatchHex: '#2563eb'
  }
};

// Aliases for backward compatibility
const PALETTE_ALIASES = {
  'emerald': 'cyber-emerald',
  'pcb-emerald-green': 'cyber-emerald',
  'cyan': 'quantum-cyan',
  'silicon-dark-blue': 'quantum-cyan',
  'spacegrey': 'titanium-slate',
  'automotive-slate-red': 'titanium-slate',
  'industrial-amber-charcoal': 'solar-amber',
  'clean-light-enterprise': 'clean-light'
};

function resolveTheme(settings = {}) {
  let activeKey = settings.active_theme_palette || 'cyber-emerald';
  if (PALETTE_ALIASES[activeKey]) {
    activeKey = PALETTE_ALIASES[activeKey];
  }

  let palette;
  if (activeKey === 'custom') {
    palette = {
      id: 'custom',
      name: settings.custom_palette_name || 'Custom Hex Palette',
      bgPrimary: settings.palette_bg_primary || '#0b1412',
      bgSurface: settings.palette_bg_surface || '#13221e',
      textPrimary: settings.palette_text_primary || '#f1f5f9',
      textMuted: settings.palette_text_muted || '#94a3b8',
      accentPrimary: settings.palette_accent_primary || '#059669',
      accentSecondary: settings.palette_accent_secondary || '#34d399',
      borderColor: settings.palette_border_color || '#1e3831',
      swatchHex: settings.palette_accent_primary || '#059669'
    };
  } else {
    palette = PREDEFINED_PALETTES[activeKey] || PREDEFINED_PALETTES['cyber-emerald'];
  }

  const headingFont = settings.heading_font || 'Inter';
  const bodyFont = settings.body_font || 'Inter';
  const baseFontSize = settings.base_font_size || '16px';
  const borderRadiusScale = settings.border_radius_scale || '1rem';
  const containerMaxWidth = settings.container_max_width || '80rem';
  const cardShadowIntensity = settings.card_shadow_intensity || 'medium';
  const glassmorphism = settings.enable_glassmorphism !== 'false';
  const bounceIntensity = settings.theme_bounce_intensity || 'bouncy';

  let shadowValue = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
  if (cardShadowIntensity === 'none') shadowValue = 'none';
  if (cardShadowIntensity === 'subtle') shadowValue = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
  if (cardShadowIntensity === 'high') shadowValue = '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)';

  let springCurve = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  if (bounceIntensity === 'subtle') springCurve = 'cubic-bezier(0.25, 1, 0.5, 1)';
  if (bounceIntensity === 'none') springCurve = 'ease';

  const cssString = `
    :root {
      --bg-primary: ${palette.bgPrimary};
      --bg-surface: ${palette.bgSurface};
      --text-primary: ${palette.textPrimary};
      --text-muted: ${palette.textMuted};
      --accent-primary: ${palette.accentPrimary};
      --accent-secondary: ${palette.accentSecondary};
      --border-color: ${palette.borderColor};
      --font-heading: '${headingFont}', system-ui, sans-serif;
      --font-body: '${bodyFont}', system-ui, sans-serif;
      --base-font-size: ${baseFontSize};
      --border-radius-scale: ${borderRadiusScale};
      --container-max-width: ${containerMaxWidth};
      --card-shadow: ${shadowValue};
      --spring-curve: ${springCurve};
      --glass-backdrop: ${glassmorphism ? 'blur(12px)' : 'none'};
      --glass-bg: ${glassmorphism ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-surface)'};
    }
  `;

  return {
    palette,
    paletteKey: activeKey,
    predefinedPalettes: PREDEFINED_PALETTES,
    cssString,
    headingFont,
    bodyFont,
    baseFontSize,
    borderRadiusScale,
    containerMaxWidth,
    cardShadowIntensity,
    glassmorphism,
    bounceIntensity,
    springCurve
  };
}

module.exports = {
  PREDEFINED_PALETTES,
  PALETTE_ALIASES,
  resolveTheme
};
