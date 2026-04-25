import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { AlertCircle, RefreshCw } from 'lucide-react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = 'Something went wrong. Please try again.', 
  onRetry, 
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <AlertCircle size={48} color={theme.colors.error} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
      
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <RefreshCw size={16} color={theme.colors.text} style={styles.retryIcon} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  icon: {
    marginBottom: theme.spacing.m,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.l,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  retryIcon: {
    marginRight: theme.spacing.s,
  },
  retryText: {
    ...theme.typography.button,
    color: theme.colors.text,
  },
});
