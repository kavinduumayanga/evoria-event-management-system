import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { EmptyState, ErrorState, FormInput, LoadingState, GlassCard, ScreenContainer, SecondaryButton } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventRegistrationStatus } from '../../../types';
import { GuestRecord, GuestService } from '../../../api/services';
import { ArrowLeft, UserCheck, CheckCircle2, XCircle, Ban } from 'lucide-react-native';

type ManageRegistrationsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageRegistrations'>;
type ManageRegistrationsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageRegistrations'>;

interface Props {
  navigation: ManageRegistrationsNavigationProp;
  route: ManageRegistrationsRouteProp;
}

type FilterStatus = 'all' | EventRegistrationStatus;

const statusOptions: FilterStatus[] = [
  'all',
  'pending',
  'going',
  'checked_in',
  'not_going',
  'declined',
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'checked_in':
      return theme.colors.success;
    case 'going':
      return theme.colors.primaryLight;
    case 'pending':
      return theme.colors.warning;
    case 'declined':
      return theme.colors.error;
    case 'not_going':
      return theme.colors.textMuted;
    default:
      return theme.colors.textMuted;
  }
};

const getCardVariant = (status: string) => {
  if (status === 'checked_in') return 'neonPurple';
  if (status === 'declined' || status === 'not_going') return 'dark';
  return 'dark';
};

export const ManageRegistrationsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState('');

  const queryParams = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search.trim() || undefined,
    date: dateFilter.trim() || undefined,
  }), [statusFilter, search, dateFilter]);

  const fetchGuests = async () => {
    try {
      setError(null);
      const response = await GuestService.getEventGuests(eventId, queryParams);
      setGuests(response.data.guests || []);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load guests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGuests();
    }, [eventId, queryParams.status, queryParams.search, queryParams.date]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchGuests();
  }, [eventId, queryParams.status, queryParams.search, queryParams.date]);

  const setGuestStatus = async (guestId: string, status: EventRegistrationStatus) => {
    try {
      await GuestService.updateGuestStatus(guestId, status);
      fetchGuests();
    } catch (statusError: any) {
      Alert.alert('Error', statusError?.response?.data?.message || `Failed to set status to ${status}`);
    }
  };

  const runManualCheckIn = async (guestId: string) => {
    try {
      await GuestService.checkInGuest(guestId);
      fetchGuests();
    } catch (checkInError: any) {
      Alert.alert('Error', checkInError?.response?.data?.message || 'Failed to check in guest');
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchGuests} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Guest List</Text>
      </View>

      <View style={styles.filterSection}>
        <FormInput label="Search (name/email/mobile/NIC)" value={search} onChangeText={setSearch} placeholder="Search guest" />
        <FormInput label="Date (YYYY-MM-DD)" value={dateFilter} onChangeText={setDateFilter} placeholder="2026-12-25" />

        <Text style={styles.filterLabel}>Status Filter</Text>
        <GlassCard style={styles.statusChipsContainer}>
          <View style={styles.statusChipsRow}>
            {statusOptions.map((statusOption) => (
              <TouchableOpacity
                key={statusOption}
                style={[styles.statusChip, statusFilter === statusOption && styles.statusChipSelected]}
                onPress={() => setStatusFilter(statusOption)}
              >
                <Text style={[styles.statusChipText, statusFilter === statusOption && styles.statusChipTextSelected]}>
                  {statusOption.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      </View>

      <FlatList
        data={guests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          return (
            <GlassCard style={styles.guestCard} variant={getCardVariant(item.status)}>
              <View style={styles.cardTopRow}>
                <Text style={styles.guestName}>{item.name}</Text>
                <View style={[styles.badge, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.metaText}>{item.email}</Text>
              <Text style={styles.metaText}>Mobile: {item.mobile}</Text>
              <Text style={styles.metaText}>NIC: {item.nic}</Text>
              <Text style={styles.metaText}>Registered: {new Date(item.registeredAt).toLocaleString()}</Text>
              {item.checkedInAt ? (
                <Text style={styles.metaText}>
                  Checked-in: {new Date(item.checkedInAt).toLocaleString()} ({item.checkInMethod || 'manual'})
                </Text>
              ) : null}

              <View style={styles.actionsRow}>
                <SecondaryButton
                  title="Going"
                  icon={<CheckCircle2 size={14} color={theme.colors.text} />}
                  onPress={() => setGuestStatus(item.id, 'going')}
                  style={styles.actionBtn}
                />
                <SecondaryButton
                  title="Not Going"
                  icon={<Ban size={14} color={theme.colors.text} />}
                  onPress={() => setGuestStatus(item.id, 'not_going')}
                  style={styles.actionBtn}
                />
                <SecondaryButton
                  title="Decline"
                  icon={<XCircle size={14} color={theme.colors.error} />}
                  onPress={() => setGuestStatus(item.id, 'declined')}
                  style={styles.actionBtn}
                />
                {item.status !== 'checked_in' ? (
                  <SecondaryButton
                    title="Check-in"
                    icon={<UserCheck size={14} color={theme.colors.success} />}
                    onPress={() => runManualCheckIn(item.id)}
                    style={styles.actionBtn}
                  />
                ) : null}
              </View>
            </GlassCard>
          );
        }}
        ListEmptyComponent={<EmptyState title="No Guests Found" message="No guest registrations match current filters." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  backButton: { marginRight: theme.spacing.m },
  title: { ...theme.typography.h1, color: theme.colors.text },
  filterSection: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  filterLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
  },
  statusChipsContainer: {
    padding: 4,
    borderRadius: theme.borderRadius.m,
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
  },
  statusChipSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  statusChipText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statusChipTextSelected: {
    color: theme.colors.primaryLight,
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  guestCard: {
    marginBottom: theme.spacing.m,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  guestName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.s,
  },
  badge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  badgeText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  actionBtn: {
    flexGrow: 1,
    minWidth: '40%',
  },
});
