import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'flat' | 'outline' | 'raised';
  noPadding?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  noPadding = false,
  onPress,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return [styles.elevated, theme.shadows.md];
      case 'raised':
        return [styles.raised, theme.shadows.lg];
      case 'flat':
        return styles.flat;
      case 'outline':
        return styles.outline;
      default:
        return [styles.elevated, theme.shadows.md];
    }
  };

  const containerStyle = [
    styles.container,
    getVariantStyles(),
    !noPadding && styles.padding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceRaised,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  padding: {
    padding: theme.spacing.l,
  },
  elevated: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  raised: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  flat: {
    backgroundColor: theme.colors.surfaceLight,
  },
  outline: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
