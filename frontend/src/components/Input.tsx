import React, { forwardRef, useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Animated } from 'react-native';
import { theme } from '../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: object;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, isPassword, containerStyle, style, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [secureText, setSecureText] = useState(isPassword);

    const focusAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      Animated.timing(focusAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [isFocused]);

    const borderColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [error ? theme.colors.error : theme.colors.borderStrong, error ? theme.colors.error : theme.colors.primary],
    });

    const backgroundColor = focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.surface, theme.colors.background],
    });

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Animated.View style={[styles.inputWrapper, { borderColor, backgroundColor }]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, leftIcon && styles.inputWithLeftIcon, style]}
            placeholderTextColor={theme.colors.textMuted}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            secureTextEntry={secureText}
            {...props}
          />
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </Animated.View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { marginBottom: theme.spacing.m, width: '100%' },
  label: { ...theme.typography.label, color: theme.colors.text, marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: theme.borderRadius.l,
    height: 56,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: theme.colors.text,
    ...theme.typography.bodyMedium,
  },
  inputWithLeftIcon: { marginLeft: 12 },
  leftIcon: { alignItems: 'center', justifyContent: 'center' },
  rightIcon: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  errorText: { ...theme.typography.caption, color: theme.colors.error, marginTop: 6, marginLeft: 4 },
});
