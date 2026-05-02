import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Clock3, Filter, History } from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { theme } from '../../../constants/theme';
import {
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  ScreenContainer,
} from '../../../components';
import { CheckInService } from '../../../api/services';
import { CheckInHistoryRecord } from '../../../types';
import { safeUpper } from '../../../utils/safeText';

interface Props {
  navigation: NativeStackNavigationProp<HostAdminEventStackParamList, 'CheckInHistory'>;
  route: RouteProp<HostAdminEventStackParamList, 'CheckInHistory'>;
}

type FilterStatus = 'all' | 'success' | 'duplicate' | 'invalid' | 'rejected';

export const CheckInHistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [history, setHistory] = useState<CheckInHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<FilterStatus>('all');

  const fetchHistory = async () => {
    try {
      setError(null);
      const response = await CheckInService.getCheckInHistory(eventId, {
        result: resultFilter === 'all' ? undefined : resultFilter,
        limit: 150,
      });
      setHistory(response.data.history || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load check-in history');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchHistory(); }, [eventId, resultFilter]));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchHistory();
  }, [eventId, resultFilter]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchHistory} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={history}
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
              <View>
                <Text style={styles.title}>Check-in History</Text>
                <Text style={styles.subtitle}>Every scan attempt is recorded</Text>
              </View>
            </View>

            <View style={styles.filterRow}>
              {(['all', 'success', 'duplicate', 'invalid', 'rejected'] as FilterStatus[]).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.filterChip, resultFilter === value && styles.filterChipActive]}
                  onPress={() => setResultFilter(value)}
                >
                  <Text style={[styles.filterText, resultFilter === value && styles.filterTextActive]}>
                    {value === 'all' ? 'All' : value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<History size={44} color={theme.colors.textMuted} />}
            title="No Scan Records"
            message="QR scan attempts will appear here."
          />
        }
        renderItem={({ item }) => {
          const badgeStyle = item.result === 'success'
            ? styles.resultSuccess
            : item.result === 'duplicate'
              ? styles.resultDuplicate
              : item.result === 'invalid'
                ? styles.resultInvalid
                : styles.resultRejected;

          return (
            <Card variant="raised" style={styles.rowCard} noPadding>
              <View style={styles.rowInner}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{item.guest?.name || 'Unknown guest'}</Text>
                    <Text style={styles.guestEmail}>{item.guest?.email || item.reason}</Text>
                  </View>
                  <View style={[styles.resultPill, badgeStyle]}>
                    <Text style={styles.resultText}>{safeUpper(item.result)}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Clock3 size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{new Date(item.scannedAt).toLocaleString()}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Filter size={12} color={theme.colors.textMuted} />
                  <Text style={styles.metaText}>{item.reason || 'No reason provided'}</Text>
                </View>
                <Text style={styles.metaText}>Scanned By: {item.scannedBy.name}</Text>
              </View>
            </Card>
          );
        }}
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
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  filterText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  filterTextActive: {
    color: theme.colors.primary,
  },
  rowCard: {
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.s,
    overflow: 'hidden',
  },
  rowInner: {
    padding: theme.spacing.m,
  },
  rowTop: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  guestName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  guestEmail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  resultPill: {
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultSuccess: {
    backgroundColor: theme.colors.successSubtle,
  },
  resultDuplicate: {
    backgroundColor: theme.colors.warningSubtle,
  },
  resultInvalid: {
    backgroundColor: theme.colors.errorSubtle,
  },
  resultRejected: {
    backgroundColor: theme.colors.accentSubtle,
  },
  resultText: {
    ...theme.typography.small,
    color: theme.colors.text,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
