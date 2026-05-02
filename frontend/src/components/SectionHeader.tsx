import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// SECTION HEADER — Luma-style section labels
//
// Uses warm amber color for section labels with optional divider
// ============================================================

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'amber' | 'subtle';
  showDivider?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  action,
  style,
  variant = 'default',
  showDivider = false,
}) => {
  const titleColor = variant === 'amber'
    ? theme.colors.sectionLabel
    : variant === 'subtle'
    ? theme.colors.textSecondary
    : theme.colors.text;

  return (
    <View style={style}>
      {showDivider && <View style={styles.divider} />}
      <View style={styles.container}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.action}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  action: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
});
