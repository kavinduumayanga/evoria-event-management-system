import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, Card, StatusBadge, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { WaitlistService } from '../../api/services';
import { Booking } from '../../types';
import { ListOrdered, Calendar, Clock, ArrowLeft } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AttendeeHomeStackParamList } from '../../types/navigation';

interface WaitlistItem extends Booking {
  status: 'waiting' | 'promoted';
  event?: { id: string; title: string; date: string; startTime: string; endTime: string } | null;
}

export const MyWaitlistScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AttendeeHomeStackParamList>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WaitlistItem[]>([]);

  const fetchWaitlist = async () => {
    try {
      setError(null);
      const res = await WaitlistService.getMyWaitlist();
      setItems(res.data.waitlist || []);
    } catch { setError('Failed to load waitlist status'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchWaitlist(); }, []));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchWaitlist(); }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchWaitlist} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <IconButton
                icon={<ArrowLeft size={20} color={theme.colors.text} />}
                onPress={() => navigation.goBack()}
                variant="surface"
                size={36}
              />
              <Text style={styles.pageTitle}>My Waitlist</Text>
            </View>
            <View style={styles.pageHeader}>
              <Text style={styles.pageSubtitle}>Track your waiting and promoted entries</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ListOrdered size={48} color={theme.colors.textMuted} />}
            title="No Waitlist Entries"
            message="You are not currently waiting for any full events."
          />
        }
        renderItem={({ item }) => {
          const isWaiting = item.status === 'waiting';
          return (
            <Card variant="raised" style={styles.card} noPadding>
              {/* Position strip */}
              <View style={[styles.positionStrip, { backgroundColor: isWaiting ? theme.colors.warningSubtle : theme.colors.successSubtle }]}>
                <Text style={[styles.positionNum, { color: isWaiting ? theme.colors.warning : theme.colors.success }]}>
                  {item.waitlistPosition !== null ? `#${item.waitlistPosition}` : '✓'}
                </Text>
              </View>

              <View style={styles.cardContent}>
                {/* Title + badge */}
                <View style={styles.titleRow}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{item.event?.title || 'Event'}</Text>
                  <StatusBadge
                    status={isWaiting ? 'warning' : 'success'}
                    label={isWaiting ? 'Waiting' : 'Promoted'}
                  />
                </View>

                {/* Meta */}
                <View style={styles.metaRow}>
                  <Calendar size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>
                    {item.event?.date ? new Date(item.event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Clock size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{item.event?.startTime || '--'} – {item.event?.endTime || '--'}</Text>
                </View>
                <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
              </View>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: theme.spacing.base, paddingBottom: 140, flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.l,
  },
  pageHeader: { marginBottom: theme.spacing.l },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  pageSubtitle: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 4 },
  card: { flexDirection: 'row', borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  positionStrip: { width: 52, justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.m },
  positionNum: { ...theme.typography.h2, fontWeight: '800' },
  cardContent: { flex: 1, padding: theme.spacing.m, gap: 4 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.s, marginBottom: theme.spacing.xs },
  eventTitle: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  quantityText: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600', marginTop: 2 },
});
