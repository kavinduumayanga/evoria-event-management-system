import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  TouchableOpacity 
} from 'react-native';
import { theme } from '../constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(isPassword);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View 
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          style
        ]}
      >
        <TextInput
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isSecure || false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity 
            onPress={() => setIsSecure(!isSecure)}
            style={styles.eyeIcon}
          >
            {isSecure ? (
              <EyeOff size={20} color={theme.colors.textMuted} />
            ) : (
              <Eye size={20} color={theme.colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.m,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: theme.spacing.m,
    ...theme.typography.body,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    ...theme.shadows.neon,
    shadowOpacity: 0.1,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  eyeIcon: {
    padding: theme.spacing.s,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.error,
    marginTop: theme.spacing.s,
  },
});
