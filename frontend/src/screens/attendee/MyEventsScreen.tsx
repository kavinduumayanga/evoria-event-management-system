import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Plus, CalendarDays } from 'lucide-react-native';
import { Event } from '../../types';
import { AttendeeTabParamList } from '../../types/navigation';
import { EventService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState, Button } from '../../components';
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
    <ScreenContainer>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventBlock}>
            <EventCard
              event={item}
              variant="list"
              onPress={() => navigation.navigate('HomeStack', {
                screen: 'EventDetails',
                params: { eventId: item.id, publicSlug: item.publicSlug },
              })}
            />
            <View style={styles.eventActions}>
              <Button
                title="Event Dashboard"
                onPress={() => navigation.navigate('HomeStack', {
                  screen: 'EventDashboard',
                  params: { eventId: item.id },
                })}
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
              />
              <Button
                title="Guest List"
                onPress={() => navigation.navigate('HomeStack', {
                  screen: 'ManageRegistrations',
                  params: { eventId: item.id },
                })}
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.title}>My Events</Text>
              <Text style={styles.subtitle}>Events you manage</Text>
            </View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('HomeStack', { screen: 'EventForm', params: {} })}
              activeOpacity={0.8}
            >
              <Plus size={18} color={theme.colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<CalendarDays size={48} color={theme.colors.textMuted} />}
            title="No Managed Events"
            message="Create an event or ask an owner to add you as an event admin."
          />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 100,
    flexGrow: 1,
  },
  pageHeader: {
    paddingTop: theme.spacing.m,
    marginBottom: theme.spacing.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  createBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.glow,
  },
  eventBlock: {
    marginBottom: theme.spacing.m,
  },
  eventActions: {
    marginTop: theme.spacing.s,
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
});
