import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './Card';
import { StatusBadge } from './StatusBadge';
import { theme } from '../constants/theme';
import { Mail, Phone } from 'lucide-react-native';

interface GuestCardProps {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  status?: 'arrived' | 'expected' | 'no_show';
  avatarUrl?: string;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
}

export const GuestCard: React.FC<GuestCardProps> = ({ 
  name, email, phone, role, status, avatarUrl, style, actions 
}) => {
  const getStatus = (): any => {
    switch (status) {
      case 'arrived': return 'success';
      case 'expected': return 'info';
      case 'no_show': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <GlassCard style={[styles.container, style]} variant="dark" animateEntrance>
      <View style={styles.row}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            {role && <StatusBadge status="neutral" label={role} />}
          </View>
          
          <View style={styles.contactRow}>
            <Mail size={12} color={theme.colors.textMuted} />
            <Text style={styles.contactText} numberOfLines={1}>{email}</Text>
          </View>
          
          {phone && (
            <View style={styles.contactRow}>
              <Phone size={12} color={theme.colors.textMuted} />
              <Text style={styles.contactText}>{phone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footerRow}>
        {status && <StatusBadge status={getStatus()} label={status.replace('_', ' ')} />}
        {actions && (
          <View style={styles.actionsContainer}>
            {actions}
          </View>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: theme.spacing.m,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.m,
  },
  avatarText: {
    ...theme.typography.h3,
    color: theme.colors.secondary,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: 'bold',
    flex: 1,
    marginRight: theme.spacing.s,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.m,
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  }
});
