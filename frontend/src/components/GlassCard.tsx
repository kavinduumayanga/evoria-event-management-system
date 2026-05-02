import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewProps, ViewStyle, StyleProp, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

// Legacy GlassCard — purple accent version
type GlassCardVariant = 'dark' | 'light' | 'primary' | 'secondary';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassCardVariant;
  animateEntrance?: boolean;
}

const GRADIENT_MAP: Record<GlassCardVariant, readonly [string, string]> = {
  dark:      ['#1C1A17', '#1C1A17'],
  light:     ['#262320', '#201E1B'],
  primary:   ['rgba(139,92,246,0.14)', 'rgba(139,92,246,0.05)'],
  secondary: ['rgba(167,139,250,0.14)', 'rgba(167,139,250,0.05)'],
};

const BORDER_MAP: Record<GlassCardVariant, string> = {
  dark: theme.colors.border, light: theme.colors.border,
  primary: 'rgba(139,92,246,0.25)', secondary: 'rgba(167,139,250,0.25)',
};

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, variant = 'dark', animateEntrance = false, ...props }) => {
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
    <Animated.View style={[styles.container, { borderColor: BORDER_MAP[variant] }, theme.shadows.sm, { opacity: fade, transform: [{ translateY: slide }] }, style]} {...props}>
      <LinearGradient colors={GRADIENT_MAP[variant] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.inner}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { borderRadius: theme.borderRadius.l, borderWidth: 1, overflow: 'hidden' },
  inner: { padding: theme.spacing.m },
});
