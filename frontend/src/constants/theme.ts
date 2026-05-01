export const theme = {
  colors: {
    background: '#09090E', // Deep dark blue-tinted
    surface: '#15151E', // Slightly lighter
    surfaceLight: '#232330', // Higher elevation
    primary: '#8B5CF6', // Neon Purple
    primaryLight: '#A78BFA',
    secondary: '#06B6D4', // Neon Cyan
    accent: '#F43F5E', // Neon Rose
    text: '#FFFFFF', // Pure white
    textMuted: '#A1A1AA', // Zinc 400
    border: 'rgba(255, 255, 255, 0.1)',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 6,
    m: 12,
    l: 20,
    xl: 28,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -1 },
    h2: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
    h3: { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
    body: { fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.2, lineHeight: 24 },
    caption: { fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.3 },
    small: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5 },
    button: { fontSize: 16, fontWeight: '600' as const, letterSpacing: 0.5 },
  },
  shadows: {
    premium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
    neonPurple: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
    },
    neonCyan: {
      shadowColor: '#06B6D4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
