import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge } from './StatusBadge';
import { Event } from '../types';
import { theme } from '../constants/theme';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
  variant?: 'default' | 'list' | 'compact';
}

const formatEventDate = (dateValue: string) => {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  style,
  actions,
  variant = 'default',
}) => {
  const isSoldOut = Number(event.bookingCount || 0) >= Number(event.capacity || 0);
  const containerStyle = [
    styles.container,
    variant === 'compact' && styles.compactContainer,
    style,
  ];

  const cardContent = (
    <Card variant="raised" style={containerStyle} noPadding>
      {event.coverImage ? (
        <Image source={{ uri: event.coverImage }} style={[styles.image, variant === 'compact' && styles.compactImage]} />
      ) : (
        <View style={[styles.image, styles.placeholder, variant === 'compact' && styles.compactImage]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          {isSoldOut ? (
            <StatusBadge status="error" label="Sold Out" />
          ) : (
            <StatusBadge status="success" label={event.status.toUpperCase()} />
          )}
        </View>

        <View style={styles.row}>
          <Calendar size={14} color={theme.colors.primary} />
          <Text style={styles.rowText}>{formatEventDate(event.date)}</Text>
          <Clock size={14} color={theme.colors.secondary} />
          <Text style={styles.rowText}>{event.startTime} - {event.endTime}</Text>
        </View>

        <View style={styles.row}>
          <MapPin size={14} color={theme.colors.accent} />
          <Text style={styles.rowText} numberOfLines={1}>
            {event.type === 'online' ? 'Online' : (event.city || 'Venue')}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <StatusBadge status="neutral" label={event.type.toUpperCase()} />
          <StatusBadge status="neutral" label={event.visibility.toUpperCase()} />
          <View style={styles.attendeeMeta}>
            <Users size={12} color={theme.colors.textMuted} />
            <Text style={styles.attendeeMetaText}>{event.bookingCount}/{event.capacity}</Text>
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
