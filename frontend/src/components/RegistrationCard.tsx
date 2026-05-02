import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge } from './StatusBadge';
import { theme } from '../constants/theme';
import { Mail, Calendar } from 'lucide-react-native';
import { formatSafeDate, safeStatus, safeString, safeTitle, safeUpper } from '../utils/safeText';

interface RegistrationCardProps {
  name?: string;
  email?: string;
  date?: string;
  status?: 'approved' | 'pending' | 'rejected' | string;
  avatarUrl?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
}

export const RegistrationCard: React.FC<RegistrationCardProps> = ({ 
  name, email, date, status, avatarUrl, onPress, style, actions 
}) => {
  const getStatus = (): any => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'neutral';
    }
  };

  const displayName = safeTitle(name, 'Guest');
  const displayEmail = safeString(email, 'Unknown email');
  const initial = safeUpper(displayName.trim().charAt(0), 'G');
  const statusLabel = safeStatus(status, 'unknown');
  const dateLabel = formatSafeDate(date, 'Date unavailable');

  const CardContent = (
    <GlassCard style={[styles.container, style]} variant="dark" animateEntrance>
      <View style={styles.headerRow}>
        <View style={styles.userContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.name}>{displayName}</Text>
            <View style={styles.iconTextRow}>
              <Mail size={12} color={theme.colors.textMuted} />
              <Text style={styles.email}>{displayEmail}</Text>
            </View>
          </View>
        </View>
        <StatusBadge status={getStatus()} label={statusLabel} />
      </View>

      <View style={styles.detailsRow}>
        <Calendar size={14} color={theme.colors.secondary} />
        <Text style={styles.detailText}>Registered: {dateLabel}</Text>
      </View>

      {actions && (
        <View style={styles.actionsContainer}>
          {actions}
        </View>
      )}
    </GlassCard>
  );

  if (onPress) {
    return <AnimatedPressable onPress={onPress}>{CardContent}</AnimatedPressable>;
  }
  return CardContent;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.m,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.s,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.m,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.m,
  },
  avatarText: {
    ...theme.typography.body,
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    ...theme.typography.h3,
    color: theme.colors.text,
    fontSize: 16,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  email: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  actionsContainer: {
    marginTop: theme.spacing.m,
    paddingTop: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.s,
  },
});
