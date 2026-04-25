import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle, 
  TouchableOpacityProps 
} from 'react-native';
import { theme } from '../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  style,
  textStyle,
  icon,
  disabled,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.surfaceLight;
    switch (variant) {
      case 'primary': return theme.colors.primary;
      case 'secondary': return theme.colors.secondary;
      case 'outline': return 'transparent';
      case 'ghost': return 'transparent';
      default: return theme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'secondary': return theme.colors.text;
      case 'outline': return theme.colors.primary;
      case 'ghost': return theme.colors.text;
      default: return theme.colors.text;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: theme.spacing.s, paddingHorizontal: theme.spacing.m };
      case 'large': return { paddingVertical: theme.spacing.l, paddingHorizontal: theme.spacing.xl };
      case 'medium':
      default: return { paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.l };
    }
  };

  const getBorder = () => {
    if (variant === 'outline') {
      return { borderWidth: 1, borderColor: disabled ? theme.colors.border : theme.colors.primary };
    }
    return {};
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        getPadding(),
        getBorder(),
        style,
        (variant === 'primary' || variant === 'secondary') && !disabled ? theme.shadows.neon : {},
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), marginLeft: icon ? theme.spacing.s : 0 },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...theme.typography.h3,
    textAlign: 'center',
  },
});
