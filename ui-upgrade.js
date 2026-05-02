const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'frontend/src/components');
const screensDir = path.join(__dirname, 'frontend/src/screens');
const themePath = path.join(__dirname, 'frontend/src/constants/theme.ts');

const THEME_CODE = `
export const theme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    surfaceRaised: '#FFFFFF',
    surfaceOverlay: 'rgba(255,255,255,0.95)',
    border: '#E9ECEF',
    borderStrong: '#DEE2E6',
    borderFocus: '#4C6EF5',
    primary: '#4C6EF5', // Vibrant modern blue
    primaryLight: '#748FFC',
    primaryDark: '#364FC7',
    primaryGlow: 'rgba(76, 110, 245, 0.25)',
    primarySubtle: 'rgba(76, 110, 245, 0.12)',
    accent: '#FF6B6B', // Coral accent
    accentLight: '#FF8787',
    accentGlow: 'rgba(255, 107, 107, 0.2)',
    accentSubtle: 'rgba(255, 107, 107, 0.1)',
    text: '#212529',
    textSecondary: '#495057',
    textMuted: '#868E96',
    textOnPrimary: '#FFFFFF',
    textOnAccent: '#FFFFFF',
    sectionLabel: '#868E96',
    success: '#20C997',
    successSubtle: 'rgba(32, 201, 151, 0.12)',
    successBorder: 'rgba(32, 201, 151, 0.3)',
    warning: '#FCC419',
    warningSubtle: 'rgba(252, 196, 25, 0.12)',
    warningBorder: 'rgba(252, 196, 25, 0.3)',
    error: '#FA5252',
    errorSubtle: 'rgba(250, 82, 82, 0.12)',
    errorBorder: 'rgba(250, 82, 82, 0.3)',
    info: '#339AF0',
    infoSubtle: 'rgba(51, 154, 240, 0.12)',
    infoBorder: 'rgba(51, 154, 240, 0.3)',
    tabBarBg: '#FFFFFF',
    tabBarActive: '#4C6EF5',
    tabBarInactive: '#ADB5BD',
    surfaceLight: '#F1F3F5',
    glass: 'rgba(255,255,255,0.85)',
    glassBorder: 'rgba(0,0,0,0.05)',
    secondary: '#FF6B6B',
  },
  spacing: {
    xs: 4, s: 8, sm: 12, m: 16, base: 16, l: 20, xl: 24, '2xl': 32, xxl: 40, '3xl': 48, xxxl: 64, '4xl': 80,
  },
  borderRadius: {
    xs: 6, s: 10, sm: 14, m: 18, l: 24, xl: 32, xxl: 40, round: 9999,
  },
  typography: {
    display: { fontSize: 36, fontWeight: '800', lineHeight: 44, letterSpacing: -1 },
    h1: { fontSize: 28, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700', lineHeight: 30, letterSpacing: -0.4 },
    h3: { fontSize: 18, fontWeight: '700', lineHeight: 26, letterSpacing: -0.3 },
    body: { fontSize: 16, fontWeight: '400', lineHeight: 24, letterSpacing: 0 },
    bodyMedium: { fontSize: 16, fontWeight: '500', lineHeight: 24, letterSpacing: 0 },
    label: { fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0 },
    caption: { fontSize: 13, fontWeight: '400', lineHeight: 18, letterSpacing: 0 },
    overline: { fontSize: 11, fontWeight: '700', lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' },
    button: { fontSize: 16, fontWeight: '700', lineHeight: 24, letterSpacing: 0 },
    sectionLabel: { fontSize: 14, fontWeight: '700', lineHeight: 20, letterSpacing: 0.5, textTransform: 'uppercase' },
    small: { fontSize: 12, fontWeight: '500', lineHeight: 16, letterSpacing: 0 },
  },
  shadows: {
    none: { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 8 },
    glow: { shadowColor: '#4C6EF5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
    accentGlow: { shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 8 },
    premium: { shadowColor: '#000000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 40, elevation: 12 },
    glass: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  },
};
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
`;

fs.writeFileSync(themePath, THEME_CODE);
console.log('Updated theme.ts');
