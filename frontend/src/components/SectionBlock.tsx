import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// SECTION BLOCK — Luma-style section with amber label + divider
//
// Matches the "Location", "About Event", "Host" section style
// from the reference images.
// ============================================================

interface SectionBlockProps {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  showDivider?: boolean;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  children,
  style,
  showDivider = true,
}) => {
  return (
    <View style={[styles.container, style]}>
      {showDivider && <View style={styles.divider} />}
      <Text style={styles.label}>{title}</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.l,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  label: {
    ...theme.typography.sectionLabel,
    color: theme.colors.sectionLabel,
    marginBottom: theme.spacing.sm,
  },
});
