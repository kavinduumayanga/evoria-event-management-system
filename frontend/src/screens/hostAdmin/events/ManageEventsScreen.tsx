import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState } from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar as CalendarIcon, Megaphone, Ban } from 'lucide-react-native';
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

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Events</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('EventForm', {})}
        >
          <Plus size={20} color={theme.colors.text} />
        </TouchableOpacity>
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
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ManageTickets', { eventId: item.id })}>
                    <TicketIcon size={16} color={theme.colors.secondary} />
                    <Text style={styles.actionText}>Tickets</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ManageSessions', { eventId: item.id })}>
                    <CalendarIcon size={16} color={theme.colors.primaryLight} />
                    <Text style={styles.actionText}>Agenda</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('EventForm', { eventId: item.id })}>
                    <Edit2 size={16} color={theme.colors.textMuted} />
                    <Text style={[styles.actionText, { color: theme.colors.textMuted }]}>Edit</Text>
                  </TouchableOpacity>
                  {item.status === 'draft' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate(item, 'published')}>
                      <Megaphone size={16} color={theme.colors.success} />
                      <Text style={[styles.actionText, { color: theme.colors.success }]}>Publish</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'published' && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusUpdate(item, 'cancelled')}>
                      <Ban size={16} color={theme.colors.warning} />
                      <Text style={[styles.actionText, { color: theme.colors.warning }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                    <Trash2 size={16} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </>
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: 4,
  },
});
