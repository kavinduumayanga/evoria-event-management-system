import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// FormInput — Legacy alias pointing to Input
// This file exists purely for backward compatibility.
// All new code should import from Input.tsx directly.
// ============================================================

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
  hint?: string;
}

// Re-export from unified Input
export { Input as FormInput } from './Input';
