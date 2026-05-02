// ============================================================
// EVORIA DESIGN SYSTEM — THEME TOKENS
// ============================================================

export const theme = {
  colors: {
    // === BACKGROUNDS ===
    background: '#05050A',
    surface: '#11111A',
    surfaceRaised: '#171725',
    surfaceOverlay: 'rgba(17,17,26,0.95)',

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

    // === ACCENT (Indigo/Violet) ===
    accent: '#6366F1', // Indigo
    accentLight: '#818CF8',
    accentGlow: 'rgba(99,102,241,0.20)',
    accentSubtle: 'rgba(99,102,241,0.10)',

    // === TEXT ===
    text: '#F8F8F8',
    textSecondary: '#A1A1AA',
    textMuted: '#52525B',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',

    // === SECTION LABELS ===
    sectionLabel: '#A1A1AA',

    // === SEMANTIC ===
    success: '#10B981',
    successSubtle: 'rgba(16,185,129,0.12)',
    successBorder: 'rgba(16,185,129,0.30)',

    warning: '#F59E0B',
    warningSubtle: 'rgba(245,158,11,0.12)',
    warningBorder: 'rgba(245,158,11,0.30)',

    error: '#EF4444',
    errorSubtle: 'rgba(239,68,68,0.12)',
    errorBorder: 'rgba(239,68,68,0.30)',

    info: '#3B82F6',
    infoSubtle: 'rgba(59,130,246,0.12)',
    infoBorder: 'rgba(59,130,246,0.30)',

    // === TAB BAR ===
    tabBarBg: 'rgba(5,5,10,0.94)',
    tabBarActive: '#8B5CF6',
    tabBarInactive: '#52525B',

    // === LEGACY ALIASES ===
    surfaceLight: '#171725',
    glass: 'rgba(17,17,26,0.85)',
    glassBorder: 'rgba(255,255,255,0.08)',
    secondary: '#818CF8',
  },

  spacing: {
    xs: 4,
    s: 8,
    sm: 12,
    m: 16,
    base: 16, // mapped to 16 for compat
    l: 20,
    xl: 24,
    '2xl': 32,
    xxl: 40,
    '3xl': 48,
    xxxl: 64,
    '4xl': 80,
  },

  borderRadius: {
    xs: 4,
    s: 8,
    sm: 12, // used as 12
    m: 16, // used as 16
    l: 20, // used as 20
    xl: 28, // used as 28
    xxl: 32,
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
    button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22, letterSpacing: 0.1 },
    sectionLabel: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18, letterSpacing: 0.5, textTransform: 'uppercase' as const },
    small: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.3 },
  },

  shadows: {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 12 },
    glow: { shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.40, shadowRadius: 16, elevation: 8 },
    accentGlow: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.30, shadowRadius: 16, elevation: 8 },
    premium: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.50, shadowRadius: 24, elevation: 12 },
    glass: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  },
};

export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;

