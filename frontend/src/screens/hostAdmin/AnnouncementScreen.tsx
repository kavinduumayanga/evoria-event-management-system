import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Megaphone, Clock3, Send } from 'lucide-react-native';
import { Event } from '../../types';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard, Input, Button } from '../../components';
import { EventService, NotificationService, UserService } from '../../api/services';

type Channel = 'in_app' | 'email_mock' | 'sms_mock';
type NoticeType = 'announcement' | 'reminder';

export const AnnouncementScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<Channel>('in_app');
  const [noticeType, setNoticeType] = useState<NoticeType>('announcement');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setError(null);
      const [userRes, eventsRes] = await Promise.all([UserService.getMe(), EventService.getEvents()]);
      const hostEvents = eventsRes.data.events.filter((item: Event) => item.hostAdminId === userRes.data.user.id);
      setEvents(hostEvents);
      if (!selectedEventId && hostEvents.length) {
        setSelectedEventId(hostEvents[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load events');
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

  const handleSend = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event first.');
      return;
    }
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Title and message are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      let scheduleIso: string | undefined;
      if (scheduledAt.trim()) {
        const parsedDate = new Date(scheduledAt.trim());
        if (Number.isNaN(parsedDate.getTime())) {
          Alert.alert('Invalid Date', 'Use a valid date/time format for scheduling.');
          setIsSubmitting(false);
          return;
        }
        scheduleIso = parsedDate.toISOString();
      }

      const payload = {
        title: title.trim(),
        message: message.trim(),
        type: noticeType,
        channel,
        ...(scheduleIso ? { scheduledAt: scheduleIso } : {}),
      };

      const res = await NotificationService.eventBlast(selectedEventId, payload);
      const responseMessage = res?.message || 'Announcement sent successfully.';
      Alert.alert('Success', responseMessage);
      setTitle('');
      setMessage('');
      setScheduledAt('');
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.message || 'Failed to send announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessScheduled = async () => {
    try {
      const res = await NotificationService.processScheduled();
      Alert.alert('Scheduled Processing', res?.message || 'Scheduled notifications processed.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to process scheduled notifications');
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
        <Text style={styles.title}>Announcements</Text>
      </View>

      <FlatList
        data={events}
        horizontal
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.eventList}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsHorizontalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No Events" message="Create an event to send announcements." />}
        renderItem={({ item }) => {
          const isSelected = selectedEventId === item.id;
          return (
            <TouchableOpacity
              style={[styles.eventChip, isSelected && styles.eventChipSelected]}
              onPress={() => setSelectedEventId(item.id)}
            >
              <Text style={[styles.eventChipText, isSelected && styles.eventChipTextSelected]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <GlassCard style={styles.formCard}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Event update title" />
        <Input
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="Write your message to attendees"
          multiline
          numberOfLines={4}
          style={styles.messageInput}
        />

        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.optionRow}>
          {(['announcement', 'reminder'] as NoticeType[]).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.optionChip, noticeType === value && styles.optionChipSelected]}
              onPress={() => setNoticeType(value)}
            >
              <Text style={[styles.optionText, noticeType === value && styles.optionTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Channel</Text>
        <View style={styles.optionRow}>
          {(['in_app', 'email_mock', 'sms_mock'] as Channel[]).map((value) => (
            <TouchableOpacity
              key={value}
              style={[styles.optionChip, channel === value && styles.optionChipSelected]}
              onPress={() => setChannel(value)}
            >
              <Text style={[styles.optionText, channel === value && styles.optionTextSelected]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Schedule (Optional)"
          value={scheduledAt}
          onChangeText={setScheduledAt}
          placeholder="YYYY-MM-DDTHH:mm:ss (local)"
        />

        <View style={styles.scheduleHint}>
          <Clock3 size={14} color={theme.colors.textMuted} />
          <Text style={styles.scheduleHintText}>Leave empty to send immediately</Text>
        </View>

        <Button
          title={scheduledAt.trim() ? 'Schedule Announcement' : 'Send Announcement'}
          onPress={handleSend}
          isLoading={isSubmitting}
          icon={<Send size={16} color={theme.colors.text} />}
        />

        <Button
          title="Process Scheduled Notifications"
          variant="outline"
          onPress={handleProcessScheduled}
          style={styles.processButton}
        />
      </GlassCard>
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
  formCard: {
    margin: theme.spacing.m,
    padding: theme.spacing.m,
  },
  messageInput: {
    minHeight: 88,
    alignItems: 'flex-start',
  },
  fieldLabel: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.s,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
  },
  optionChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  optionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  optionTextSelected: {
    color: theme.colors.text,
  },
  scheduleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  scheduleHintText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  processButton: {
    marginTop: theme.spacing.s,
  },
});
