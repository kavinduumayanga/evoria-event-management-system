import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState, IconButton, SecondaryButton } from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar as CalendarIcon, Megaphone, Ban, Users, Star, ListOrdered } from 'lucide-react-native';
import { EventService } from '../../../api/services';
import { Event } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';

type ManageEventsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageEvents'>;

interface Props {
  navigation: ManageEventsNavigationProp;
}

export const ManageEventsScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  const fetchEvents = async () => {
    try {
      setError(null);
      const eventsRes = await EventService.getEvents();
      setEvents(eventsRes.data.events);
    } catch (err) {
      console.error(err);
      setError('Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event? This will also delete related tickets and sessions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await EventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete event');
          }
        }
      }
    ]);
  };

  const handleStatusUpdate = (event: Event, nextStatus: 'published' | 'cancelled') => {
    const actionLabel = nextStatus === 'published' ? 'Publish' : 'Cancel';
    const confirmationText = nextStatus === 'published'
      ? 'Publish this event now?'
      : 'Cancel this event? Attendees will no longer be able to book it.';

    Alert.alert(`${actionLabel} Event`, confirmationText, [
      { text: 'No', style: 'cancel' },
      {
        text: actionLabel,
        style: nextStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const response = await EventService.updateEventStatus(event.id, nextStatus);
            const updatedEvent: Event = response.data.event;
            setEvents((previous) => previous.map((item) => (item.id === event.id ? updatedEvent : item)));
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || `Failed to ${nextStatus} event`);
          }
        },
      },
    ]);
  };

  const handleFeatureToggle = (event: Event) => {
    const willFeature = !event.isFeatured;
    Alert.alert(
      willFeature ? 'Feature Event' : 'Unfeature Event',
      willFeature ? 'Show this event first in discovery lists?' : 'Remove featured priority for this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: willFeature ? 'Feature' : 'Unfeature',
          onPress: async () => {
            try {
              const response = await EventService.toggleFeature(event.id);
              const updatedEvent: Event = response.data.event;
              setEvents((previous) => previous.map((item) => (item.id === event.id ? updatedEvent : item)));
            } catch (toggleError: any) {
              Alert.alert('Error', toggleError.response?.data?.message || 'Failed to update feature status');
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Events</Text>
        <IconButton
          icon={<Plus size={20} color={theme.colors.text} />}
          onPress={() => navigation.navigate('EventForm', {})}
          variant="solid"
        />
      </View>

      {isLoading && !isRefreshing ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchEvents} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard 
              event={item} 
              onPress={() => navigation.navigate('EventForm', { eventId: item.id })}
              actions={
                <View style={styles.actionsGrid}>
                  <SecondaryButton
                    title="Tickets"
                    icon={<TicketIcon size={14} color={theme.colors.text} />}
                    onPress={() => navigation.navigate('ManageTickets', { eventId: item.id })}
                    style={styles.actionButton}
                  />
                  <SecondaryButton
                    title="Agenda"
                    icon={<CalendarIcon size={14} color={theme.colors.text} />}
                    onPress={() => navigation.navigate('ManageSessions', { eventId: item.id })}
                    style={styles.actionButton}
                  />
                  <SecondaryButton
                    title="Guests"
                    icon={<Users size={14} color={theme.colors.text} />}
                    onPress={() => navigation.navigate('ManageRegistrations', { eventId: item.id })}
                    style={styles.actionButton}
                  />
                  <SecondaryButton
                    title="Waitlist"
                    icon={<ListOrdered size={14} color={theme.colors.text} />}
                    onPress={() => navigation.navigate('ManageWaitlist', { eventId: item.id })}
                    style={styles.actionButton}
                  />
                  <SecondaryButton
                    title="Edit"
                    icon={<Edit2 size={14} color={theme.colors.text} />}
                    onPress={() => navigation.navigate('EventForm', { eventId: item.id })}
                    style={styles.actionButton}
                  />
                  {item.status === 'draft' && (
                    <SecondaryButton
                      title="Publish"
                      icon={<Megaphone size={14} color={theme.colors.success} />}
                      onPress={() => handleStatusUpdate(item, 'published')}
                      style={styles.actionButton}
                    />
                  )}
                  {item.status === 'published' && (
                    <SecondaryButton
                      title="Cancel"
                      icon={<Ban size={14} color={theme.colors.warning} />}
                      onPress={() => handleStatusUpdate(item, 'cancelled')}
                      style={styles.actionButton}
                    />
                  )}
                  <SecondaryButton
                    title={item.isFeatured ? 'Unfeature' : 'Feature'}
                    icon={<Star size={14} color={item.isFeatured ? theme.colors.warning : theme.colors.textMuted} />}
                    onPress={() => handleFeatureToggle(item)}
                    style={styles.actionButton}
                  />
                  <SecondaryButton
                    title="Delete"
                    icon={<Trash2 size={14} color={theme.colors.error} />}
                    onPress={() => handleDelete(item.id)}
                    style={styles.actionButton}
                  />
                </View>
              }
            />
          )}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={<EmptyState title="No Events Found" message="You haven't created any events yet." />}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    paddingTop: theme.spacing.xl,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: '30%',
  },
});
