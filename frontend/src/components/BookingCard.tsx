import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { Booking } from '../types';
import { theme } from '../constants/theme';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { formatSafeDate, formatSafeTime, safeStatus, safeString, safeUpper } from '../utils/safeText';

interface BookingCardProps {
  booking: Partial<Booking>;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, style, actions }) => {
  const isWaitlisted = Boolean(booking.isWaitlisted);
  const bookingStatus = isWaitlisted
    ? 'WAITLISTED'
    : safeUpper(booking.bookingStatus, 'PENDING');
  const bookingId = safeString(booking.eventId, '');
  const title = booking.event?.title || (bookingId ? `Event ${bookingId.slice(0, 8)}` : 'Untitled Event');
  const location = safeString(booking.event?.location, 'Location not specified');
  const dateLabel = formatSafeDate(booking.event?.date, 'Date unavailable', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const startTimeLabel = formatSafeTime(booking.event?.startTime, 'Time unavailable');
  const endTimeLabel = formatSafeTime(booking.event?.endTime, 'Time unavailable');
  const rsvpLabel = safeUpper(safeStatus(booking.rsvpStatus, 'unknown').replace('_', ' '), 'UNKNOWN');
  const quantityLabel = Number.isFinite(Number(booking.quantity)) ? Number(booking.quantity) : 0;

  const statusColor = isWaitlisted
    ? theme.colors.warning
    : booking.bookingStatus === 'confirmed'
      ? theme.colors.success
      : booking.bookingStatus === 'cancelled'
        ? theme.colors.error
        : theme.colors.warning;

  return (
    <Card variant="raised" style={[styles.container, style]}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={[styles.statusPill, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{bookingStatus}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Calendar size={14} color={theme.colors.primary} />
        <Text style={styles.metaText}>{dateLabel}</Text>
      </View>
      <View style={styles.metaRow}>
        <Clock size={14} color={theme.colors.secondary} />
        <Text style={styles.metaText}>{startTimeLabel} - {endTimeLabel}</Text>
      </View>
      <View style={styles.metaRow}>
        <MapPin size={14} color={theme.colors.accent} />
        <Text style={styles.metaText} numberOfLines={1}>{location}</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.badge}>RSVP: {rsvpLabel}</Text>
        <Text style={styles.badge}>Qty: {quantityLabel}</Text>
      </View>

      {actions ? <View style={styles.actionsContainer}>{actions}</View> : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  topRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    alignItems: 'flex-start',
    marginBottom: theme.spacing.s,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 24,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.xs,
  },
  badge: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  actionsContainer: {
    marginTop: theme.spacing.m,
    paddingTop: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.s,
  },
});
