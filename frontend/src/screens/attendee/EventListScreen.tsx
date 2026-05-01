import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event } from '../../types';
import { ScreenContainer, EventCard, LoadingState, EmptyState, ErrorState, Input, GlassCard } from '../../components';
import { theme } from '../../constants/theme';
import { EventService } from '../../api/services';

type EventListScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventList'>;

interface Props {
  navigation: EventListScreenNavigationProp;
}

export const EventListScreen: React.FC<Props> = ({ navigation }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchEvents = async () => {
    try {
      setError(null);

      const searchParams = {
        q: debouncedSearch || undefined,
        category: categoryFilter.trim() || undefined,
        city: cityFilter.trim() || undefined,
        tags: tagsFilter.trim() || undefined,
      };

      const [searchRes, trendingRes, recommendedRes] = await Promise.all([
        EventService.searchEvents(searchParams),
        EventService.getTrendingEvents(8),
        EventService.getRecommendedEvents({
          category: categoryFilter.trim() || undefined,
          city: cityFilter.trim() || undefined,
          tags: tagsFilter.trim() || undefined,
          limit: 8,
        }),
      ]);

      setEvents(searchRes.data.events || []);
      setTrendingEvents(trendingRes.data.events || []);
      setRecommendedEvents(recommendedRes.data.events || []);
    } catch (fetchError) {
      console.error('Failed to fetch discovery data', fetchError);
      setError('Failed to load discovery data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [debouncedSearch, categoryFilter, cityFilter, tagsFilter])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, [debouncedSearch, categoryFilter, cityFilter, tagsFilter]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
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
              <Text style={styles.headerTitle}>Discover Events</Text>
              <Text style={styles.headerSubtitle}>Find what is happening near you</Text>
            </View>

            <GlassCard style={styles.filtersCard}>
              <Input
                label="Search"
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search title or description"
              />
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Input
                    label="Category"
                    value={categoryFilter}
                    onChangeText={setCategoryFilter}
                    placeholder="Technology"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Input
                    label="City"
                    value={cityFilter}
                    onChangeText={setCityFilter}
                    placeholder="Colombo"
                  />
                </View>
              </View>
              <Input
                label="Tags"
                value={tagsFilter}
                onChangeText={setTagsFilter}
                placeholder="ai,startup,design"
              />
            </GlassCard>

            {trendingEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending</Text>
                <FlatList
                  data={trendingEvents}
                  horizontal
                  keyExtractor={(item) => `trend-${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <EventCard
                      event={item}
                      style={styles.horizontalCard}
                      onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                    />
                  )}
                />
              </View>
            )}

            {recommendedEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended</Text>
                <FlatList
                  data={recommendedEvents}
                  horizontal
                  keyExtractor={(item) => `rec-${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <EventCard
                      event={item}
                      style={styles.horizontalCard}
                      onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
                    />
                  )}
                />
              </View>
            )}

            <Text style={styles.sectionTitle}>All Events</Text>
          </>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
          />
        )}
        ListEmptyComponent={<EmptyState title="No Events Found" message="Try changing your filters or check back later." />}
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
  filtersCard: {
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  filterHalf: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing.m,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  horizontalCard: {
    width: 280,
    marginRight: theme.spacing.s,
  },
});
