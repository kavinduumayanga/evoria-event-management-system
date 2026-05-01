import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Megaphone, MailPlus, Send, History } from 'lucide-react-native';
import { Event } from '../../types';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard, Input, Button } from '../../components';
import { EventCommunicationEntry, EventService, UserService } from '../../api/services';

export const AnnouncementScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [blastSubject, setBlastSubject] = useState('');
  const [blastMessage, setBlastMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [communications, setCommunications] = useState<EventCommunicationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingBlast, setIsSubmittingBlast] = useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = useCallback(async (eventId: string) => {
    if (!eventId) {
      setCommunications([]);
      return;
    }

    try {
      setIsLoadingHistory(true);
      const response = await EventService.getEventCommunications(eventId, 80);
      setCommunications(response?.data?.communications || []);
    } catch (historyError: any) {
      setCommunications([]);
      Alert.alert('History Error', historyError?.response?.data?.message || 'Failed to load communication history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const userResponse = await UserService.getMe();
      const eventsResponse = await EventService.getHostEvents(userResponse.data.user.id);
      const managedEvents = eventsResponse?.data?.events || [];
      setEvents(managedEvents);

      const hasExistingSelection = managedEvents.some((event: Event) => event.id === selectedEventId);
      const resolvedEventId = hasExistingSelection ? selectedEventId : (managedEvents[0]?.id || '');
      setSelectedEventId(resolvedEventId);

      if (resolvedEventId) {
        await fetchCommunications(resolvedEventId);
      } else {
        setCommunications([]);
      }
    } catch (loadError: any) {
      setError(loadError?.response?.data?.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchCommunications, selectedEventId]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const handleSendBlast = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event first.');
      return;
    }
    if (!blastMessage.trim()) {
      Alert.alert('Missing Message', 'Blast message is required.');
      return;
    }

    try {
      setIsSubmittingBlast(true);
      const response = await EventService.blastMessage(selectedEventId, {
        subject: blastSubject.trim() || undefined,
        message: blastMessage.trim(),
      });
      Alert.alert('Blast Sent', response?.message || 'Mock blast recorded successfully.');
      setBlastSubject('');
      setBlastMessage('');
      await fetchCommunications(selectedEventId);
    } catch (blastError: any) {
      Alert.alert('Blast Failed', blastError?.response?.data?.message || 'Failed to send blast message.');
    } finally {
      setIsSubmittingBlast(false);
    }
  };

  const handleInviteGuest = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event first.');
      return;
    }
    if (!inviteEmail.trim()) {
      Alert.alert('Missing Email', 'Guest email is required.');
      return;
    }

    try {
      setIsSubmittingInvite(true);
      const response = await EventService.inviteGuest(selectedEventId, {
        email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined,
      });
      Alert.alert('Invite Sent', response?.message || 'Mock invitation recorded successfully.');
      setInviteEmail('');
      setInviteMessage('');
      await fetchCommunications(selectedEventId);
    } catch (inviteError: any) {
      Alert.alert('Invite Failed', inviteError?.response?.data?.message || 'Failed to send invite.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchEvents} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Megaphone size={20} color={theme.colors.accent} />
        <Text style={styles.title}>Event Communications</Text>
      </View>

      <FlatList
        data={events}
        horizontal
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventList}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No Events" message="Create an event to send invites and blasts." />}
        renderItem={({ item }) => {
          const isSelected = selectedEventId === item.id;
          return (
            <TouchableOpacity
              style={[styles.eventChip, isSelected && styles.eventChipSelected]}
              onPress={async () => {
                setSelectedEventId(item.id);
                await fetchCommunications(item.id);
              }}
            >
              <Text style={[styles.eventChipText, isSelected && styles.eventChipTextSelected]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Send size={16} color={theme.colors.primaryLight} />
            <Text style={styles.formTitle}>Blast Message</Text>
          </View>
          <Input label="Subject (Optional)" value={blastSubject} onChangeText={setBlastSubject} placeholder="Event update" />
          <Input
            label="Message"
            value={blastMessage}
            onChangeText={setBlastMessage}
            placeholder="Write one message for all registered users"
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
          <Button title="Send Blast" onPress={handleSendBlast} isLoading={isSubmittingBlast} />
        </GlassCard>

        <GlassCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <MailPlus size={16} color={theme.colors.secondary} />
            <Text style={styles.formTitle}>Invite Guest</Text>
          </View>
          <Input
            label="Guest Email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="guest@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Message (Optional)"
            value={inviteMessage}
            onChangeText={setInviteMessage}
            placeholder="Add a personal invitation note"
            multiline
            numberOfLines={3}
            style={styles.messageInput}
          />
          <Button title="Send Invite" onPress={handleInviteGuest} isLoading={isSubmittingInvite} />
        </GlassCard>

        <GlassCard style={styles.historyCard}>
          <View style={styles.formHeader}>
            <History size={16} color={theme.colors.accent} />
            <Text style={styles.formTitle}>Communication History</Text>
          </View>

          {isLoadingHistory ? (
            <Text style={styles.historyLoading}>Loading history...</Text>
          ) : communications.length === 0 ? (
            <EmptyState title="No History Yet" message="Invites, blasts, and in-app alerts will appear here." />
          ) : (
            communications.slice(0, 40).map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyMetaRow}>
                  <Text style={styles.historyType}>{item.source === 'email_log' ? 'EMAIL_MOCK' : 'IN_APP'}</Text>
                  <Text style={styles.historyTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <Text style={styles.historySubject}>{item.subject}</Text>
                <Text style={styles.historyRecipient}>
                  To: {item.recipientEmail || item.recipientUserId || 'Unknown recipient'}
                </Text>
                <Text style={styles.historyMessage}>{item.message}</Text>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  eventList: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  eventChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    marginRight: theme.spacing.s,
    maxWidth: 220,
  },
  eventChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  eventChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  eventChipTextSelected: {
    color: theme.colors.text,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  formCard: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  formTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  messageInput: {
    minHeight: 88,
    alignItems: 'flex-start',
  },
  historyCard: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  historyLoading: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
    backgroundColor: `${theme.colors.surfaceLight}55`,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyType: {
    ...theme.typography.small,
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  historyTime: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  historySubject: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyRecipient: {
    ...theme.typography.small,
    color: theme.colors.secondary,
    marginBottom: 4,
  },
  historyMessage: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
