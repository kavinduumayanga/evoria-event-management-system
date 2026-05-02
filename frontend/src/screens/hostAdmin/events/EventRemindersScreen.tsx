import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, BellRing, Clock3, Trash2 } from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { theme } from '../../../constants/theme';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  ScreenContainer,
} from '../../../components';
import { EventService } from '../../../api/services';
import { EventReminder } from '../../../types';
import { safeUpper } from '../../../utils/safeText';

interface Props {
  navigation: NativeStackNavigationProp<HostAdminEventStackParamList, 'EventReminders'>;
  route: RouteProp<HostAdminEventStackParamList, 'EventReminders'>;
}

export const EventRemindersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingDue, setIsProcessingDue] = useState(false);

  const fetchReminders = async () => {
    try {
      setError(null);
      const response = await EventService.getReminders(eventId, { limit: 150 });
      setReminders(response.data.reminders || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reminders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchReminders(); }, [eventId]));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReminders();
  }, [eventId]);

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Reminder title is required.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Validation', 'Reminder message is required.');
      return;
    }

    const parsedScheduled = new Date(scheduledAt.trim());
    if (Number.isNaN(parsedScheduled.getTime())) {
      Alert.alert('Validation', 'Use a valid scheduled date/time (ISO format).');
      return;
    }

    const channels: Array<'email'> = [];
    if (emailEnabled) channels.push('email');

    if (!channels.length) {
      Alert.alert('Validation', 'Enable at least one channel.');
      return;
    }

    try {
      setIsSubmitting(true);
      await EventService.createReminder(eventId, {
        title: title.trim(),
        message: message.trim(),
        scheduledAt: parsedScheduled.toISOString(),
        channels,
      });
      setTitle('');
      setMessage('');
      setScheduledAt('');
      setEmailEnabled(true);
      Alert.alert('Success', 'Reminder scheduled successfully.');
      fetchReminders();
    } catch (err: any) {
      Alert.alert('Failed', err?.response?.data?.message || 'Unable to schedule reminder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await EventService.deleteReminder(id);
            setReminders((prev) => prev.filter((reminder) => reminder.id !== id));
          } catch (err: any) {
            Alert.alert('Delete Failed', err?.response?.data?.message || 'Unable to delete reminder.');
          }
        },
      },
    ]);
  };

  const processDueReminders = async () => {
    try {
      setIsProcessingDue(true);
      const response = await EventService.processDueReminders({ eventId, limit: 100 });
      Alert.alert('Processing Done', response?.message || `${response?.results || 0} reminder(s) processed.`);
      fetchReminders();
    } catch (err: any) {
      Alert.alert('Processing Failed', err?.response?.data?.message || 'Unable to process due reminders.');
    } finally {
      setIsProcessingDue(false);
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchReminders} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <IconButton
                icon={<ArrowLeft size={20} color={theme.colors.text} />}
                onPress={() => navigation.goBack()}
                variant="surface"
                size={36}
              />
              <Text style={styles.title}>Event Reminders</Text>
            </View>

            <Card variant="raised" style={styles.formCard} noPadding>
              <View style={styles.formInner}>
                <Text style={styles.sectionTitle}>Schedule Reminder</Text>
                <Input
                  label="Title"
                  placeholder="Event starts soon"
                  value={title}
                  onChangeText={setTitle}
                  containerStyle={styles.inputNoMargin}
                />
                <Input
                  label="Message"
                  placeholder="Reminder message for attendees"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                />
                <Input
                  label="Scheduled At (ISO)"
                  placeholder="2026-05-03T08:30:00Z"
                  value={scheduledAt}
                  onChangeText={setScheduledAt}
                  hint="Use UTC ISO format for reliability"
                />

                <View style={styles.channelRow}>
                  <TouchableOpacity
                    style={[styles.channelChip, emailEnabled && styles.channelChipActive]}
                    onPress={() => setEmailEnabled((prev) => !prev)}
                  >
                    <Text style={[styles.channelText, emailEnabled && styles.channelTextActive]}>Email</Text>
                  </TouchableOpacity>
                </View>

                <Button
                  title="Schedule Reminder"
                  onPress={handleCreateReminder}
                  isLoading={isSubmitting}
                  variant="primary"
                  size="md"
                  icon={<BellRing size={14} color={theme.colors.textOnPrimary} />}
                />
                <Button
                  title="Process Due Reminders"
                  onPress={processDueReminders}
                  isLoading={isProcessingDue}
                  variant="secondary"
                  size="sm"
                />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Scheduled Reminders</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            title="No Reminders"
            message="Scheduled reminders will appear here."
            icon={<Clock3 size={40} color={theme.colors.textMuted} />}
          />
        }
        renderItem={({ item }) => (
          <Card variant="raised" style={styles.reminderCard} noPadding>
            <View style={styles.reminderInner}>
              <View style={styles.reminderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderTitle}>{item.title}</Text>
                  <Text style={styles.reminderMeta}>{new Date(item.scheduledAt).toLocaleString()}</Text>
                  <Text style={styles.reminderMeta}>Channels: {item.channels.join(', ')}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteReminder(item.id)}>
                  <Trash2 size={18} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.reminderMessage}>{item.message}</Text>
              <View style={styles.statusPillWrap}>
                <View style={[
                  styles.statusPill,
                  item.status === 'sent' ? styles.statusSent : item.status === 'failed' ? styles.statusFailed : styles.statusScheduled,
                ]}>
                  <Text style={styles.statusPillText}>{safeUpper(item.status)}</Text>
                </View>
              </View>
              {item.errorMessage ? <Text style={styles.errorText}>{item.errorMessage}</Text> : null}
            </View>
          </Card>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 110,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  formCard: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    marginBottom: theme.spacing.m,
  },
  formInner: {
    padding: theme.spacing.m,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  channelRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  channelChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.surface,
  },
  channelChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  channelText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  channelTextActive: {
    color: theme.colors.primary,
  },
  reminderCard: {
    marginBottom: theme.spacing.s,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  reminderInner: {
    padding: theme.spacing.m,
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    alignItems: 'flex-start',
  },
  reminderTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  reminderMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  reminderMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.s,
  },
  statusPillWrap: {
    marginTop: theme.spacing.s,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  statusSent: {
    backgroundColor: theme.colors.successSubtle,
  },
  statusFailed: {
    backgroundColor: theme.colors.errorSubtle,
  },
  statusScheduled: {
    backgroundColor: theme.colors.warningSubtle,
  },
  statusPillText: {
    ...theme.typography.small,
    color: theme.colors.text,
    fontWeight: '700',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
