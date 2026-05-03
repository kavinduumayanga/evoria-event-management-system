import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import { Event } from '../types';
import { safeString } from '../utils/safeText';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
  variant?: string;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const imageUrl = safeString(event.coverImage);
  const title = safeString(event.title, 'Untitled Event');
  const description = safeString(event.description, 'No description available.');
  const eventDate = safeString(event.date, 'TBA');
  const eventTime = safeString(event.startTime, 'TBA');
  const rawLocation = (event as any).location;
  const eventLocation = typeof rawLocation === 'string'
    ? safeString(rawLocation, 'Online / TBA')
    : safeString(rawLocation?.name || event.city, 'Online / TBA');

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>E</Text>
          </View>
        )}
        <View style={styles.pricingBadge}>
          <Text style={styles.pricingText}>{event.pricingMode === 'free' ? 'FREE' : 'PAID'}</Text>
        </View>
        {event.status === 'cancelled' ? (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledBadgeText}>CANCELLED</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Calendar color="#A3A3A3" size={14} />
            <Text style={styles.detailText}>{eventDate}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock color="#A3A3A3" size={14} />
            <Text style={styles.detailText}>{eventTime}</Text>
          </View>
        </View>
        
        <View style={styles.detailItem}>
          <MapPin color="#A3A3A3" size={14} />
          <Text style={styles.detailText}>{eventLocation}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pricingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pricingText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelledBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(250,82,82,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cancelledBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  placeholderImage: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: '#A3A3A3',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#A3A3A3',
    fontSize: 13,
    marginLeft: 6,
  },
});
