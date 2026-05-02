import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'flat' | 'outline' | 'raised' | 'primary';
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
      case 'primary':
        return [styles.raised, { borderColor: theme.colors.primary, borderWidth: 1 }];
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  padding: {
    padding: 24,
  },
  elevated: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  raised: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  flat: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
