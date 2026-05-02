import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Folder, Tag } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState, Input, Card } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';

type EventListScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;

interface Props {
  navigation: EventListScreenNavigationProp;
}

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const searchParams = {
        q: debouncedSearch || undefined,
        category: categoryFilter.trim() || undefined,
        tags: tagsFilter.trim() || undefined,
      };

      const [searchRes, trendingRes] = await Promise.all([
        EventService.searchEvents(searchParams),
        EventService.getTrendingEvents(6),
      ]);

      setEvents(searchRes.data.events || []);
      setTrendingEvents(trendingRes.data.events || []);
    } catch (fetchError) {
      console.error('Failed to fetch discovery data', fetchError);
      setError('Failed to load discovery data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [debouncedSearch, categoryFilter, tagsFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Discover</Text>
              <Text style={styles.headerSubtitle}>Public events happening now</Text>
            </View>

            <Card style={styles.filtersCard} variant="raised">
              <Input
                label="Search"
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search title or description"
                leftIcon={<Search size={18} color={theme.colors.textMuted} />}
              />
              <Input
                label="Category"
                value={categoryFilter}
                onChangeText={setCategoryFilter}
                placeholder="Technology"
                leftIcon={<Folder size={18} color={theme.colors.textMuted} />}
              />
              <Input
                label="Tags"
                value={tagsFilter}
                onChangeText={setTagsFilter}
                placeholder="ai,startup,design"
                leftIcon={<Tag size={18} color={theme.colors.textMuted} />}
                containerStyle={styles.lastFilter}
              />
            </Card>

            {trendingEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending</Text>
                {trendingEvents.map((item) => (
                  <EventCard
                    key={`trend-${item.id}`}
                    event={item}
                    onPress={() => navigation.navigate('EventDetails', { eventId: item.id, publicSlug: item.publicSlug })}
                  />
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>All Events</Text>
          </>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id, publicSlug: item.publicSlug })}
          />
        )}
        ListEmptyComponent={<EmptyState title="No Events Found" message="Try changing your filters or check back later." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 148,
    flexGrow: 1,
  },
  header: {
    paddingTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  filtersCard: {
    padding: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  lastFilter: {
    marginBottom: 0,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
});
