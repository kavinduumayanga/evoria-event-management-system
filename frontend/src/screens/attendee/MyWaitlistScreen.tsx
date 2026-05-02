import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard } from '../../components';
import { theme } from '../../constants/theme';
import { WaitlistService } from '../../api/services';
import { Booking } from '../../types';

interface WaitlistItem extends Booking {
  status: 'waiting' | 'promoted';
  event?: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
  } | null;
}

export const MyWaitlistScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WaitlistItem[]>([]);

  const fetchWaitlist = async () => {
    try {
      setError(null);
      const response = await WaitlistService.getMyWaitlist();
      setItems(response.data.waitlist || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load waitlist status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWaitlist();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchWaitlist();
  }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchWaitlist} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Waitlist</Text>
        <Text style={styles.subtitle}>Track waiting and promoted entries</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isWaiting = item.status === 'waiting';
          return (
            <GlassCard style={styles.card} variant="dark">
              <View style={styles.cardHeader}>
                <Text style={styles.eventTitle}>{item.event?.title || 'Event'}</Text>
                <View style={[
                  styles.statusBadge,
                  { borderColor: isWaiting ? theme.colors.warning : theme.colors.success },
                  { backgroundColor: isWaiting ? `${theme.colors.warning}22` : `${theme.colors.success}22` },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: isWaiting ? theme.colors.warning : theme.colors.success },
                  ]}>
                    {isWaiting ? 'WAITING' : 'PROMOTED'}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>
                Date: {item.event?.date ? new Date(item.event.date).toLocaleDateString() : 'TBD'}
              </Text>
              <Text style={styles.metaText}>
                Time: {item.event?.startTime || '--'} - {item.event?.endTime || '--'}
              </Text>
              <Text style={styles.metaText}>Quantity: {item.quantity}</Text>
              <Text style={styles.metaText}>
                Position: {item.waitlistPosition !== null ? `#${item.waitlistPosition}` : 'Cleared'}
              </Text>
            </GlassCard>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Waitlist Entries"
            message="You are not currently waiting for any full events."
          />
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
    gap: theme.spacing.s,
  },
  eventTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
