import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Card,
  ScreenContainer,
  Button,
  IconButton,
  StatusBadge,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { CheckInService, GuestService, RegistrationService } from '../../../api/services';
import { ArrowLeft, UserCheck, Search, Users } from 'lucide-react-native';
import { safeArray } from '../../../utils/safeData';
import { safeString } from '../../../utils/safeText';
import { goBackOrFallback } from '../../../utils/navigationBack';

type ManageRegistrationsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageRegistrations'>;
type ManageRegistrationsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageRegistrations'>;

interface Props {
  navigation: ManageRegistrationsNavigationProp;
  route: ManageRegistrationsRouteProp;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'checked_in' | 'waitlisted' | 'not_going' | 'declined' | 'cancelled';
type RegistrationSource = 'booking' | 'registration';

interface ManagedRegistrationRecord {
  id: string;
  source: RegistrationSource;
  eventId: string;
  name: string;
  email: string;
  mobile: string;
  status: FilterStatus;
  ticketType: string;
  registeredAt: string;
  raw: any;
}

const STATUS_OPTIONS: FilterStatus[] = [
  'all',
  'pending',
  'approved',
  'rejected',
  'checked_in',
  'waitlisted',
  'not_going',
  'declined',
  'cancelled',
];

const STATUS_MAP: Record<string, any> = {
  checked_in: 'success',
  approved: 'success',
  pending: 'warning',
  rejected: 'error',
  waitlisted: 'warning',
  cancelled: 'error',
  declined: 'error',
  not_going: 'neutral',
};

const parseDateStamp = (value: string): number => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeBookingStatus = (booking: any): FilterStatus => {
  const effective = safeString(booking?.effectiveStatus, '').toLowerCase();
  if (effective === 'pending') return 'pending';
  if (effective === 'approved') return 'approved';
  if (effective === 'rejected') return 'rejected';
  if (effective === 'checked_in') return 'checked_in';
  if (effective === 'waitlisted') return 'waitlisted';
  if (effective === 'not_going') return 'not_going';
  if (effective === 'cancelled') return 'cancelled';

  if (booking?.isWaitlisted || safeString(booking?.bookingStatus, '') === 'pending') return 'waitlisted';
  if (safeString(booking?.approvalStatus, '') === 'pending') return 'pending';
  if (safeString(booking?.approvalStatus, '') === 'rejected') return 'rejected';
  if (safeString(booking?.checkInStatus, '') === 'checked_in') return 'checked_in';
  if (safeString(booking?.bookingStatus, '') === 'cancelled') return 'cancelled';
  if (safeString(booking?.rsvpStatus, '') === 'not_going') return 'not_going';
  return 'approved';
};

const normalizePublicRegistrationStatus = (registration: any): FilterStatus => {
  const rawStatus = safeString(registration?.status, '').toLowerCase();
  if (rawStatus === 'going') return 'approved';
  if (rawStatus === 'declined') return 'declined';
  if (rawStatus === 'not_going') return 'not_going';
  if (rawStatus === 'checked_in') return 'checked_in';
  if (rawStatus === 'pending') return 'pending';
  return 'approved';
};

export const ManageRegistrationsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [registrations, setRegistrations] = useState<ManagedRegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    try {
      setError(null);
      const [bookingRes, guestRes] = await Promise.all([
        RegistrationService.getEventRegistrations(eventId).catch(() => ({ data: { registrations: [] } })),
        GuestService.getEventGuests(eventId).catch(() => ({ data: { guests: [] } })),
      ]);

      const bookingRecords = safeArray<any>(bookingRes?.data?.registrations).map((entry) => ({
        id: safeString(entry?.id, ''),
        source: 'booking' as const,
        eventId: safeString(entry?.eventId, eventId),
        name: safeString(entry?.attendee?.name, 'Guest'),
        email: safeString(entry?.attendee?.email, ''),
        mobile: '',
        status: normalizeBookingStatus(entry),
        ticketType: safeString(entry?.ticket?.name, 'Ticket'),
        registeredAt: safeString(entry?.bookingDate || entry?.createdAt, ''),
        raw: entry,
      })).filter((entry) => entry.id);

      const guestRecords = safeArray<any>(guestRes?.data?.guests).map((entry) => ({
        id: safeString(entry?.id, ''),
        source: 'registration' as const,
        eventId: safeString(entry?.eventId, eventId),
        name: safeString(entry?.name, 'Guest'),
        email: safeString(entry?.email, ''),
        mobile: safeString(entry?.mobile, ''),
        status: normalizePublicRegistrationStatus(entry),
        ticketType: safeString(entry?.ticketType || 'General Admission', 'General Admission'),
        registeredAt: safeString(entry?.registeredAt || entry?.createdAt, ''),
        raw: entry,
      })).filter((entry) => entry.id);

      const merged = [...bookingRecords, ...guestRecords].sort((left, right) => (
        parseDateStamp(right.registeredAt) - parseDateStamp(left.registeredAt)
      ));
      setRegistrations(merged);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load registrations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRegistrations();
    }, [eventId]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRegistrations();
  }, [eventId]);

  const filteredRegistrations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedDate = dateFilter.trim();

    return registrations.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;

      if (normalizedSearch) {
        const haystack = `${entry.name} ${entry.email} ${entry.mobile} ${entry.ticketType}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (normalizedDate) {
        const entryDate = safeString(entry.registeredAt, '').slice(0, 10);
        if (entryDate !== normalizedDate) return false;
      }

      return true;
    });
  }, [registrations, search, statusFilter, dateFilter]);

  const runApprovalAction = async (entry: ManagedRegistrationRecord, action: 'approve' | 'reject') => {
    try {
      setUpdatingId(entry.id);
      if (entry.source === 'booking') {
        if (action === 'approve') await RegistrationService.approveRegistration(entry.id);
        else await RegistrationService.rejectRegistration(entry.id);
      } else if (action === 'approve') {
        await GuestService.updateGuestStatus(entry.id, 'going');
      } else {
        await GuestService.updateGuestStatus(entry.id, 'declined');
      }

      Alert.alert('Success', action === 'approve' ? 'Registration approved.' : 'Registration rejected.');
      await fetchRegistrations();
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const runManualCheckIn = async (entry: ManagedRegistrationRecord) => {
    try {
      if (entry.source === 'booking') {
        await CheckInService.manualCheckIn(entry.id);
      } else {
        await GuestService.checkInGuest(entry.id);
      }
      Alert.alert('Success', 'Guest checked in successfully.');
      await fetchRegistrations();
    } catch (err: any) {
      Alert.alert('Check-in Failed', err?.response?.data?.message || 'Unable to check in guest.');
    }
  };

  const handleBack = () => {
    goBackOrFallback(navigation as any, { name: 'ManageEvents' });
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchRegistrations} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={filteredRegistrations}
        keyExtractor={(item, index) => safeString(item.id, `registration-${index}`)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={(
          <>
            <View style={styles.pageHeader}>
              <View style={styles.headerLeft}>
                <IconButton
                  icon={<ArrowLeft size={20} color={theme.colors.text} />}
                  onPress={handleBack}
                  variant="surface"
                  size={36}
                />
                <View>
                  <Text style={styles.pageTitle}>Guest List</Text>
                  <Text style={styles.guestCount}>{filteredRegistrations.length} records</Text>
                </View>
              </View>
            </View>

            <View style={styles.filterWrap}>
              <Input
                placeholder="Search by name, email, ticket..."
                value={search}
                onChangeText={setSearch}
                leftIcon={<Search size={16} color={theme.colors.textMuted} />}
                containerStyle={styles.searchInput}
              />
              <Input
                placeholder="Date (YYYY-MM-DD)"
                value={dateFilter}
                onChangeText={setDateFilter}
                containerStyle={styles.dateInput}
              />
            </View>

            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.chip, statusFilter === status && styles.chipActive]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[styles.chipText, statusFilter === status && styles.chipTextActive]}>
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        ListEmptyComponent={(
          <EmptyState
            icon={<Users size={48} color={theme.colors.textMuted} />}
            title="No Guests Found"
            message="No registrations match the current filters."
          />
        )}
        renderItem={({ item }) => {
          const isPending = item.status === 'pending';
          const isApproved = item.status === 'approved';
          const isRejected = item.status === 'rejected' || item.status === 'declined' || item.status === 'cancelled';
          const isCheckedIn = item.status === 'checked_in';
          const canCheckIn = item.status === 'approved';

          return (
            <Card variant="raised" style={styles.guestCard} noPadding>
              <View style={styles.guestInner}>
                <View style={styles.guestTitleRow}>
                  <Text style={styles.guestName} numberOfLines={1}>{item.name}</Text>
                  <StatusBadge status={STATUS_MAP[item.status] ?? 'neutral'} label={item.status.replace('_', ' ')} />
                </View>

                <Text style={styles.metaText}>{item.email || 'No email provided'}</Text>
                {item.mobile ? <Text style={styles.metaText}>Mobile: {item.mobile}</Text> : null}
                <Text style={styles.metaText}>Ticket: {item.ticketType}</Text>
                <Text style={styles.metaText}>
                  Registered: {item.registeredAt ? new Date(item.registeredAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'Unknown'}
                </Text>

                {isPending ? (
                  <View style={styles.actionsRowPrimary}>
                    <Button
                      title="Approve"
                      onPress={() => runApprovalAction(item, 'approve')}
                      variant="primary"
                      size="sm"
                      fullWidth={false}
                      style={styles.actionBtn}
                      isLoading={updatingId === item.id}
                    />
                    <Button
                      title="Decline"
                      onPress={() => runApprovalAction(item, 'reject')}
                      variant="danger"
                      size="sm"
                      fullWidth={false}
                      style={styles.actionBtn}
                      isLoading={updatingId === item.id}
                    />
                  </View>
                ) : null}

                {(isApproved || isCheckedIn) ? (
                  <View style={styles.approvedRow}>
                    <Text style={styles.approvedLabel}>
                      {isCheckedIn ? 'Checked-in' : 'Approved'}
                    </Text>
                  </View>
                ) : null}

                {isRejected ? (
                  <View style={styles.rejectedRow}>
                    <Text style={styles.rejectedLabel}>Rejected</Text>
                  </View>
                ) : null}

                <View style={styles.actionsRowSecondary}>
                  {canCheckIn ? (
                    <Button
                      title="Check In"
                      onPress={() => runManualCheckIn(item)}
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      icon={<UserCheck size={13} color={theme.colors.success} />}
                      style={styles.actionBtn}
                    />
                  ) : null}
                  <Button
                    title="View"
                    onPress={() => {
                      Alert.alert(
                        safeString(item.name, 'Guest'),
                        [
                          `Email: ${safeString(item.email, '—')}`,
                          `Status: ${safeString(item.status, '—').replace('_', ' ')}`,
                          `Ticket: ${safeString(item.ticketType, '—')}`,
                          `Source: ${item.source === 'booking' ? 'Booking' : 'Registration'}`,
                        ].join('\n'),
                      );
                    }}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={styles.actionBtn}
                  />
                </View>
              </View>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: theme.spacing.base, paddingBottom: 100, flexGrow: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.m },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  guestCount: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  filterWrap: { marginBottom: theme.spacing.m, gap: theme.spacing.s },
  searchInput: { marginBottom: 0 },
  dateInput: { marginBottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginBottom: theme.spacing.m },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: theme.borderRadius.round, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySubtle },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  guestCard: { borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  guestInner: { padding: theme.spacing.m, gap: 4 },
  guestTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs },
  guestName: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1, marginRight: theme.spacing.s },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  actionsRowPrimary: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  actionsRowSecondary: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs },
  actionBtn: {
    flexGrow: 1,
    flexBasis: 96,
    minWidth: 96,
    maxWidth: 150,
    borderRadius: theme.borderRadius.s,
  },
  approvedRow: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.successSubtle,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    alignSelf: 'flex-start',
  },
  approvedLabel: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
  rejectedRow: {
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.errorSubtle,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    alignSelf: 'flex-start',
  },
  rejectedLabel: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
});
