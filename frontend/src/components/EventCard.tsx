import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge } from './StatusBadge';
import { Event } from '../types';
import { theme } from '../constants/theme';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { formatSafeDate, formatSafeTime, safeLower, safeString, safeTitle, safeStatus } from '../utils/safeText';
import { resolveImageUrl } from '../utils/imageUrl';

interface EventCardProps {
  event: Partial<Event>;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
  variant?: 'default' | 'list' | 'compact';
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  style,
  actions,
  variant = 'default',
}) => {
  const bookingCount = Number.isFinite(Number(event.bookingCount)) ? Number(event.bookingCount) : 0;
  const capacity = Number.isFinite(Number(event.capacity)) ? Number(event.capacity) : 0;
  const isSoldOut = capacity > 0 && bookingCount >= capacity;
  const eventStatusLabel = safeStatus(event.status, 'pending');
  const eventTypeLabel = safeString(event.type, 'physical');
  const eventVisibilityLabel = safeString(event.visibility, 'public');
  const eventTitle = safeTitle(event.title, 'Untitled Event');
  const eventType = safeLower(event.type, 'physical');
  const locationLabel = eventType === 'online'
    ? 'Online'
    : safeString(event.city, 'Location not specified');
  const dateLabel = formatSafeDate(event.date, 'Date unavailable', { weekday: 'short', month: 'short', day: 'numeric' });
  const startTimeLabel = formatSafeTime(event.startTime, 'Time unavailable');
  const endTimeLabel = formatSafeTime(event.endTime, 'Time unavailable');
  const coverImage = resolveImageUrl(event.coverImage);
  const containerStyle = [
    styles.container,
    variant === 'compact' && styles.compactContainer,
    style,
  ];

  const cardContent = (
    <Card variant="raised" style={containerStyle} noPadding>
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={[styles.image, variant === 'compact' && styles.compactImage]} />
      ) : (
        <View style={[styles.image, styles.placeholder, variant === 'compact' && styles.compactImage]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{eventTitle}</Text>
          {isSoldOut ? (
            <StatusBadge status="error" label="Sold Out" />
          ) : (
            <StatusBadge status="success" label={eventStatusLabel} />
          )}
        </View>

        <View style={styles.row}>
          <Calendar size={14} color={theme.colors.primary} />
          <Text style={styles.rowText}>{dateLabel}</Text>
          <Clock size={14} color={theme.colors.secondary} />
          <Text style={styles.rowText}>{startTimeLabel} - {endTimeLabel}</Text>
        </View>

        <View style={styles.row}>
          <MapPin size={14} color={theme.colors.accent} />
          <Text style={styles.rowText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <StatusBadge status="neutral" label={eventTypeLabel} />
          <StatusBadge status="neutral" label={eventVisibilityLabel} />
          <View style={styles.attendeeMeta}>
            <Users size={12} color={theme.colors.textMuted} />
            <Text style={styles.attendeeMetaText}>{bookingCount}/{capacity || '--'}</Text>
          </View>
        </View>

        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </Card>
  );

  if (!onPress) return cardContent;
  return <AnimatedPressable onPress={onPress}>{cardContent}</AnimatedPressable>;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  compactContainer: {
    marginBottom: theme.spacing.s,
  },
  image: {
    width: '100%',
    height: 190,
    backgroundColor: theme.colors.surfaceLight,
  },
  compactImage: {
    height: 150,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  content: {
    padding: theme.spacing.m,
    gap: theme.spacing.s,
  },
  titleRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    alignItems: 'flex-start',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 26,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.s,
  },
  metaRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  attendeeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attendeeMetaText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  actions: {
    marginTop: theme.spacing.s,
    paddingTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.s,
  },
});
