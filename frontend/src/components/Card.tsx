import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewProps, ViewStyle, StyleProp, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

export type CardVariant = 'default' | 'raised' | 'outlined' | 'glass' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'dark' | 'light';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  animateEntrance?: boolean;
  noPadding?: boolean;
}

const GRADIENT_MAP: Record<string, readonly [string, string]> = {
  default:   ['#1C1A17', '#1C1A17'],
  raised:    ['#262320', '#201E1B'],
  outlined:  ['transparent', 'transparent'],
  glass:     ['rgba(28,26,23,0.85)', 'rgba(20,18,15,0.75)'],
  primary:   ['rgba(139,92,246,0.14)', 'rgba(139,92,246,0.05)'],
  secondary: ['rgba(167,139,250,0.14)', 'rgba(167,139,250,0.05)'],
  success:   ['rgba(76,175,80,0.12)', 'rgba(76,175,80,0.04)'],
  warning:   ['rgba(234,179,8,0.12)', 'rgba(234,179,8,0.04)'],
  error:     ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.04)'],
  dark:      ['#1C1A17', '#1C1A17'],
  light:     ['#262320', '#201E1B'],
};

const BORDER_MAP: Record<string, string> = {
  default:   theme.colors.border,
  raised:    theme.colors.border,
  outlined:  theme.colors.borderStrong,
  glass:     theme.colors.borderStrong,
  primary:   'rgba(139,92,246,0.25)',
  secondary: 'rgba(167,139,250,0.25)',
  success:   theme.colors.successBorder,
  warning:   theme.colors.warningBorder,
  error:     theme.colors.errorBorder,
  dark:      theme.colors.border,
  light:     theme.colors.border,
};

const SHADOW_MAP: Record<string, object> = {
  default: theme.shadows.sm, raised: theme.shadows.md, outlined: theme.shadows.none,
  glass: theme.shadows.md, primary: theme.shadows.glow, secondary: theme.shadows.glow,
  success: theme.shadows.sm, warning: theme.shadows.sm, error: theme.shadows.sm,
  dark: theme.shadows.sm, light: theme.shadows.md,
};

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', animateEntrance = false, noPadding = false, ...props }) => {
  const fade = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current;
  const slide = useRef(new Animated.Value(animateEntrance ? 8 : 0)).current;

  useEffect(() => {
    if (animateEntrance) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [animateEntrance, fade, slide]);

  return (
    <Animated.View style={[styles.container, { borderColor: BORDER_MAP[variant] ?? BORDER_MAP.default }, SHADOW_MAP[variant] ?? SHADOW_MAP.default, { opacity: fade, transform: [{ translateY: slide }] }, style]} {...props}>
      <LinearGradient colors={(GRADIENT_MAP[variant] ?? GRADIENT_MAP.default) as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={noPadding ? undefined : styles.inner}>{children}</View>
    </Animated.View>
  );
};

export const GlassCard: React.FC<ViewProps & { children: React.ReactNode; style?: StyleProp<ViewStyle>; variant?: 'dark' | 'light' | 'primary' | 'secondary'; animateEntrance?: boolean }> = ({ variant = 'dark', ...props }) => (
  <Card variant={variant as CardVariant} {...props} />
);

const styles = StyleSheet.create({
  container: { borderRadius: theme.borderRadius.l, borderWidth: 1, overflow: 'hidden' },
  inner: { padding: theme.spacing.m },
});
