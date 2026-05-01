import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Plus } from 'lucide-react-native';
import { Event } from '../../types';
import { AttendeeTabParamList } from '../../types/navigation';
import { EventService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';

type AttendeeTabNavigationProp = BottomTabNavigationProp<AttendeeTabParamList, 'MyEvents'>;

export const MyEventsScreen = () => {
  const navigation = useNavigation<AttendeeTabNavigationProp>();
  const currentUser = useAuthStore((state) => state.user);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setError(null);
      const response = await EventService.getEvents();
      const allEvents: Event[] = response.data.events || [];
      const manageableEvents = currentUser
        ? allEvents.filter((event) => event.ownerId === currentUser.id || (event.adminIds || []).includes(currentUser.id))
        : [];
      setEvents(manageableEvents);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load your events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [currentUser?.id])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, [currentUser?.id]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Events</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('HomeStack', { screen: 'EventForm', params: {} })}
        >
          <Plus size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => navigation.navigate('HomeStack', {
              screen: 'EventDetails',
              params: { eventId: item.id, publicSlug: item.publicSlug },
            })}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Managed Events" message="Create an event or ask an owner to add you as an event admin." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    padding: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.round,
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
});
