import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState, Input } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';
import { safeString } from '../../utils/safeText';
import { Search } from 'lucide-react-native';

type EventListScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;
interface Props { navigation: EventListScreenNavigationProp; }

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const res = await EventService.searchEvents({ q: search || undefined });
      setEvents(res.data.events || []);
    } catch (e) {
      setError('Failed to load events.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer backgroundColor={theme.colors.surfaceLight}>
      <FlatList
        data={events}
        keyExtractor={(item, index) => safeString(item.id, String(index))}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchEvents(); }} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Discover Events</Text>
            <Input
              placeholder="Search for events..."
              value={search}
              onChangeText={setSearch}
              onEndEditing={fetchEvents}
              leftIcon={<Search size={20} color={theme.colors.textMuted} />}
              containerStyle={styles.searchBox}
              style={styles.searchInput}
            />
          </View>
        }
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => item.id && navigation.navigate('EventDetails', { eventId: item.id, publicSlug: item.publicSlug })} />
        )}
        ListEmptyComponent={<EmptyState title="No Events Found" message="Try a different search term." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: theme.spacing.xl, paddingBottom: 120, paddingTop: theme.spacing.xl },
  header: { marginBottom: theme.spacing.xl },
  title: { ...theme.typography.display, color: theme.colors.text, marginBottom: theme.spacing.l },
  searchBox: { marginBottom: theme.spacing.m },
  searchInput: { backgroundColor: '#FFF' },
});
