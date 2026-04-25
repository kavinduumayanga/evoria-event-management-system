import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';

type EventListScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;

interface Props {
  navigation: EventListScreenNavigationProp;
}

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setError(null);
      const response = await EventService.getEvents();
      // Only show published public events for attendees
      const publishedEvents = response.data.events.filter(
        (e: Event) => e.status === 'published' && e.visibility === 'public'
      );
      setEvents(publishedEvents);
    } catch (err) {
      console.error('Failed to fetch events', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Events</Text>
        <Text style={styles.headerSubtitle}>Find what's happening near you</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard 
            event={item} 
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })} 
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Events Found" message="Check back later for exciting new events." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.s,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
});
