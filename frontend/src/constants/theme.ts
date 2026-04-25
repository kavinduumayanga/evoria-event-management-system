export const theme = {
  colors: {
    background: '#09090b', // Deep dark
    surface: '#18181b', // Slightly lighter dark
    surfaceLight: '#27272a',
    primary: '#8b5cf6', // Neon purple
    primaryLight: '#a78bfa',
    secondary: '#3b82f6', // Neon blue
    accent: '#ec4899', // Neon pink
    text: '#f8fafc',
    textMuted: '#94a3b8',
    border: '#27272a',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
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
    s: 4,
    m: 8,
    l: 16,
    xl: 24,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const },
    h2: { fontSize: 24, fontWeight: 'bold' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: 'normal' as const },
    caption: { fontSize: 14, fontWeight: 'normal' as const },
    small: { fontSize: 12, fontWeight: 'normal' as const },
    button: { fontSize: 16, fontWeight: '600' as const },
  },
  shadows: {
    neon: {
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    neonBlue: {
      shadowColor: '#3b82f6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;
