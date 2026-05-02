export const theme = {
  colors: {
    background: '#09090B', // Zinc 950 - deep near black
    surface: '#18181B', // Zinc 900
    surfaceLight: '#27272A', // Zinc 800
    primary: '#818CF8', // Indigo 400 - soft, premium
    primaryLight: '#A5B4FC', // Indigo 300
    secondary: '#A78BFA', // Violet 400
    accent: '#F43F5E', // Rose 500
    text: '#FAFAFA', // Zinc 50
    textMuted: '#A1A1AA', // Zinc 400
    border: 'rgba(255, 255, 255, 0.08)',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    glass: 'rgba(24, 24, 27, 0.6)', // Semi-transparent surface
    glassBorder: 'rgba(255, 255, 255, 0.05)',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  borderRadius: {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -1.2 },
    h2: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.8 },
    h3: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.5 },
    body: { fontSize: 16, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 24 },
    caption: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.2, lineHeight: 20 },
    small: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
    button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.2 },
  },
  shadows: {
    premium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 12,
    },
    glow: {
      shadowColor: '#818CF8',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    glass: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;
