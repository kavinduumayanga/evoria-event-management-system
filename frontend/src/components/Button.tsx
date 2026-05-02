import React, { useRef } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  Animated,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// BUTTON — Luma-style button system
//
// Variants:  primary | secondary | ghost | danger | outline
// Sizes:     sm (34) | md (44) | lg (52)
// ============================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

const HEIGHT_MAP: Record<ButtonSize, number> = {
  sm: 34,
  md: 44,
  lg: 52,
};

const FONT_MAP: Record<ButtonSize, number> = {
  sm: 13,
  md: 14,
  lg: 15,
};

const H_PAD_MAP: Record<ButtonSize, number> = {
  sm: 14,
  md: 20,
  lg: 24,
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  iconRight = false,
  style,
  fullWidth = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 70,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const isDisabled = disabled || isLoading;
  const height = HEIGHT_MAP[size];
  const fontSize = FONT_MAP[size];
  const hPad = H_PAD_MAP[size];

  const containerStyle = [
    styles.base,
    styles[variant] || styles.primary,
    { height, paddingHorizontal: hPad },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.label,
    styles[`${variant}Label` as keyof typeof styles],
    { fontSize },
    isDisabled && styles.disabledLabel,
  ];

  const loaderColor =
    variant === 'primary' || variant === 'danger'
      ? theme.colors.textOnPrimary
      : theme.colors.primary;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], ...(fullWidth ? { width: '100%' } : {}) }}>
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
      >
        {isLoading ? (
          <ActivityIndicator color={loaderColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && !iconRight && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={textStyle}>{title}</Text>
            {icon && iconRight && <View style={styles.iconRight}>{icon}</View>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================
// Legacy aliases
// ============================================================

interface LegacyButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton: React.FC<LegacyButtonProps> = (props) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton: React.FC<LegacyButtonProps> = (props) => (
  <Button {...props} variant="secondary" />
);

export const GhostButton: React.FC<LegacyButtonProps> = (props) => (
  <Button {...props} variant="ghost" />
);

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.round, // Fully rounded buttons
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },

  // === VARIANT BACKGROUNDS ===
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.glow,
  },
  secondary: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.error,
  },

  // === VARIANT LABELS ===
  label: {
    ...theme.typography.button,
    fontWeight: '600',
  },
  primaryLabel: {
    color: theme.colors.textOnPrimary,
  },
  secondaryLabel: {
    color: theme.colors.text,
  },
  outlineLabel: {
    color: theme.colors.text,
  },
  ghostLabel: {
    color: theme.colors.primary,
  },
  dangerLabel: {
    color: theme.colors.textOnPrimary,
  },

  // === DISABLED ===
  disabled: {
    opacity: 0.45,
  },
  disabledLabel: {},
});
