import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>E</Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: '#A3A3A3',
    lineHeight: 20,
  },
});
