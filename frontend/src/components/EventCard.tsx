import React from 'react';
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { Card } from './Card';
import { AnimatedPressable } from './AnimatedPressable';
import { StatusBadge } from './StatusBadge';
import { Event } from '../types';
import { theme } from '../constants/theme';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { resolveImageUrl } from '../utils/imageUrl';

// ============================================================
// EVENT CARD — Luma-style event cards
//
// featured: Large card with image, gradient overlay, info at bottom
//           Used in horizontal discovery carousels
//
// list:     Compact card with thumbnail + details
//           Used in vertical event lists
// ============================================================

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'featured' | 'list';
  actions?: React.ReactNode;
}

const getStatusType = (status: string): any => {
  switch (status) {
    case 'published': return 'success';
    case 'draft': return 'warning';
    case 'cancelled': return 'error';
    default: return 'neutral';
  }
};

// ------ Featured variant ------
const FeaturedCard: React.FC<EventCardProps> = ({ event, style }) => {
  const imageUri = resolveImageUrl(event.coverImage);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={[styles.featuredCard, style]}>
      {/* Cover image */}
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.featuredImage} />
      ) : (
        <View style={styles.featuredImagePlaceholder}>
          <Calendar size={32} color={theme.colors.textMuted} />
        </View>
      )}

      {/* Gradient overlay + content */}
      <View style={styles.featuredOverlay}>
        <View style={styles.featuredMeta}>
          <StatusBadge status={getStatusType(event.status)} label={event.status} />
          {event.isFeatured && <StatusBadge status="warning" label="Featured" />}
        </View>
        <View style={styles.featuredBottom}>
          <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
          <View style={styles.featuredDetailRow}>
            <Calendar size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.featuredDetail}>{formattedDate}</Text>
            {event.city && (
              <>
                <View style={styles.dot} />
                <MapPin size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.featuredDetail}>{event.city}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

// ------ List variant ------
const ListCard: React.FC<EventCardProps> = ({ event, style, actions }) => {
  const imageUri = resolveImageUrl(event.coverImage);
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const isCancelled = event.status === 'cancelled';

  return (
    <View
      style={[styles.listCard, isCancelled && styles.listCardCancelled, style]}
    >
      {/* Thumbnail */}
      <View style={styles.listThumbnail}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.listImage} />
        ) : (
          <View style={styles.listImagePlaceholder}>
            <Calendar size={20} color={theme.colors.textMuted} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>{event.title}</Text>
        <View style={styles.listMeta}>
          <Calendar size={12} color={theme.colors.textMuted} />
          <Text style={styles.listMetaText}>{formattedDate}</Text>
          {event.startTime && (
            <>
              <View style={styles.dot} />
              <Text style={styles.listMetaText}>{event.startTime}</Text>
            </>
          )}
        </View>
        {event.city && (
          <View style={styles.listMeta}>
            <MapPin size={12} color={theme.colors.textMuted} />
            <Text style={styles.listMetaText}>{event.city}</Text>
          </View>
        )}
      </View>

      {/* Optional actions */}
      {actions && (
        <View style={styles.listActions}>{actions}</View>
      )}
    </View>
  );
};

// ------ Main export ------
export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  style,
  variant = 'list',
  actions,
}) => {
  const CardComponent = variant === 'featured' ? FeaturedCard : ListCard;

  const content = (
    <CardComponent event={event} style={style} actions={actions} />
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} style={styles.pressable}>
        {content}
      </AnimatedPressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  pressable: {},

  // Featured card — Luma city-card style
  featuredCard: {
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  featuredImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  featuredImagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  featuredMeta: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  featuredBottom: {
    gap: theme.spacing.xs,
  },
  featuredTitle: {
    ...theme.typography.h3,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  featuredDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredDetail: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // List card — Luma calendar-list-item style
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listCardCancelled: {
    opacity: 0.5,
  },
  listThumbnail: {
    width: 68,
    height: 68,
    flexShrink: 0,
  },
  listImage: {
    width: 68,
    height: 68,
  },
  listImagePlaceholder: {
    width: 68,
    height: 68,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.s,
    gap: 3,
  },
  listTitle: {
    ...theme.typography.h3,
    fontSize: 15,
    color: theme.colors.text,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listMetaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  listActions: {
    paddingRight: theme.spacing.sm,
  },

  // Shared
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
    marginHorizontal: 2,
  },
});
