import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from './AnimatedPressable';
import { theme } from '../constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  style,
  textStyle,
  icon,
  isLoading,
  disabled
}) => {
  return (
    <AnimatedPressable 
      onPress={onPress} 
      disabled={disabled || isLoading}
      style={[
        styles.container, 
        !disabled ? theme.shadows.glow : {},
        disabled && styles.disabled,
        style
      ]}
    >
      <LinearGradient
        colors={disabled ? [theme.colors.surfaceLight, theme.colors.surfaceLight] : [theme.colors.primaryLight, theme.colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {isLoading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <>
          {icon && icon}
          <Text style={[styles.text, { marginLeft: icon ? theme.spacing.s : 0 }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    overflow: 'hidden',
  },
  text: {
    ...theme.typography.button,
    color: theme.colors.text,
  },
  disabled: {
    opacity: 0.5,
  }
});
