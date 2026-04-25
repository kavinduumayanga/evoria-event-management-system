import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { Inbox } from 'lucide-react-native';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  message, 
  icon = <Inbox size={48} color={theme.colors.textMuted} />, 
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
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
  iconContainer: {
    marginBottom: theme.spacing.l,
    opacity: 0.5,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
