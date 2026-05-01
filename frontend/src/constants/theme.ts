export const theme = {
  colors: {
    background: '#09090B', // Deepest dark
    surface: '#121214', // Elevated dark
    surfaceLight: '#1E1E20', // Higher elevation
    primary: '#E5E5E5', // Premium Off-White for contrast
    primaryLight: '#FFFFFF',
    secondary: '#38BDF8', // Icy blue for subtle accents
    accent: '#818CF8', // Muted violet
    text: '#FAFAFA', // Soft white
    textMuted: '#A1A1AA', // Zinc 400
    border: 'rgba(255, 255, 255, 0.08)', // Ultra-subtle border
    error: '#F87171', // Soft red
    success: '#34D399', // Soft emerald
    warning: '#FBBF24', // Soft amber
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
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    glow: {
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;
