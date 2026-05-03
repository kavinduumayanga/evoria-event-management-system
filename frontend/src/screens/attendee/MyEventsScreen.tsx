import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Plus, CalendarDays, Edit2, Ban, Trash2 } from 'lucide-react-native';
import { Event } from '../../types';
import { AttendeeTabParamList } from '../../types/navigation';
import { EventService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState, Button } from '../../components';
import { theme } from '../../constants/theme';
import { logDevMissing, safeString } from '../../utils/safeText';

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

  const handleCancelEvent = (eventId: string) => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await EventService.updateEventStatus(eventId, 'cancelled');
              const updatedEvent = response.data?.event;
              setEvents((previous) => previous.map((item) => (item.id === eventId && updatedEvent ? updatedEvent : item)));
            } catch (cancelError: any) {
              Alert.alert('Error', cancelError?.response?.data?.message || 'Failed to cancel event.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await EventService.deleteEvent(eventId);
              setEvents((previous) => previous.filter((item) => item.id !== eventId));
            } catch (deleteError: any) {
              Alert.alert('Error', deleteError?.response?.data?.message || 'Failed to delete event.');
            }
          },
        },
      ]
    );
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={events}
        keyExtractor={(item, index) => safeString(item.id, String(index))}
        renderItem={({ item }) => {
          const eventId = safeString(item.id, '');
          if (!eventId) {
            logDevMissing('my-events-id', 'Managed event missing id; actions disabled.');
          }
          return (
            <View style={styles.eventBlock}>
              <EventCard
                event={item}
                variant="list"
                onPress={eventId ? () => navigation.navigate('HomeStack', {
                  screen: 'EventDetails',
                  params: { eventId, publicSlug: item.publicSlug },
                }) : undefined}
              />
              <View style={styles.eventActions}>
                <Button
                  title="Event Dashboard"
                  onPress={() => eventId && navigation.navigate('HomeStack', {
                    screen: 'EventDashboard',
                    params: { eventId },
                  })}
                  variant="secondary"
                  size="sm"
                  style={{ flex: 1 }}
                  disabled={!eventId}
                />
                <Button
                  title="Guest List"
                  onPress={() => eventId && navigation.navigate('HomeStack', {
                    screen: 'ManageRegistrations',
                    params: { eventId },
                  })}
                  variant="ghost"
                  size="sm"
                  style={{ flex: 1 }}
                  disabled={!eventId}
                />
              </View>
              <View style={styles.eventActions}>
                <TouchableOpacity
                  onPress={() => eventId && navigation.navigate('HomeStack', { screen: 'EventForm', params: { eventId } })}
                  style={[styles.quickAction, !eventId && styles.quickActionDisabled]}
                  disabled={!eventId}
                  activeOpacity={0.85}
                >
                  <Edit2 size={14} color={theme.colors.text} />
                  <Text style={styles.quickActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => eventId && handleCancelEvent(eventId)}
                  style={[
                    styles.quickAction,
                    styles.quickActionWarn,
                    (!eventId || item.status !== 'published') && styles.quickActionDisabled,
                  ]}
                  disabled={!eventId || item.status !== 'published'}
                  activeOpacity={0.85}
                >
                  <Ban size={14} color={theme.colors.warning || '#F59E0B'} />
                  <Text style={styles.quickActionWarnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => eventId && handleDeleteEvent(eventId)}
                  style={[styles.quickAction, styles.quickActionDanger, !eventId && styles.quickActionDisabled]}
                  disabled={!eventId}
                  activeOpacity={0.85}
                >
                  <Trash2 size={14} color={theme.colors.error} />
                  <Text style={styles.quickActionDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
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
  quickAction: {
    flex: 1,
    minHeight: 38,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  quickActionText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  quickActionWarn: {
    borderColor: 'rgba(245,158,11,0.45)',
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  quickActionWarnText: {
    ...theme.typography.caption,
    color: theme.colors.warning || '#F59E0B',
    fontWeight: '700',
  },
  quickActionDanger: {
    borderColor: 'rgba(239,68,68,0.5)',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  quickActionDangerText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
});
