/**
 * Embedded India - Unified Theme & Palette Manager
 * Shared across both Public Homepage & Admin Dashboard
 */
(function() {
  'use strict';

  const THEME_PALETTES = {
    'cyber-emerald': {
      name: 'Cyber Emerald',
      badge: 'EMERALD',
      hex: '#007f5f',
      light: {
        '--primary-color': '#007f5f',
        '--primary-hover': '#007255',
        '--primary-active': '#00664c',
        '--secondary-color': '#55a630',
        '--accent-light': '#80b918',
        '--accent-dark': '#387322',
        '--bg-primary': '#ffffff',
        '--bg-surface': '#f8fafc',
        '--text-primary': '#0f172a',
        '--text-muted': '#64748b',
        '--border-color': '#e2e8f0',
        '--glow-color': 'rgba(0, 127, 95, 0.22)'
      },
      dark: {
        '--primary-color': '#059669',
        '--primary-hover': '#047857',
        '--primary-active': '#065f46',
        '--secondary-color': '#80b918',
        '--accent-light': '#a3e635',
        '--accent-dark': '#65a30d',
        '--bg-primary': '#0b1412',
        '--bg-surface': '#13221e',
        '--text-primary': '#f1f5f9',
        '--text-muted': '#94a3b8',
        '--border-color': '#1e3831',
        '--glow-color': 'rgba(5, 150, 105, 0.35)'
      }
    },
    'vscode-theme': {
      name: 'VS Code Inspired',
      badge: 'VS CODE',
      hex: '#007ACC',
      light: {
        '--primary-color': '#0078D4',
        '--primary-hover': '#006cbd',
        '--primary-active': '#005ba4',
        '--secondary-color': '#3794FF',
        '--accent-light': '#3794FF',
        '--accent-dark': '#005ba4',
        '--bg-primary': '#FFFFFF',
        '--bg-surface': '#F8F8F8',
        '--text-primary': '#333333',
        '--text-muted': '#616161',
        '--border-color': '#D4D4D4',
        '--glow-color': 'rgba(0, 120, 212, 0.22)'
      },
      dark: {
        '--primary-color': '#007ACC',
        '--primary-hover': '#0062a3',
        '--primary-active': '#004c80',
        '--secondary-color': '#3794FF',
        '--accent-light': '#3794FF',
        '--accent-dark': '#0062a3',
        '--bg-primary': '#1E1E1E',
        '--bg-surface': '#252526',
        '--text-primary': '#CCCCCC',
        '--text-muted': '#9D9D9D',
        '--border-color': '#3E3E42',
        '--glow-color': 'rgba(0, 122, 204, 0.35)'
      }
    },
    'solar-amber': {
      name: 'Solar Amber',
      badge: 'AMBER',
      hex: '#d97706',
      light: {
        '--primary-color': '#d97706',
        '--primary-hover': '#b45309',
        '--primary-active': '#92400e',
        '--secondary-color': '#f59e0b',
        '--accent-light': '#fbbf24',
        '--accent-dark': '#78350f',
        '--bg-primary': '#ffffff',
        '--bg-surface': '#fffbeb',
        '--text-primary': '#1c1917',
        '--text-muted': '#78716c',
        '--border-color': '#e5e7eb',
        '--glow-color': 'rgba(217, 119, 6, 0.22)'
      },
      dark: {
        '--primary-color': '#f59e0b',
        '--primary-hover': '#d97706',
        '--primary-active': '#b45309',
        '--secondary-color': '#fbbf24',
        '--accent-light': '#fde68a',
        '--accent-dark': '#92400e',
        '--bg-primary': '#18181b',
        '--bg-surface': '#27272a',
        '--text-primary': '#fafafa',
        '--text-muted': '#a1a1aa',
        '--border-color': '#3f3f46',
        '--glow-color': 'rgba(245, 158, 11, 0.35)'
      }
    },
    'quantum-cyan': {
      name: 'Quantum Cyan',
      badge: 'CYAN',
      hex: '#0284c7',
      light: {
        '--primary-color': '#0284c7',
        '--primary-hover': '#0369a1',
        '--primary-active': '#075985',
        '--secondary-color': '#06b6d4',
        '--accent-light': '#38bdf8',
        '--accent-dark': '#0891b2',
        '--bg-primary': '#ffffff',
        '--bg-surface': '#f0f9ff',
        '--text-primary': '#0f172a',
        '--text-muted': '#64748b',
        '--border-color': '#e2e8f0',
        '--glow-color': 'rgba(2, 132, 199, 0.22)'
      },
      dark: {
        '--primary-color': '#0ea5e9',
        '--primary-hover': '#0284c7',
        '--primary-active': '#0369a1',
        '--secondary-color': '#06b6d4',
        '--accent-light': '#38bdf8',
        '--accent-dark': '#0891b2',
        '--bg-primary': '#08101a',
        '--bg-surface': '#0f1d2e',
        '--text-primary': '#f8fafc',
        '--text-muted': '#94a3b8',
        '--border-color': '#172a42',
        '--glow-color': 'rgba(14, 165, 233, 0.35)'
      }
    },
    'titanium-slate': {
      name: 'Titanium Slate',
      badge: 'SLATE',
      hex: '#475569',
      light: {
        '--primary-color': '#334155',
        '--primary-hover': '#1e293b',
        '--primary-active': '#0f172a',
        '--secondary-color': '#0284c7',
        '--accent-light': '#38bdf8',
        '--accent-dark': '#0f172a',
        '--bg-primary': '#ffffff',
        '--bg-surface': '#f8fafc',
        '--text-primary': '#0f172a',
        '--text-muted': '#64748b',
        '--border-color': '#cbd5e1',
        '--glow-color': 'rgba(56, 189, 248, 0.22)'
      },
      dark: {
        '--primary-color': '#475569',
        '--primary-hover': '#334155',
        '--primary-active': '#1e293b',
        '--secondary-color': '#38bdf8',
        '--accent-light': '#7dd3fc',
        '--accent-dark': '#0284c7',
        '--bg-primary': '#090d16',
        '--bg-surface': '#111827',
        '--text-primary': '#f8fafc',
        '--text-muted': '#94a3b8',
        '--border-color': '#334155',
        '--glow-color': 'rgba(56, 189, 248, 0.35)'
      }
    },
    'clean-light': {
      name: 'Clean Enterprise',
      badge: 'ENTERPRISE',
      hex: '#2563eb',
      light: {
        '--primary-color': '#2563eb',
        '--primary-hover': '#1d4ed8',
        '--primary-active': '#1e40af',
        '--secondary-color': '#3b82f6',
        '--accent-light': '#60a5fa',
        '--accent-dark': '#1e3a8a',
        '--bg-primary': '#f8fafc',
        '--bg-surface': '#ffffff',
        '--text-primary': '#0f172a',
        '--text-muted': '#64748b',
        '--border-color': '#e2e8f0',
        '--glow-color': 'rgba(37, 99, 235, 0.22)'
      },
      dark: {
        '--primary-color': '#3b82f6',
        '--primary-hover': '#2563eb',
        '--primary-active': '#1d4ed8',
        '--secondary-color': '#60a5fa',
        '--accent-light': '#93c5fd',
        '--accent-dark': '#1e40af',
        '--bg-primary': '#0f172a',
        '--bg-surface': '#1e293b',
        '--text-primary': '#f8fafc',
        '--text-muted': '#94a3b8',
        '--border-color': '#334155',
        '--glow-color': 'rgba(59, 130, 246, 0.35)'
      }
    }
  };

  // Backward compatibility aliases
  THEME_PALETTES['emerald'] = THEME_PALETTES['cyber-emerald'];
  THEME_PALETTES['pcb-emerald-green'] = THEME_PALETTES['cyber-emerald'];
  THEME_PALETTES['cyan'] = THEME_PALETTES['quantum-cyan'];
  THEME_PALETTES['silicon-dark-blue'] = THEME_PALETTES['quantum-cyan'];
  THEME_PALETTES['spacegrey'] = THEME_PALETTES['titanium-slate'];
  THEME_PALETTES['industrial-amber-charcoal'] = THEME_PALETTES['solar-amber'];
  THEME_PALETTES['clean-light-enterprise'] = THEME_PALETTES['clean-light'];
  THEME_PALETTES['supernova-violet'] = THEME_PALETTES['vscode-theme'];
  THEME_PALETTES['vscode'] = THEME_PALETTES['vscode-theme'];

  function updatePills(isDark) {
    const pills = document.querySelectorAll('.theme-pill-container');
    pills.forEach(pill => {
      pill.style.backgroundColor = isDark ? '#1e293b' : '#ffffff';
      pill.style.color = isDark ? '#f1f5f9' : '#334155';
    });
  }

  function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    
    // Update moon/sun icons across all toggles
    document.querySelectorAll('.theme-dark-icon, #theme-toggle-dark-icon').forEach(icon => {
      if (isDark) icon.classList.add('hidden');
      else icon.classList.remove('hidden');
    });

    document.querySelectorAll('.theme-light-icon, #theme-toggle-light-icon').forEach(icon => {
      if (isDark) icon.classList.remove('hidden');
      else icon.classList.add('hidden');
    });

    document.querySelectorAll('.theme-label, #theme-toggle-label').forEach(label => {
      label.textContent = isDark ? 'Light mode' : 'Dark mode';
    });

    document.querySelectorAll('.theme-toggle-btn, #theme-toggle').forEach(btn => {
      btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
    });

    updatePills(isDark);
  }

  function getActivePaletteKey() {
    // 1. Current theme in localStorage or HTML data-palette attribute
    const saved = localStorage.getItem('color-palette') || document.documentElement.getAttribute('data-palette');
    if (saved) return saved;

    // 2. Fallback to active radio in theme engine if present
    const themeEngineRadio = document.querySelector('#theme-engine input[name="active_theme_palette"]:checked')
      || document.querySelector('input[name="active_theme_palette"]:checked');
    if (themeEngineRadio && themeEngineRadio.value) {
      return themeEngineRadio.value;
    }

    return 'cyber-emerald';
  }

  function registerCustomPalette(key, paletteObj) {
    THEME_PALETTES[key] = paletteObj;
  }

  function applyPalette(scheme) {
    const canonicalScheme = {
      emerald: 'cyber-emerald',
      cyan: 'quantum-cyan',
      spacegrey: 'titanium-slate',
      'supernova-violet': 'vscode-theme',
      vscode: 'vscode-theme'
    }[scheme] || scheme;

    const safeScheme = THEME_PALETTES[canonicalScheme] ? canonicalScheme : 'cyber-emerald';
    const paletteObj = THEME_PALETTES[safeScheme];
    if (!paletteObj) return;

    document.documentElement.setAttribute('data-palette', safeScheme);
    localStorage.setItem('color-palette', safeScheme);

    const isDark = document.documentElement.classList.contains('dark');
    const variant = isDark ? (paletteObj.dark || paletteObj.light) : (paletteObj.light || paletteObj.dark);
    if (variant) {
      Object.entries(variant).forEach(([prop, val]) => {
        document.documentElement.style.setProperty(prop, val);
      });
    }

    // Explicitly derive and dynamically bind CSS variables required:
    // --bg-primary, --bg-surface, --text-primary, --accent-primary, --border-color
    const bgPrimary = variant['--bg-primary'] || (isDark ? '#0b1412' : '#ffffff');
    const bgSurface = variant['--bg-surface'] || (isDark ? '#13221e' : '#f8fafc');
    const textPrimary = variant['--text-primary'] || (isDark ? '#f1f5f9' : '#0f172a');
    const accentPrimary = variant['--accent-primary'] || variant['--primary-color'] || paletteObj.hex || '#007f5f';
    const borderColor = variant['--border-color'] || (isDark ? '#1e3831' : '#e2e8f0');

    document.documentElement.style.setProperty('--bg-primary', bgPrimary);
    document.documentElement.style.setProperty('--bg-surface', bgSurface);
    document.documentElement.style.setProperty('--text-primary', textPrimary);
    document.documentElement.style.setProperty('--accent-primary', accentPrimary);
    document.documentElement.style.setProperty('--border-color', borderColor);
    document.documentElement.style.setProperty('--action-color', variant['--primary-active'] || accentPrimary);
    document.documentElement.style.setProperty('--readable-primary',
      isDark ? (variant['--accent-light'] || accentPrimary) : (variant['--primary-active'] || accentPrimary));

    // Update active scheme indicators
    document.querySelectorAll('.active-scheme-dot, #active-scheme-dot, #admin-active-scheme-dot').forEach(dot => {
      dot.style.backgroundColor = accentPrimary;
    });

    // Update top right active badge name
    document.querySelectorAll('.active-palette-name, #active-palette-name, #admin-active-palette-name').forEach(nameEl => {
      nameEl.textContent = paletteObj.badge || 'EMERALD';
      nameEl.style.color = isDark ? (variant['--accent-light'] || accentPrimary) : (variant['--primary-active'] || accentPrimary);
    });

    // Update swatches
    document.querySelectorAll('.palette-btn').forEach(btn => {
      const check = btn.querySelector('.scheme-check');
      const isMatch = (btn.dataset.scheme === safeScheme) || (btn.dataset.scheme === 'supernova-violet' && safeScheme === 'vscode-theme');
      if (isMatch) {
        if (check) check.classList.remove('hidden');
        btn.classList.add('ring-2', 'ring-offset-2', 'ring-slate-400', 'dark:ring-white', 'scale-105');
      } else {
        if (check) check.classList.add('hidden');
        btn.classList.remove('ring-2', 'ring-offset-2', 'ring-slate-400', 'dark:ring-white', 'scale-105');
      }
    });

    // Update active theme-toggle buttons bound to --accent-primary
    document.querySelectorAll('.theme-toggle-switch.is-checked').forEach(toggleBtn => {
      toggleBtn.style.backgroundColor = accentPrimary;
    });

    // If on settings page with Choose Active Palette panel, sync radio and cards
    if (typeof window.syncSettingsPaletteCards === 'function') {
      window.syncSettingsPaletteCards(safeScheme);
    }
  }

  function toggleThemeMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('color-theme', isDark ? 'dark' : 'light');
    updateThemeIcons();
    const activeKey = getActivePaletteKey();
    applyPalette(activeKey);
  }

  let lastPaletteToggleTime = 0;
  function togglePaletteDropdown(triggerBtn) {
    const now = Date.now();
    if (now - lastPaletteToggleTime < 250) return;
    lastPaletteToggleTime = now;

    const btn = triggerBtn || document.getElementById('palette-dropdown-btn') || document.querySelector('.theme-dropdown-btn');
    if (!btn) return;
    const wrapper = btn.closest('.theme-dropdown-wrapper, #palette-dropdown-wrapper, #admin-palette-dropdown-wrapper') || btn.parentElement;
    const menu = wrapper ? wrapper.querySelector('.theme-dropdown-menu, #palette-dropdown-menu, #admin-palette-dropdown-menu') : document.getElementById('palette-dropdown-menu');
    const chevron = wrapper ? wrapper.querySelector('.theme-chevron, #palette-chevron, #admin-palette-chevron') : document.getElementById('palette-chevron');
    if (menu) {
      const isHidden = menu.classList.contains('hidden') || menu.style.display === 'none' || (window.getComputedStyle && window.getComputedStyle(menu).display === 'none');
      if (isHidden) {
        document.querySelectorAll('.theme-dropdown-menu, #palette-dropdown-menu, #admin-palette-dropdown-menu').forEach(m => {
          if (m !== menu) {
            m.classList.add('hidden');
            m.style.removeProperty('display');
          }
        });
        menu.classList.remove('hidden');
        menu.style.setProperty('display', 'flex', 'important');
        menu.style.setProperty('visibility', 'visible', 'important');
        menu.style.setProperty('opacity', '1', 'important');
        menu.style.setProperty('pointer-events', 'auto', 'important');
        btn.setAttribute('aria-expanded', 'true');
        if (chevron) chevron.classList.add('rotate-180');
      } else {
        menu.classList.add('hidden');
        menu.style.removeProperty('display');
        btn.setAttribute('aria-expanded', 'false');
        if (chevron) chevron.classList.remove('rotate-180');
      }
    }
  }

  // Expose globally immediately
  window.togglePaletteDropdown = togglePaletteDropdown;

  function initTheme() {
    // 1. Initial Mode Check
    const savedTheme = localStorage.getItem('color-theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && document.documentElement.classList.contains('dark'));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    }
    updateThemeIcons();

    // 2. Initial Palette
    const isAdmin = window.location.pathname.startsWith('/admin') || document.body?.classList.contains('admin-shell');
    const fallbackPalette = isAdmin ? 'titanium-slate' : 'cyber-emerald';
    const initialScheme = localStorage.getItem('color-palette') || document.documentElement.getAttribute('data-palette') || fallbackPalette;
    applyPalette(initialScheme);

    // 3. Bind Clicks
    document.querySelectorAll('.theme-toggle-btn, #theme-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleThemeMode();
      });
    });

    document.querySelectorAll('.theme-dropdown-btn, #palette-dropdown-btn, #admin-palette-dropdown-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePaletteDropdown(btn);
      });
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyPalette(btn.dataset.scheme);
        document.querySelectorAll('.theme-dropdown-menu, #palette-dropdown-menu, #admin-palette-dropdown-menu').forEach(menu => {
          menu.classList.add('hidden');
          menu.style.removeProperty('display');
        });
        document.querySelectorAll('.theme-chevron, #palette-chevron, #admin-palette-chevron').forEach(chevron => {
          chevron.classList.remove('rotate-180');
        });
        document.querySelectorAll('.theme-dropdown-btn, #palette-dropdown-btn, #admin-palette-dropdown-btn').forEach(dBtn => {
          dBtn.setAttribute('aria-expanded', 'false');
        });
      });
    });

    // Outside click closes menus
    document.addEventListener('click', (e) => {
      const isInsideAnyWrapper = Array.from(document.querySelectorAll('.theme-dropdown-wrapper, #palette-dropdown-wrapper, #admin-palette-dropdown-wrapper')).some(w => w.contains(e.target));
      if (!isInsideAnyWrapper) {
        document.querySelectorAll('.theme-dropdown-menu, #palette-dropdown-menu, #admin-palette-dropdown-menu').forEach(menu => {
          menu.classList.add('hidden');
          menu.style.removeProperty('display');
        });
        document.querySelectorAll('.theme-chevron, #palette-chevron, #admin-palette-chevron').forEach(chevron => {
          chevron.classList.remove('rotate-180');
        });
        document.querySelectorAll('.theme-dropdown-btn, #palette-dropdown-btn, #admin-palette-dropdown-btn').forEach(btn => {
          btn.setAttribute('aria-expanded', 'false');
        });
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      const openButton = document.querySelector('.theme-dropdown-btn[aria-expanded="true"]');
      if (!openButton) return;
      const wrapper = openButton.closest('.theme-dropdown-wrapper');
      wrapper.querySelector('.theme-dropdown-menu').classList.add('hidden');
      wrapper.querySelector('.theme-chevron').classList.remove('rotate-180');
      openButton.setAttribute('aria-expanded', 'false');
      openButton.focus();
    });
  }

  // Global accessible Theme-Aware Toggle Switch click handler
  window.handleThemeToggleClick = function(inputId, btnEl, callbackName) {
    const hiddenInput = document.getElementById(inputId);
    const btn = btnEl || document.getElementById('btn_' + inputId);
    if (!hiddenInput || !btn) return;
    const knob = btn.querySelector('.theme-toggle-thumb');
    const badge = document.getElementById('badge_' + inputId);
    if (!knob) return;

    const isChecked = hiddenInput.value === 'true';
    const nextState = !isChecked;
    hiddenInput.value = nextState ? 'true' : 'false';

    btn.setAttribute('aria-checked', nextState ? 'true' : 'false');
    const isDark = document.documentElement.classList.contains('dark');
    const mutedBg = isDark ? '#334155' : '#cbd5e1';
    const activeColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#059669';

    if (nextState) {
      btn.classList.remove('is-unchecked');
      btn.classList.add('is-checked');
      btn.style.backgroundColor = activeColor;
      knob.classList.remove('translate-x-0');
      knob.classList.add('translate-x-5');
      knob.style.transform = 'translateX(20px)';
      if (badge) {
        badge.className = 'theme-toggle-badge text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md cursor-pointer hover:opacity-85 transition select-none bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300';
        badge.textContent = btn.dataset.onLabel || 'Enabled';
      }
    } else {
      btn.classList.remove('is-checked');
      btn.classList.add('is-unchecked');
      btn.style.backgroundColor = mutedBg;
      knob.classList.remove('translate-x-5');
      knob.classList.add('translate-x-0');
      knob.style.transform = 'translateX(0px)';
      if (badge) {
        badge.className = 'theme-toggle-badge text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md cursor-pointer hover:opacity-85 transition select-none bg-slate-200 dark:bg-slate-800 text-slate-500';
        badge.textContent = btn.dataset.offLabel || 'Disabled';
      }
    }

    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));

    if (callbackName && typeof window[callbackName] === 'function') {
      window[callbackName](nextState, inputId);
    }
  };

  // Export to global scope
  window.ThemeManager = {
    THEME_PALETTES,
    applyPalette,
    toggleThemeMode,
    updateThemeIcons,
    toggleDropdown: togglePaletteDropdown,
    registerCustomPalette,
    getActivePaletteKey,
    init: initTheme
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
