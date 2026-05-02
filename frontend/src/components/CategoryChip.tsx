import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// CATEGORY CHIP — Luma-style pill chip with emoji + label
//
// Matches the "Tech", "AI", "Climate" category pills
// from the Discover screen reference.
// ============================================================

interface CategoryChipProps {
  emoji?: string;
  label: string;
  onPress?: () => void;
  isActive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  emoji,
  label,
  onPress,
  isActive = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isActive && styles.chipActive,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.label, isActive && styles.labelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: 'transparent',
    gap: 6,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  labelActive: {
    color: theme.colors.primary,
  },
});
