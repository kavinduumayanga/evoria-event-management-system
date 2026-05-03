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

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = useCallback(async (query: string = '') => {
    try {
      setError(null);
      const res = await EventService.searchEvents({ q: query });
      setEvents(res.data.events || []);
    } catch (e) {
      setError('Failed to load events.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchEvents]);

  useFocusEffect(useCallback(() => { fetchEvents(searchQuery); }, [fetchEvents, searchQuery]));

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <View style={styles.container}>
      <HeaderBar variant="discover" onSearchChange={setSearchQuery} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchEvents(searchQuery); }} tintColor="#FFF" />}
      >
        <SectionBlock title="Featured Events">
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
});
