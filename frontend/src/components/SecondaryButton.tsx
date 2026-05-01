import React from 'react';
import { StyleSheet, Text, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { theme } from '../constants/theme';

interface SecondaryButtonProps {
  title: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
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
        disabled && styles.disabled,
        style
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.secondary} />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.text, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.l,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  text: {
    ...theme.typography.button,
    color: theme.colors.secondary,
  },
  iconContainer: {
    marginRight: theme.spacing.s,
  },
  disabled: {
    opacity: 0.5,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  }
});
