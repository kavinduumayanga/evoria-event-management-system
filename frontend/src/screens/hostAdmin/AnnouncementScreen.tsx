import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Megaphone, MailPlus, Send, History, Radio, ArrowLeft } from 'lucide-react-native';
import { Event } from '../../types';
import { theme } from '../../constants/theme';
import {
  ScreenContainer, LoadingState, ErrorState, EmptyState,
  Card, Input, Button, IconButton,
} from '../../components';
import { EventCommunicationEntry, EventService, UserService } from '../../api/services';
import { safeArray } from '../../utils/safeData';
import { safeString, safeUpper } from '../../utils/safeText';
import { goBackOrFallback } from '../../utils/navigationBack';

export const AnnouncementScreen = () => {
  const navigation = useNavigation<any>();
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
    if (!eventId) { setCommunications([]); return; }
    try {
      setIsLoadingHistory(true);
      const response = await EventService.getEventCommunications(eventId, 80);
      setCommunications(safeArray<EventCommunicationEntry>(response?.data?.communications));
    } catch (err: any) {
      setCommunications([]);
      Alert.alert('History Error', err?.response?.data?.message || 'Failed to load communication history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);
      const userRes = await UserService.getMe();
      const userId = safeString(userRes?.data?.user?.id, '');
      const eventsRes = userId
        ? await EventService.getHostEvents(userId)
        : { data: { events: [] } };
      const managed = safeArray<Event>(eventsRes?.data?.events);
      setEvents(managed);
      const hasSelection = managed.some((e: Event) => e.id === selectedEventId);
      const resolved = hasSelection ? selectedEventId : (managed[0]?.id || '');
      setSelectedEventId(resolved);
      if (resolved) await fetchCommunications(resolved);
      else setCommunications([]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchCommunications, selectedEventId]);

  useFocusEffect(useCallback(() => { fetchEvents(); }, [fetchEvents]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchEvents(); }, [fetchEvents]);

  const handleBack = () => {
    goBackOrFallback(navigation as any, { name: 'Dashboard' });
  };

  const handleSendBlast = async () => {
    if (!selectedEventId) { Alert.alert('Select Event', 'Please select an event first.'); return; }
    if (!blastMessage.trim()) { Alert.alert('Missing Message', 'Blast message is required.'); return; }
    try {
      setIsSubmittingBlast(true);
      const res = await EventService.blastMessage(selectedEventId, {
        subject: blastSubject.trim() || undefined,
        message: blastMessage.trim(),
      });
      Alert.alert('Blast Sent', res?.message || 'Blast recorded successfully.');
      setBlastSubject(''); setBlastMessage('');
      await fetchCommunications(selectedEventId);
    } catch (err: any) {
      Alert.alert('Blast Failed', err?.response?.data?.message || 'Failed to send blast.');
    } finally { setIsSubmittingBlast(false); }
  };

  const handleInviteGuest = async () => {
    if (!selectedEventId) { Alert.alert('Select Event', 'Please select an event first.'); return; }
    if (!inviteEmail.trim()) { Alert.alert('Missing Email', 'Guest email is required.'); return; }
    try {
      setIsSubmittingInvite(true);
      const res = await EventService.inviteGuest(selectedEventId, {
        email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined,
      });
      Alert.alert('Invite Sent', res?.message || 'Invite recorded successfully.');
      setInviteEmail(''); setInviteMessage('');
      await fetchCommunications(selectedEventId);
    } catch (err: any) {
      Alert.alert('Invite Failed', err?.response?.data?.message || 'Failed to send invite.');
    } finally { setIsSubmittingInvite(false); }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEvents} /></ScreenContainer>;

  return (
    <ScreenContainer>
      {/* === PAGE HEADER === */}
      <View style={styles.pageHeader}>
        <View style={styles.headerLeft}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={handleBack}
            variant="surface"
            size={36}
          />
          <Radio size={20} color={theme.colors.primary} />
          <Text style={styles.pageTitle}>Communications</Text>
        </View>
      </View>

      {/* === EVENT SELECTOR === */}
      <FlatList
        data={events}
        horizontal
        keyExtractor={(item, index) => safeString(item.id, `event-${index}`)}
        contentContainerStyle={styles.eventList}
        showsHorizontalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Events" message="Create an event to send invites and blasts." />}
        renderItem={({ item }) => {
          const sel = selectedEventId === item.id;
          return (
            <TouchableOpacity
              style={[styles.eventChip, sel && styles.eventChipActive]}
              onPress={async () => { setSelectedEventId(item.id); await fetchCommunications(item.id); }}
            >
              <Text style={[styles.eventChipText, sel && styles.eventChipTextActive]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* === BLAST CARD === */}
        <Card variant="primary" style={styles.formCard} noPadding>
          <View style={styles.cardInner}>
            <View style={styles.formHeader}>
              <Send size={16} color={theme.colors.primary} />
              <Text style={styles.formTitle}>Blast Message</Text>
            </View>
            <Input
              label="Subject (optional)"
              value={blastSubject}
              onChangeText={setBlastSubject}
              placeholder="Event update..."
              containerStyle={styles.inputNoMargin}
            />
            <Input
              label="Message *"
              value={blastMessage}
              onChangeText={setBlastMessage}
              placeholder="Write a message for all registered attendees"
              multiline
              numberOfLines={4}
            />
            <Button
              title="Send Blast"
              onPress={handleSendBlast}
              isLoading={isSubmittingBlast}
              variant="primary"
              size="md"
              icon={<Send size={15} color={theme.colors.textOnPrimary} />}
            />
          </View>
        </Card>

        {/* === INVITE CARD === */}
        <Card variant="raised" style={styles.formCard} noPadding>
          <View style={styles.cardInner}>
            <View style={styles.formHeader}>
              <MailPlus size={16} color={theme.colors.primaryLight} />
              <Text style={styles.formTitle}>Invite Guest</Text>
            </View>
            <Input
              label="Guest email *"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="guest@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={styles.inputNoMargin}
            />
            <Input
              label="Message (optional)"
              value={inviteMessage}
              onChangeText={setInviteMessage}
              placeholder="Add a personal note..."
              multiline
              numberOfLines={3}
            />
            <Button
              title="Send Invite"
              onPress={handleInviteGuest}
              isLoading={isSubmittingInvite}
              variant="secondary"
              size="md"
              icon={<MailPlus size={15} color={theme.colors.text} />}
            />
          </View>
        </Card>

        {/* === HISTORY CARD === */}
        <Card variant="raised" style={styles.formCard} noPadding>
          <View style={styles.cardInner}>
            <View style={styles.formHeader}>
              <History size={16} color={theme.colors.textSecondary} />
              <Text style={styles.formTitle}>History</Text>
            </View>

            {isLoadingHistory ? (
              <Text style={styles.historyLoading}>Loading history...</Text>
            ) : communications.length === 0 ? (
              <EmptyState title="No History" message="Invites and blasts will appear here." />
            ) : (
              communications.slice(0, 40).map((item) => (
                <View key={safeString(item.id, `${item.source}-${item.createdAt}`)} style={styles.historyItem}>
                  <View style={styles.historyMetaRow}>
                    <View style={styles.typePill}>
                      <Text style={styles.historyType}>
                        {item.source === 'email_log' ? 'EMAIL' : 'IN-APP'}
                      </Text>
                    </View>
                    <View style={styles.historyMetaRight}>
                      <Text style={styles.historyStatus}>{safeUpper(item.status)}</Text>
                      <Text style={styles.historyTime}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historySubject}>{item.subject}</Text>
                  <Text style={styles.historyRecipient}>
                    → {item.recipientEmail || item.recipientUserId || 'All attendees'}
                  </Text>
                  <Text style={styles.historyMessage} numberOfLines={2}>{item.message}</Text>
                  {item !== communications[communications.length - 1] && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.m,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  eventList: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.m,
  },
  eventChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    marginRight: theme.spacing.s,
    maxWidth: 200,
    backgroundColor: theme.colors.surface,
  },
  eventChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySubtle },
  eventChipText: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600' },
  eventChipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  scrollContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 100,
  },
  formCard: {
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
  },
  cardInner: { padding: theme.spacing.m },
  inputNoMargin: { marginBottom: 0 },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  formTitle: { ...theme.typography.h3, color: theme.colors.text },
  historyLoading: { ...theme.typography.caption, color: theme.colors.textMuted },
  historyItem: { paddingVertical: theme.spacing.sm },
  historyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  historyMetaRight: { alignItems: 'flex-end' },
  typePill: { backgroundColor: theme.colors.primarySubtle, borderRadius: theme.borderRadius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  historyType: { ...theme.typography.overline, color: theme.colors.primary },
  historyStatus: { ...theme.typography.overline, color: theme.colors.accentLight, marginBottom: 2 },
  historyTime: { ...theme.typography.caption, color: theme.colors.textMuted },
  historySubject: { ...theme.typography.bodyMedium, color: theme.colors.text, marginBottom: 2 },
  historyRecipient: { ...theme.typography.caption, color: theme.colors.primaryLight, marginBottom: 4 },
  historyMessage: { ...theme.typography.caption, color: theme.colors.textMuted },
  divider: { height: 1, backgroundColor: theme.colors.border, marginTop: theme.spacing.sm },
});
