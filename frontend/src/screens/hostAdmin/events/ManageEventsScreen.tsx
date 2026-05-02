import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  RefreshControl, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  Plus, Edit2, Trash2, Ticket as TicketIcon, Calendar as CalendarIcon,
  Megaphone, Ban, Users, Star, ListOrdered,
} from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  ScreenContainer, EventCard, LoadingState, ErrorState, EmptyState, Button, Card,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService } from '../../../api/services';
import { Event } from '../../../types';

type ManageEventsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageEvents'>;

interface Props { navigation: ManageEventsNavigationProp; }

export const ManageEventsScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  const fetchEvents = async () => {
    try {
      setError(null);
      const res = await EventService.getEvents();
      setEvents(res.data.events || []);
    } catch { setError('Failed to load events'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchEvents(); }, []));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchEvents(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Event', 'Delete this event along with all its tickets and sessions?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await EventService.deleteEvent(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete event'); }
        },
      },
    ]);
  };

  const handleStatusUpdate = (event: Event, nextStatus: 'published' | 'cancelled') => {
    const label = nextStatus === 'published' ? 'Publish' : 'Cancel';
    const msg = nextStatus === 'published'
      ? 'Publish this event now?'
      : 'Cancel this event? Attendees will no longer be able to book.';
    Alert.alert(`${label} Event`, msg, [
      { text: 'No', style: 'cancel' },
      {
        text: label,
        style: nextStatus === 'cancelled' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const res = await EventService.updateEventStatus(event.id, nextStatus);
            setEvents((prev) => prev.map((e) => (e.id === event.id ? res.data.event : e)));
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || `Failed to ${nextStatus} event`);
          }
        },
      },
    ]);
  };

  const handleFeatureToggle = (event: Event) => {
    const will = !event.isFeatured;
    Alert.alert(will ? 'Feature Event' : 'Unfeature Event',
      will ? 'Show this event first in discovery?' : 'Remove featured priority?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: will ? 'Feature' : 'Unfeature',
          onPress: async () => {
            try {
              const res = await EventService.toggleFeature(event.id);
              setEvents((prev) => prev.map((e) => (e.id === event.id ? res.data.event : e)));
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to update feature status');
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
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Events</Text>
            <Button
              title="New"
              onPress={() => navigation.navigate('EventForm', {})}
              variant="primary"
              size="sm"
              icon={<Plus size={15} color={theme.colors.textOnPrimary} />}
              fullWidth={false}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<CalendarIcon size={48} color={theme.colors.textMuted} />}
            title="No Events Yet"
            message="Create your first event to get started."
            action={{ label: 'Create Event', onPress: () => navigation.navigate('EventForm', {}) }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.eventBlock}>
            <EventCard
              event={item}
              variant="list"
              onPress={() => navigation.navigate('EventForm', { eventId: item.id })}
            />
            {/* Quick Actions */}
            <Card variant="raised" style={styles.actionsCard} noPadding>
              <View style={styles.actionsRow}>
                <ActionPill icon={<TicketIcon size={14} color={theme.colors.primary} />} label="Tickets" onPress={() => navigation.navigate('ManageTickets', { eventId: item.id })} />
                <ActionPill icon={<CalendarIcon size={14} color={theme.colors.primary} />} label="Agenda" onPress={() => navigation.navigate('ManageSessions', { eventId: item.id })} />
                <ActionPill icon={<Users size={14} color={theme.colors.primary} />} label="Guests" onPress={() => navigation.navigate('ManageRegistrations', { eventId: item.id })} />
                <ActionPill icon={<ListOrdered size={14} color={theme.colors.primary} />} label="Waitlist" onPress={() => navigation.navigate('ManageWaitlist', { eventId: item.id })} />
              </View>
              <View style={[styles.actionsRow, styles.actionsRowBottom]}>
                <ActionPill icon={<Edit2 size={14} color={theme.colors.textSecondary} />} label="Edit" onPress={() => navigation.navigate('EventForm', { eventId: item.id })} />
                {item.status === 'draft' && (
                  <ActionPill icon={<Megaphone size={14} color={theme.colors.success} />} label="Publish" onPress={() => handleStatusUpdate(item, 'published')} />
                )}
                {item.status === 'published' && (
                  <ActionPill icon={<Ban size={14} color={theme.colors.warning} />} label="Cancel" onPress={() => handleStatusUpdate(item, 'cancelled')} />
                )}
                <ActionPill
                  icon={<Star size={14} color={item.isFeatured ? theme.colors.warning : theme.colors.textMuted} />}
                  label={item.isFeatured ? 'Unfeature' : 'Feature'}
                  onPress={() => handleFeatureToggle(item)}
                />
                <ActionPill icon={<Trash2 size={14} color={theme.colors.error} />} label="Delete" onPress={() => handleDelete(item.id)} danger />
              </View>
            </Card>
          </View>
        )}
      />
    </ScreenContainer>
  );
};

const ActionPill: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void; danger?: boolean }> = ({ icon, label, onPress, danger }) => (
  <View
    style={[pillStyles.pill, danger && pillStyles.dangerPill]}
    // @ts-ignore - not a button but looks like one
  >
    <Text
      onPress={onPress}
      style={[pillStyles.label, danger && pillStyles.dangerLabel]}
    >
      {React.cloneElement(icon as React.ReactElement, {})}{'  '}{label}
    </Text>
  </View>
);

const pillStyles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.borderRadius.s, backgroundColor: theme.colors.surfaceOverlay, alignItems: 'center' },
  dangerPill: { backgroundColor: theme.colors.errorSubtle },
  label: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  dangerLabel: { color: theme.colors.error },
});

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 100,
    flexGrow: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  eventBlock: { marginBottom: theme.spacing.m },
  actionsCard: { borderRadius: theme.borderRadius.m, overflow: 'hidden', marginTop: -theme.spacing.xs },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    padding: theme.spacing.sm,
  },
  actionsRowBottom: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
});
