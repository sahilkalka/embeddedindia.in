// src/services/themeEngine.js

const PREDEFINED_PALETTES = {
  'silicon-dark-blue': {
    id: 'silicon-dark-blue',
    name: 'Silicon Dark Blue',
    bgPrimary: '#0a1128',
    bgSurface: '#101f42',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    accentPrimary: '#0077b6',
    accentSecondary: '#00b4d8',
    borderColor: '#1e3a8a'
  },
  'pcb-emerald-green': {
    id: 'pcb-emerald-green',
    name: 'PCB Emerald Green',
    bgPrimary: '#0b1412',
    bgSurface: '#11221e',
    textPrimary: '#f1f5f9',
    textMuted: '#94a3b8',
    accentPrimary: '#10b981',
    accentSecondary: '#34d399',
    borderColor: '#1e3831'
  },
  'automotive-slate-red': {
    id: 'automotive-slate-red',
    name: 'Automotive Slate/Red',
    bgPrimary: '#0f172a',
    bgSurface: '#1e293b',
    textPrimary: '#f8fafc',
    textMuted: '#94a3b8',
    accentPrimary: '#ef4444',
    accentSecondary: '#f87171',
    borderColor: '#334155'
  },
  'industrial-amber-charcoal': {
    id: 'industrial-amber-charcoal',
    name: 'Industrial Amber/Charcoal',
    bgPrimary: '#18181b',
    bgSurface: '#27272a',
    textPrimary: '#fafafa',
    textMuted: '#a1a1aa',
    accentPrimary: '#f59e0b',
    accentSecondary: '#fbbf24',
    borderColor: '#3f3f46'
  },
  'clean-light-enterprise': {
    id: 'clean-light-enterprise',
    name: 'Clean Light Enterprise',
    bgPrimary: '#f8fafc',
    bgSurface: '#ffffff',
    textPrimary: '#0f172a',
    textMuted: '#64748b',
    accentPrimary: '#2563eb',
    accentSecondary: '#3b82f6',
    borderColor: '#e2e8f0'
  }
};

function resolveTheme(settings = {}) {
  const activePaletteKey = settings.active_theme_palette || 'pcb-emerald-green';
  let palette;

  if (activePaletteKey === 'custom') {
    palette = {
      id: 'custom',
      name: settings.custom_palette_name || 'Custom Hex Palette',
      bgPrimary: settings.palette_bg_primary || '#0b1412',
      bgSurface: settings.palette_bg_surface || '#11221e',
      textPrimary: settings.palette_text_primary || '#f1f5f9',
      textMuted: settings.palette_text_muted || '#94a3b8',
      accentPrimary: settings.palette_accent_primary || '#10b981',
      accentSecondary: settings.palette_accent_secondary || '#34d399',
      borderColor: settings.palette_border_color || '#1e3831'
    };
  } else {
    palette = PREDEFINED_PALETTES[activePaletteKey] || PREDEFINED_PALETTES['pcb-emerald-green'];
  }

  const headingFont = settings.heading_font || 'Inter';
  const bodyFont = settings.body_font || 'Inter';
  const baseFontSize = settings.base_font_size || '16px';
  const borderRadiusScale = settings.border_radius_scale || '1rem';
  const containerMaxWidth = settings.container_max_width || '80rem';
  const cardShadowIntensity = settings.card_shadow_intensity || 'medium';
  const glassmorphism = settings.enable_glassmorphism === 'true';

  let shadowValue = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)';
  if (cardShadowIntensity === 'none') shadowValue = 'none';
  if (cardShadowIntensity === 'subtle') shadowValue = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
  if (cardShadowIntensity === 'high') shadowValue = '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)';

  const cssString = `
    :root {
      --bg-primary: ${palette.bgPrimary};
      --bg-surface: ${palette.bgSurface};
      --text-primary: ${palette.textPrimary};
      --text-muted: ${palette.textMuted};
      --accent-primary: ${palette.accentPrimary};
      --accent-secondary: ${palette.accentSecondary};
      --border-color: ${palette.borderColor};
      --font-heading: '${headingFont}', sans-serif;
      --font-body: '${bodyFont}', sans-serif;
      --base-font-size: ${baseFontSize};
      --border-radius-scale: ${borderRadiusScale};
      --container-max-width: ${containerMaxWidth};
      --card-shadow: ${shadowValue};
      --glass-backdrop: ${glassmorphism ? 'blur(12px)' : 'none'};
      --glass-bg: ${glassmorphism ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-surface)'};
    }
  `;

  return {
    palette,
    predefinedPalettes: PREDEFINED_PALETTES,
    cssString,
    headingFont,
    bodyFont,
    baseFontSize,
    borderRadiusScale,
    containerMaxWidth,
    cardShadowIntensity,
    glassmorphism
  };
}

module.exports = {
  PREDEFINED_PALETTES,
  resolveTheme
};
