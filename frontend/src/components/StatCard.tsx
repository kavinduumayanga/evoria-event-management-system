import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { NeonCard } from './NeonCard';
import { theme } from '../constants/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  style,
  accentColor = theme.colors.primary 
}) => {
  return (
    <NeonCard style={[styles.container, style]} accentColor={accentColor}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </NeonCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  iconContainer: {
    marginRight: theme.spacing.m,
    padding: theme.spacing.s,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.borderRadius.m,
  },
  textContainer: {
    flex: 1,
  },
  value: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
