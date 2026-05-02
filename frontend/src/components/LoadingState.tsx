import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// LOADING STATE — Animated shimmer skeleton
// Shows a pulsing orb as a universal loading indicator.
//
// Usage:
//   <LoadingState />
//   <LoadingState size={32} color={theme.colors.primary} />
// ============================================================

interface LoadingStateProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  style,
  color = theme.colors.primary,
  size = 40,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.orb,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: pulseAnim,
            transform: [{ scale: pulseAnim }],
          },
          theme.shadows.glow,
        ]}
      />
    </View>
  );
};

// ============================================================
// SKELETON — Shimmer placeholder for content loading
// ============================================================
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = theme.borderRadius.xs,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceRaised,
          opacity: shimmerAnim,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  orb: {
    shadowColor: theme.colors.primary,
  },
});
