import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// ACTION BUTTONS ROW — Luma-style 3-column action buttons
//
// Matches the Register/Contact/More row from reference images.
// Each button has: icon on top, label below, outlined style.
// ============================================================

interface ActionButton {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'active';
}

interface ActionButtonsRowProps {
  buttons: ActionButton[];
  style?: StyleProp<ViewStyle>;
}

export const ActionButtonsRow: React.FC<ActionButtonsRowProps> = ({
  buttons,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {buttons.map((btn, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.button,
            index === 0 && styles.firstButton,
            btn.variant === 'active' && styles.activeButton,
          ]}
          onPress={btn.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            {btn.icon}
          </View>
          <Text
            style={[
              styles.label,
              btn.variant === 'active' && styles.activeLabel,
            ]}
            numberOfLines={1}
          >
            {btn.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.m,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.s,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    backgroundColor: 'transparent',
    gap: 6,
  },
  firstButton: {
    borderColor: theme.colors.borderStrong,
  },
  activeButton: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  iconWrap: {
    // Icon styling wrapper
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
    fontSize: 12,
  },
  activeLabel: {
    color: theme.colors.primary,
  },
});
