import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  ScreenContainer, LoadingState, ErrorState, EmptyState,
  Card, Button, IconButton, StatusBadge,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService, WaitlistService } from '../../../api/services';
import { Event, Booking } from '../../../types';
import { ArrowLeft, UserCheck, ListOrdered } from 'lucide-react-native';
import { safeArray } from '../../../utils/safeData';
import { safeString } from '../../../utils/safeText';

interface WaitlistItem extends Booking {
  attendee?: { id: string; name: string; email: string } | null;
}

type NavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageWaitlist'>;
type RouteProps = RouteProp<HostAdminEventStackParamList, 'ManageWaitlist'>;
interface Props { navigation: NavigationProp; route: RouteProps; }

export const ManageWaitlistScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);

  const fetchData = async () => {
    try {
      setError(null);
      const [eventRes, waitlistRes] = await Promise.all([
        EventService.getEvent(eventId),
        WaitlistService.getEventWaitlist(eventId),
      ]);
      setEvent((eventRes?.data?.event as Event) || null);
      setWaitlist(safeArray<WaitlistItem>(waitlistRes?.data?.waitlist));
    } catch { setError('Failed to load waitlist'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [eventId]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchData(); }, [eventId]);

  const handlePromote = (bookingId: string, attendeeName: string) => {
    Alert.alert('Promote Attendee', `Promote ${attendeeName} to a confirmed booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote',
        onPress: async () => {
          try {
            await WaitlistService.promoteBooking(bookingId);
            fetchData();
          } catch (err: any) {
            Alert.alert('Failed', err.response?.data?.message || 'Unable to promote waitlist booking');
          }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={waitlist}
        keyExtractor={(item, index) => safeString(item.id, `waitlist-${index}`)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.headerLeft}>
              <IconButton
                icon={<ArrowLeft size={20} color={theme.colors.text} />}
                onPress={() => navigation.goBack()}
                variant="surface"
                size={36}
              />
              <View>
                <Text style={styles.pageTitle}>Waitlist</Text>
                {event && <Text style={styles.eventName} numberOfLines={1}>{event.title}</Text>}
              </View>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{waitlist.length} waiting</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ListOrdered size={48} color={theme.colors.textMuted} />}
            title="Waitlist Empty"
            message="No attendees are currently waiting for this event."
          />
        }
        renderItem={({ item, index }) => (
          <Card variant="raised" style={styles.waitCard} noPadding>
            <View style={styles.positionBadge}>
              <Text style={styles.positionNum}>#{item.waitlistPosition ?? index + 1}</Text>
            </View>
            <View style={styles.waitContent}>
              <Text style={styles.attendeeName}>{item.attendee?.name || 'Attendee'}</Text>
              <Text style={styles.attendeeEmail}>{item.attendee?.email || 'No email'}</Text>
              <View style={styles.waitMeta}>
                <Text style={styles.waitMetaText}>Qty: {item.quantity}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.waitMetaText}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
            <Button
              title="Promote"
              onPress={() => handlePromote(item.id, item.attendee?.name || 'this attendee')}
              variant="secondary"
              size="sm"
              icon={<UserCheck size={14} color={theme.colors.success} />}
              fullWidth={false}
              style={styles.promoteBtn}
            />
          </Card>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: theme.spacing.base, paddingBottom: 100, flexGrow: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.l },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m, flex: 1 },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  eventName: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  countPill: { backgroundColor: theme.colors.warningSubtle, borderRadius: theme.borderRadius.round, paddingHorizontal: 10, paddingVertical: 4 },
  countText: { ...theme.typography.label, color: theme.colors.warning },
  waitCard: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  positionBadge: { width: 52, height: '100%', backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.m },
  positionNum: { ...theme.typography.h3, color: theme.colors.primary, fontWeight: '700' },
  waitContent: { flex: 1, padding: theme.spacing.m, gap: 2 },
  attendeeName: { ...theme.typography.bodyMedium, color: theme.colors.text },
  attendeeEmail: { ...theme.typography.caption, color: theme.colors.textMuted },
  waitMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  waitMetaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  dot: { ...theme.typography.caption, color: theme.colors.textMuted },
  promoteBtn: { marginRight: theme.spacing.m },
});
