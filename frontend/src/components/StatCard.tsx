import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
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
    <GlassCard style={[styles.container, style]} variant="dark">
      <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1A` }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </GlassCard>
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
    backgroundColor: theme.colors.surfaceLight,
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
