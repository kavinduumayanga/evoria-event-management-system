import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { theme } from '../constants/theme';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  variant?: 'solid' | 'outline' | 'ghost';
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  style,
  variant = 'ghost',
  disabled
}) => {
  const getBackgroundColor = () => {
    switch(variant) {
      case 'solid': return theme.colors.glass;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') return theme.colors.glassBorder;
    if (variant === 'solid') return theme.colors.glassBorder;
    return 'transparent';
  };

  return (
    <AnimatedPressable 
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() },
        disabled && styles.disabled,
        style
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  }
});
