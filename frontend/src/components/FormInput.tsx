import React, { useRef, useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TextInputProps, 
  Animated
} from 'react-native';
import { theme } from '../constants/theme';
import { Eye, EyeOff } from 'lucide-react-native';
import { IconButton } from './IconButton';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  isPassword,
  style,
  onFocus,
  onBlur,
  leftIcon,
  ...props
}) => {
  const inputRef = useRef<TextInput>(null);
  const [isSecure, setIsSecure] = useState(isPassword);
  
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus: NonNullable<TextInputProps['onFocus']> = (event) => {
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (onFocus) onFocus(event);
  };

  const handleBlur: NonNullable<TextInputProps['onBlur']> = (event) => {
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (onBlur) onBlur(event);
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? theme.colors.error : theme.colors.glassBorder, error ? theme.colors.error : theme.colors.primary]
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Animated.View 
        style={[
          styles.inputContainer,
          { borderColor },
          style
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isSecure || false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        
        {isPassword && (
          <IconButton 
            icon={isSecure ? <EyeOff size={20} color={theme.colors.textMuted} /> : <Eye size={20} color={theme.colors.textMuted} />}
            onPress={() => setIsSecure(!isSecure)}
          />
        )}
      </Animated.View>
      
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
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderRadius: theme.borderRadius.l,
    paddingHorizontal: theme.spacing.m,
  },
  leftIcon: {
    marginRight: theme.spacing.s,
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: theme.spacing.m,
    ...theme.typography.body,
  },
  errorText: {
    ...theme.typography.small,
    color: theme.colors.error,
    marginTop: theme.spacing.s,
  },
});
