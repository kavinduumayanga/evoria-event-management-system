import React, { forwardRef, useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, Animated, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { theme } from '../constants/theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: object;
  hint?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, isPassword, containerStyle, hint, style, ...props }, ref) => {
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
      outputRange: [error ? theme.colors.error : 'rgba(255,255,255,0.08)', error ? theme.colors.error : 'rgba(255,255,255,0.2)'],
    });

    const backgroundColor = 'rgba(30,30,30,0.8)';

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Animated.View style={[styles.inputWrapper, { borderColor, backgroundColor }]}>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, leftIcon ? styles.inputWithLeftIcon : undefined, style]}
            placeholderTextColor={theme.colors.textMuted}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
            onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
            secureTextEntry={secureText}
            {...props}
          />
          {isPassword ? (
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              style={styles.rightIcon}
              activeOpacity={0.7}
            >
              {secureText ? (
                <EyeOff size={20} color={theme.colors.textMuted} />
              ) : (
                <Eye size={20} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          ) : (
            rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>
          )}
        </Animated.View>
        {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { marginBottom: 16, width: '100%' },
  label: { color: '#A3A3A3', fontSize: 14, fontWeight: '500', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 16,
  },
  inputWithLeftIcon: { marginLeft: 12 },
  leftIcon: { alignItems: 'center', justifyContent: 'center' },
  rightIcon: { alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  hintText: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 6, marginLeft: 4 },
  errorText: { ...theme.typography.caption, color: theme.colors.error, marginTop: 6, marginLeft: 4 },
});
