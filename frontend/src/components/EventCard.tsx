import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { Event } from '../types';
import { theme } from '../constants/theme';
import { safeString } from '../utils/safeText';
import { Card } from './Card';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const imageUrl = safeString(event.bannerImage);
  const title = safeString(event.title, 'Untitled Event');
  const location = safeString(event.location?.name, 'TBA');
  
  let dateStr = '';
  let timeStr = '';
  try {
    const d = new Date(event.startDate);
    dateStr = format(d, 'MMM d, yyyy');
    timeStr = format(d, 'h:mm a');
  } catch (e) {
    dateStr = 'TBA';
  }

  return (
    <Card style={styles.card} noPadding onPress={onPress} variant="elevated">
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>EVORIA</Text>
          </View>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{safeString(event.category, 'General')}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.dateRow}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateMonth}>{format(new Date(event.startDate), 'MMM').toUpperCase()}</Text>
            <Text style={styles.dateDay}>{format(new Date(event.startDate), 'dd')}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
          </View>
        </View>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Clock size={16} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>{timeStr}</Text>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={16} color={theme.colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>{location}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  placeholderImage: {
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...theme.typography.h2,
    color: theme.colors.textMuted,
    opacity: 0.5,
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    backdropFilter: 'blur(10px)',
  },
  categoryText: {
    ...theme.typography.caption,
    color: '#FFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: theme.spacing.m,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.m,
  },
  dateBadge: {
    backgroundColor: theme.colors.primarySubtle,
    borderRadius: theme.borderRadius.sm,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    marginRight: 12,
  },
  dateMonth: {
    ...theme.typography.overline,
    color: theme.colors.primary,
  },
  dateDay: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    marginTop: -2,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
});
