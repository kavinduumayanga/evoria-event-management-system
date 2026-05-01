import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewProps, ViewStyle, StyleProp, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'light' | 'neonPurple' | 'neonCyan';
  animateEntrance?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'dark',
  animateEntrance = false,
  ...props
}) => {
  const fadeAnim = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current;

  useEffect(() => {
    if (animateEntrance) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [animateEntrance]);

  const getGradientColors = () => {
    switch (variant) {
      case 'light': return ['rgba(35, 35, 48, 0.8)', 'rgba(25, 25, 35, 0.6)'];
      case 'neonPurple': return ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'];
      case 'neonCyan': return ['rgba(6, 182, 212, 0.15)', 'rgba(6, 182, 212, 0.05)'];
      case 'dark':
      default: return ['rgba(21, 21, 30, 0.8)', 'rgba(15, 15, 20, 0.6)'];
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'neonPurple': return 'rgba(139, 92, 246, 0.4)';
      case 'neonCyan': return 'rgba(6, 182, 212, 0.4)';
      default: return theme.colors.border;
    }
  };

  const getGlow = () => {
    if (variant === 'neonPurple') return theme.shadows.neonPurple;
    if (variant === 'neonCyan') return theme.shadows.neonCyan;
    return {};
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: getBorderColor(),
          opacity: fadeAnim,
        },
        getGlow(),
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={getGradientColors() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    padding: theme.spacing.m,
    overflow: 'hidden',
  },
});
