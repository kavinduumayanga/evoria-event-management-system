import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, Image, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState, HeaderBar, SectionBlock } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';
import { safeString } from '../../utils/safeText';

type EventListScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;
interface Props { navigation: EventListScreenNavigationProp; }

const CATEGORIES = [
  { id: '1', name: 'Tech', icon: '💻' },
  { id: '2', name: 'AI', icon: '🧠' },
  { id: '3', name: 'Climate', icon: '🌍' },
  { id: '4', name: 'Fitness', icon: '🏃' },
  { id: '5', name: 'Food & Drink', icon: '🍜' },
];

const CITIES = [
  { id: '1', name: 'Bengaluru', image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?q=80&w=300&auto=format&fit=crop' },
  { id: '2', name: 'Mumbai', image: 'https://images.unsplash.com/photo-1522206090980-4c8e515d9a98?q=80&w=300&auto=format&fit=crop' },
  { id: '3', name: 'Delhi', image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=300&auto=format&fit=crop' },
];

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const res = await EventService.searchEvents({});
      setEvents(res.data.events || []);
    } catch (e) {
      setError('Failed to load events.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <View style={styles.container}>
      <HeaderBar variant="discover" profileImageUrl="https://i.pravatar.cc/100" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchEvents(); }} tintColor="#FFF" />}
      >
        <SectionBlock title="Browse by Category" noPadding>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.categoryChip}>
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={styles.categoryText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SectionBlock>

        <SectionBlock title="Cities" rightAction={<Text style={styles.seeAll}>&gt;</Text>}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.citiesContent}>
            {CITIES.map(city => (
              <TouchableOpacity key={city.id} style={styles.cityCard}>
                <Image source={{ uri: city.image }} style={styles.cityImage} />
                <View style={styles.cityOverlay} />
                <View style={styles.cityIconWrap}><Text style={styles.cityIcon}>🏢</Text></View>
                <Text style={styles.cityName}>{city.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SectionBlock>

        <SectionBlock title="Featured Calendars">
          {events.length === 0 ? (
            <EmptyState title="No Events Found" message="Check back later." />
          ) : (
            events.map((item, index) => (
              <EventCard 
                key={safeString(item.id, String(index))} 
                event={item} 
                onPress={() => item.id && navigation.navigate('EventDetails', { eventId: item.id, publicSlug: item.publicSlug })} 
              />
            ))
          )}
        </SectionBlock>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingBottom: 120, // space for custom bottom bar
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(30,30,30,0.4)',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  seeAll: {
    color: '#A3A3A3',
    fontSize: 18,
  },
  citiesContent: {
    gap: 16,
    paddingBottom: 8,
  },
  cityCard: {
    width: 140,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cityImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cityOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cityIconWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  cityIcon: {
    fontSize: 14,
  },
  cityName: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
