import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { safeString, safeUpper } from '../utils/safeText';

// ============================================================
// AVATAR STACK — Luma-style overlapping circular avatars
//
// Shows N overlapping avatars with a "+X" count badge.
// ============================================================

interface AvatarStackProps {
  count: number;
  maxVisible?: number;
  size?: number;
  names?: string[];
  style?: StyleProp<ViewStyle>;
}

const AVATAR_COLORS = [
  '#E8D5A3',
  '#C4A265',
  '#D4B87A',
  '#BFA76D',
  '#DFC990',
];

export const AvatarStack: React.FC<AvatarStackProps> = ({
  count,
  maxVisible = 4,
  size = 36,
  names = [],
  style,
}) => {
  const visible = Math.min(maxVisible, count);
  const remaining = count - visible;
  const overlap = size * 0.3;
  const normalizedNames = names.map((name) => safeString(name, '')).filter((name) => name.length > 0);

  return (
    <View style={style}>
      <View style={styles.container}>
        {Array.from({ length: visible }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: visible - i,
              },
            ]}
          >
            <Text style={[styles.avatarInitial, { fontSize: size * 0.35 }]}>
              {normalizedNames[i]
                ? safeUpper(normalizedNames[i].charAt(0), '•')
                : '•'}
            </Text>
          </View>
        ))}
        {remaining > 0 && (
          <View
            style={[
              styles.avatar,
              styles.countBadge,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: -overlap,
                zIndex: 0,
              },
            ]}
          >
            <Text style={[styles.countText, { fontSize: size * 0.28 }]}>
              +{remaining}
            </Text>
          </View>
        )}
      </View>
      {normalizedNames.length > 0 && (
        <Text style={styles.namesList} numberOfLines={2}>
          {normalizedNames.slice(0, 3).join(', ')}
          {normalizedNames.length > 3 ? `, and ${Math.max(0, count - 3)} more` : ''}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  avatarInitial: {
    color: theme.colors.textOnPrimary,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.background,
  },
  countText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  namesList: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: theme.spacing.s,
  },
});
