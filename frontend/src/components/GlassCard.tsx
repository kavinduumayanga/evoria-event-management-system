import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewProps, ViewStyle, StyleProp, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'light' | 'primary' | 'secondary';
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
  const slideAnim = useRef(new Animated.Value(animateEntrance ? 10 : 0)).current;

  useEffect(() => {
    if (animateEntrance) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [animateEntrance]);

  const getGradientColors = () => {
    switch (variant) {
      case 'light': return ['rgba(39, 39, 42, 0.8)', 'rgba(39, 39, 42, 0.6)']; // Zinc 800
      case 'primary': return ['rgba(129, 140, 248, 0.15)', 'rgba(129, 140, 248, 0.05)']; // Indigo 400
      case 'secondary': return ['rgba(167, 139, 250, 0.15)', 'rgba(167, 139, 250, 0.05)']; // Violet 400
      case 'dark':
      default: return ['rgba(24, 24, 27, 0.8)', 'rgba(24, 24, 27, 0.5)']; // Zinc 900
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'primary': return 'rgba(129, 140, 248, 0.3)';
      case 'secondary': return 'rgba(167, 139, 250, 0.3)';
      default: return theme.colors.glassBorder;
    }
  };

  const getGlow = () => {
    if (variant === 'primary' || variant === 'secondary') return theme.shadows.glow;
    return theme.shadows.glass;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: getBorderColor(),
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
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
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    padding: theme.spacing.l,
    overflow: 'hidden',
  },
});
