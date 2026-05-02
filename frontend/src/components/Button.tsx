import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import { theme } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  fullWidth = true,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: [styles.primary, disabled && styles.disabled],
          text: styles.primaryText,
        };
      case 'secondary':
        return {
          container: [styles.secondary, disabled && styles.disabled],
          text: styles.secondaryText,
        };
      case 'outline':
        return {
          container: [styles.outline, disabled && styles.disabledOutline],
          text: [styles.outlineText, disabled && styles.disabledText],
        };
      case 'danger':
        return {
          container: [styles.danger, disabled && styles.disabled],
          text: styles.dangerText,
        };
      case 'ghost':
        return {
          container: [styles.ghost, disabled && styles.disabledGhost],
          text: [styles.ghostText, disabled && styles.disabledText],
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: styles.sizeSm, text: styles.textSm };
      case 'md':
        return { container: styles.sizeMd, text: styles.textMd };
      case 'lg':
        return { container: styles.sizeLg, text: styles.textLg };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator 
          color={variant === 'outline' || variant === 'ghost' ? theme.colors.primary : '#FFF'} 
          size="small" 
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[styles.baseText, variantStyles.text, sizeStyles.text, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderCurve: 'continuous',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  baseText: {
    ...theme.typography.button,
  },
  // Sizes
  sizeSm: { paddingVertical: 8, paddingHorizontal: 16, height: 36 },
  sizeMd: { paddingVertical: 12, paddingHorizontal: 24, height: 48 },
  sizeLg: { paddingVertical: 16, paddingHorizontal: 32, height: 56 },
  textSm: { fontSize: 14 },
  textMd: { fontSize: 16 },
  textLg: { fontSize: 18 },
  // Variants
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  primaryText: { color: theme.colors.textOnPrimary },
  secondary: {
    backgroundColor: theme.colors.surfaceLight,
  },
  secondaryText: { color: theme.colors.primaryDark },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  outlineText: { color: theme.colors.primary },
  danger: {
    backgroundColor: theme.colors.error,
  },
  dangerText: { color: theme.colors.textOnPrimary },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: { color: theme.colors.textSecondary },
  // Disabled
  disabled: {
    backgroundColor: theme.colors.borderStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledOutline: {
    borderColor: theme.colors.borderStrong,
  },
  disabledGhost: {
    opacity: 0.5,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
});
