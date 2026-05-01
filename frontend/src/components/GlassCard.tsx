import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'light' | 'neon';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'dark',
  ...props
}) => {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'light': return 'rgba(30, 30, 32, 0.7)'; // surfaceLight with opacity
      case 'neon': return 'rgba(56, 189, 248, 0.1)'; // secondary with opacity
      case 'dark':
      default: return 'rgba(18, 18, 20, 0.7)'; // surface with opacity
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'neon': return 'rgba(56, 189, 248, 0.3)';
      default: return theme.colors.border;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        variant === 'neon' ? theme.shadows.glow : {},
        style,
      ]}
      {...props}
    >
      {children}
    </View>
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
