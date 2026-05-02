// ============================================================
// EVORIA DESIGN SYSTEM — THEME TOKENS
// Version 3.1 — Luma-Replica, Purple Accent
// ============================================================

export const theme = {
  colors: {
    // === BACKGROUNDS (Luma: warm dark) ===
    background: '#111111',
    surface: '#1C1A17',
    surfaceRaised: '#262320',
    surfaceOverlay: 'rgba(28,26,23,0.95)',

    // === BORDERS ===
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    borderFocus: 'rgba(139,92,246,0.50)',

    // === PRIMARY (Purple) ===
    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    primaryGlow: 'rgba(139,92,246,0.25)',
    primarySubtle: 'rgba(139,92,246,0.12)',

    // === ACCENT (Purple) ===
    accent: '#8B5CF6',
    accentLight: '#A78BFA',
    accentGlow: 'rgba(139,92,246,0.20)',
    accentSubtle: 'rgba(139,92,246,0.10)',

    // === TEXT ===
    text: '#F5F5F0',
    textSecondary: '#9A9590',
    textMuted: '#5C5854',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',

    // === SECTION LABELS (muted warm) ===
    sectionLabel: '#9A9590',

    // === SEMANTIC ===
    success: '#4CAF50',
    successSubtle: 'rgba(76,175,80,0.12)',
    successBorder: 'rgba(76,175,80,0.30)',

    warning: '#EAB308',
    warningSubtle: 'rgba(234,179,8,0.12)',
    warningBorder: 'rgba(234,179,8,0.30)',

    error: '#EF4444',
    errorSubtle: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.30)',

    info: '#3B82F6',
    infoSubtle: 'rgba(59,130,246,0.12)',
    infoBorder: 'rgba(59,130,246,0.30)',

    // === TAB BAR ===
    tabBarBg: 'rgba(22,20,18,0.94)',
    tabBarActive: '#8B5CF6',
    tabBarInactive: '#6B6560',

    // === LEGACY ALIASES ===
    surfaceLight: '#262320',
    glass: 'rgba(28,26,23,0.85)',
    glassBorder: 'rgba(255,255,255,0.08)',
    secondary: '#A78BFA',
  },

  spacing: {
    xxs: 2,
    xs: 4,
    s: 8,
    sm: 12,
    m: 16,
    base: 20,
    l: 24,
    xl: 32,
    '2xl': 40,
    xxl: 48,
    '3xl': 56,
    xxxl: 64,
    '4xl': 80,
  },

  borderRadius: {
    xs: 6,
    s: 10,
    m: 14,
    l: 16,
    xl: 20,
    xxl: 28,
    round: 9999,
  },

  typography: {
    display: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -1.2 },
    h1: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34, letterSpacing: -0.6 },
    h2: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, letterSpacing: -0.3 },
    h3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.2 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, letterSpacing: 0 },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const, lineHeight: 22, letterSpacing: 0 },
    label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.1 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, letterSpacing: 0.2 },
    overline: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14, letterSpacing: 0.8 },
    button: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: 0.1 },
    sectionLabel: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, letterSpacing: 0.3 },
    small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  },

  shadows: {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 12 },
    glow: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 16, elevation: 8 },
    accentGlow: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.20, shadowRadius: 16, elevation: 8 },
    premium: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.40, shadowRadius: 24, elevation: 12 },
    glass: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  },
};

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
