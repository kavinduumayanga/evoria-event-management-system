import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { GlassCard } from './GlassCard';
import { SecondaryButton } from './SecondaryButton';

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
      <GlassCard style={styles.card} variant="dark" animateEntrance>
        <AlertCircle size={48} color={theme.colors.error} style={styles.icon} />
        <Text style={styles.message}>{message}</Text>
        
        {onRetry && (
          <SecondaryButton 
            title="Retry" 
            onPress={onRetry} 
            icon={<RefreshCw size={16} color={theme.colors.secondary} />}
            style={styles.retryButton}
          />
        )}
      </GlassCard>
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
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    borderColor: 'rgba(239, 68, 68, 0.3)', // subtle error border
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
    marginTop: theme.spacing.s,
  }
});
