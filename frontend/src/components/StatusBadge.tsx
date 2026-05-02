import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// STATUS BADGE — Semantic-only status indicators
//
// Variants: success | warning | error | info | neutral
//
// Shows: colored dot + uppercase label text
// Typography: overline (11px, weight 600, letter-spacing 0.8)
//
// Usage:
//   <StatusBadge status="success" label="Confirmed" />
//   <StatusBadge status="warning" label="Pending" />
//   <StatusBadge status="error" label="Cancelled" />
// ============================================================

export type BadgeStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
}

const CONFIG: Record<BadgeStatus, { bg: string; dot: string; text: string }> = {
  success: {
    bg: theme.colors.successSubtle,
    dot: theme.colors.success,
    text: theme.colors.success,
  },
  warning: {
    bg: theme.colors.warningSubtle,
    dot: theme.colors.warning,
    text: theme.colors.warning,
  },
  error: {
    bg: theme.colors.errorSubtle,
    dot: theme.colors.error,
    text: theme.colors.error,
  },
  info: {
    bg: theme.colors.infoSubtle,
    dot: theme.colors.info,
    text: theme.colors.info,
  },
  neutral: {
    bg: 'rgba(255,255,255,0.07)',
    dot: theme.colors.textMuted,
    text: theme.colors.textSecondary,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = CONFIG[status] ?? CONFIG.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    ...theme.typography.overline,
  },
});
