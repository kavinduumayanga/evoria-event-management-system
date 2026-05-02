import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge, BadgeStatus } from './StatusBadge';
import { theme } from '../constants/theme';
import { Calendar, Ticket, MapPin } from 'lucide-react-native';

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
  accentColor = theme.colors.primary,
}) => {
  return (
    <Card variant="raised" style={[styles.container, style]} noPadding>
      <View style={styles.inner}>
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1A` }]}>
          {icon}
        </View>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.l,
  },
  inner: {
    padding: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  value: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
});
