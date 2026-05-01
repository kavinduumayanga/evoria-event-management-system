import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { NeonCard } from './NeonCard';
import { Booking } from '../types';
import { theme } from '../constants/theme';
import { Ticket, Calendar, DollarSign } from 'lucide-react-native';

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress, style, actions }) => {
  const approvalStatus = booking.approvalStatus || 'approved';
  const rsvpStatus = booking.rsvpStatus || 'going';
  const registrationType = booking.registrationType || (booking.totalAmount > 0 ? 'paid' : 'free');

  const getStatusColor = () => {
    switch (booking.bookingStatus) {
      case 'confirmed': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'cancelled': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  const getApprovalColor = () => {
    switch (approvalStatus) {
      case 'approved': return theme.colors.success;
      case 'pending': return theme.colors.warning;
      case 'rejected': return theme.colors.error;
      default: return theme.colors.textMuted;
    }
  };

  return (
    <NeonCard style={[styles.container, style]} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ticket size={18} color={theme.colors.primary} />
          <Text style={styles.title} numberOfLines={1}>Booking #{booking.id.substring(0, 8)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>{booking.bookingStatus.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Calendar size={14} color={theme.colors.secondary} />
          <Text style={styles.detailText}>Booked: {new Date(booking.bookingDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Approval:</Text>
          <View style={[styles.smallBadge, { borderColor: getApprovalColor(), backgroundColor: `${getApprovalColor()}20` }]}>
            <Text style={[styles.smallBadgeText, { color: getApprovalColor() }]}>{approvalStatus.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>RSVP:</Text>
          <Text style={styles.value}>{rsvpStatus.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Quantity:</Text>
          <Text style={styles.value}>{booking.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{registrationType.toUpperCase()}</Text>
        </View>
        <View style={styles.detailRow}>
          <DollarSign size={14} color={theme.colors.success} />
          <Text style={styles.detailText}>Total: ${booking.totalAmount}</Text>
        </View>
      </View>

      {actions && (
        <View style={styles.actionsContainer}>
          {actions}
        </View>
      )}
    </NeonCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    paddingBottom: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.s,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsContainer: {
    marginTop: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    width: 60,
  },
  value: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  smallBadge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
  },
  smallBadgeText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  actionsContainer: {
    marginTop: theme.spacing.m,
    paddingTop: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.s,
  },
});
