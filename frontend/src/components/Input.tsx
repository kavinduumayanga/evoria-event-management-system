import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { theme } from '../constants/theme';

// ============================================================
// INPUT — Unified input component (replaces both Input.tsx and FormInput.tsx)
//
// Features:
//   - Fixed 48dp height (single-line), auto-height (multiline)
//   - Label always visible above field
//   - Focus border animation (primary color)
//   - Error state with message below
//   - Left icon slot
//   - Password toggle built-in
//   - NO dynamic keys — stable component, never remounts on typing
//
// Usage:
//   <Input label="Email" value={email} onChangeText={setEmail} />
//   <Input label="Password" isPassword value={pw} onChangeText={setPw} />
//   <Input label="Bio" multiline numberOfLines={4} value={bio} onChangeText={setBio} />
// ============================================================

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  style,
  containerStyle,
  isPassword = false,
  multiline = false,
  numberOfLines = 1,
  hint,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? theme.colors.errorBorder : theme.colors.border,
      error ? theme.colors.error : theme.colors.borderFocus,
    ],
  });

  const inputHeight = multiline ? Math.max(80, numberOfLines * 24 + 24) : 48;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}

      <Animated.View
        style={[
          styles.fieldContainer,
          { borderColor, height: multiline ? undefined : inputHeight },
          multiline && { minHeight: inputHeight, paddingVertical: 12 },
          style,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIcon}>{leftIcon}</View>
        )}

        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            isPassword && styles.inputWithRightIcon,
            multiline && styles.multilineInput,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isPassword && !showPassword}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...textInputProps}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showPassword
              ? <EyeOff size={18} color={theme.colors.textMuted} />
              : <Eye size={18} color={theme.colors.textMuted} />
            }
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

// ============================================================
// Legacy aliases — FormInput maps to Input
// ============================================================
export const FormInput = Input;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  labelError: {
    color: theme.colors.error,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: theme.spacing.sm,
  },
  leftIcon: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  inputWithLeftIcon: {},
  inputWithRightIcon: {},
  multilineInput: {
    textAlignVertical: 'top',
  },
  error: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 2,
  },
  hint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
    marginLeft: 2,
  },
});
