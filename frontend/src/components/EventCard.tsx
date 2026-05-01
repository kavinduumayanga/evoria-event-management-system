import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { GlassCard } from './GlassCard';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge } from './StatusBadge';
import { Event } from '../types';
import { theme } from '../constants/theme';
import { Calendar, Users, Clock } from 'lucide-react-native';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  actions?: React.ReactNode;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, style, actions }) => {
  const isCancelled = event.status === 'cancelled';
  const isPublished = event.status === 'published';
  const moderationStatus = event.moderationStatus || 'approved';

  const getStatus = (): any => {
    switch (event.status) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  const getModerationStatus = (): any => {
    switch (moderationStatus) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'neutral';
    }
  };

  const CardContent = (
    <GlassCard
      style={[
        styles.container,
        isPublished && styles.publishedContainer,
        isCancelled && styles.cancelledContainer,
        style,
      ]}
      variant={event.isFeatured ? 'neonPurple' : 'dark'}
      animateEntrance
    >
      {event.coverImage ? (
        <Image source={{ uri: event.coverImage }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <StatusBadge status={getStatus()} label={event.status} />
        </View>

        <View style={styles.badgeRow}>
          {event.isFeatured && (
            <StatusBadge status="warning" label="FEATURED" />
          )}
          <StatusBadge status="neutral" label={event.type || 'physical'} />
          <StatusBadge status="neutral" label={event.visibility} />
          <StatusBadge status={getModerationStatus()} label={moderationStatus} />
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Calendar size={14} color={theme.colors.primaryLight} />
            <Text style={styles.detailText}>{new Date(event.date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={14} color={theme.colors.secondary} />
            <Text style={styles.detailText}>{event.startTime} - {event.endTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Users size={14} color={theme.colors.accent} />
            <Text style={styles.detailText}>Capacity: {event.capacity}</Text>
          </View>
        </View>
        
        {actions && (
          <View style={styles.actionsContainer}>
            {actions}
          </View>
        )}
      </View>
    </GlassCard>
  );

  if (onPress) {
    return <AnimatedPressable onPress={onPress}>{CardContent}</AnimatedPressable>;
  }
  return CardContent;
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    marginBottom: theme.spacing.m,
  },
  publishedContainer: {
    borderColor: `${theme.colors.success}66`,
    borderWidth: 1,
  },
  cancelledContainer: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: 140,
  },
  imagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: theme.colors.textMuted,
    ...theme.typography.caption,
  },
  content: {
    padding: theme.spacing.m,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  title: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.s,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
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
  badgeRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.s,
    gap: theme.spacing.s,
    flexWrap: 'wrap',
  },
  metaBadge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
  },
  metaBadgeText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.s,
  },
  actionsContainer: {
    marginTop: theme.spacing.m,
    paddingTop: theme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
