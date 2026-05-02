import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  EmptyState, ErrorState, Input, LoadingState,
  Card, ScreenContainer, Button, IconButton, StatusBadge,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { EventRegistrationStatus } from '../../../types';
import { GuestRecord, GuestService } from '../../../api/services';
import { ArrowLeft, UserCheck, CheckCircle2, XCircle, Ban, Search, Users } from 'lucide-react-native';

type ManageRegistrationsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageRegistrations'>;
type ManageRegistrationsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageRegistrations'>;

interface Props {
  navigation: ManageRegistrationsNavigationProp;
  route: ManageRegistrationsRouteProp;
}

type FilterStatus = 'all' | EventRegistrationStatus;

const STATUS_OPTIONS: FilterStatus[] = ['all', 'pending', 'going', 'checked_in', 'not_going', 'declined'];

const STATUS_MAP: Record<string, any> = {
  checked_in: 'success',
  going: 'info',
  pending: 'warning',
  declined: 'error',
  not_going: 'neutral',
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
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load guests');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchGuests(); },
      [eventId, queryParams.status, queryParams.search, queryParams.date])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchGuests();
  }, [eventId, queryParams.status, queryParams.search, queryParams.date]);

  const setGuestStatus = async (guestId: string, status: EventRegistrationStatus) => {
    try {
      await GuestService.updateGuestStatus(guestId, status);
      fetchGuests();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || `Failed to set status to ${status}`);
    }
  };

  const runManualCheckIn = async (guestId: string) => {
    try {
      await GuestService.checkInGuest(guestId);
      fetchGuests();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to check in guest');
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchGuests} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={guests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Page header */}
            <View style={styles.pageHeader}>
              <View style={styles.headerLeft}>
                <IconButton
                  icon={<ArrowLeft size={20} color={theme.colors.text} />}
                  onPress={() => navigation.goBack()}
                  variant="surface"
                  size={36}
                />
                <View>
                  <Text style={styles.pageTitle}>Guest List</Text>
                  <Text style={styles.guestCount}>{guests.length} registered</Text>
                </View>
              </View>
            </View>

            {/* Search + Date */}
            <View style={styles.filterWrap}>
              <Input
                placeholder="Search by name, email, NIC..."
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

            {/* Status chips */}
            <View style={styles.chipRow}>
              {STATUS_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, statusFilter === s && styles.chipActive]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                    {s === 'all' ? 'All' : s.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={48} color={theme.colors.textMuted} />}
            title="No Guests Found"
            message="No registrations match the current filters."
          />
        }
        renderItem={({ item }) => (
          <Card variant="raised" style={styles.guestCard} noPadding>
            <View style={styles.guestInner}>
              {/* Title row */}
              <View style={styles.guestTitleRow}>
                <Text style={styles.guestName} numberOfLines={1}>{item.name}</Text>
                <StatusBadge status={STATUS_MAP[item.status] ?? 'neutral'} label={item.status.replace('_', ' ')} />
              </View>

              {/* Meta */}
              <Text style={styles.metaText}>{item.email}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Mobile: {item.mobile}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>NIC: {item.nic}</Text>
              </View>
              {item.checkedInAt && (
                <Text style={styles.checkedInText}>
                  ✓ Checked in {new Date(item.checkedInAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <Button
                  title="Going"
                  onPress={() => setGuestStatus(item.id, 'going')}
                  variant={item.status === 'going' ? 'primary' : 'secondary'}
                  size="sm"
                  style={styles.actionBtn}
                />
                <Button
                  title="Not Going"
                  onPress={() => setGuestStatus(item.id, 'not_going')}
                  variant={item.status === 'not_going' ? 'danger' : 'secondary'}
                  size="sm"
                  style={styles.actionBtn}
                />
                <Button
                  title="Decline"
                  onPress={() => setGuestStatus(item.id, 'declined')}
                  variant={item.status === 'declined' ? 'danger' : 'ghost'}
                  size="sm"
                  style={styles.actionBtn}
                />
                {item.status !== 'checked_in' && (
                  <Button
                    title="Check In"
                    onPress={() => runManualCheckIn(item.id)}
                    variant="secondary"
                    size="sm"
                    icon={<UserCheck size={13} color={theme.colors.success} />}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </View>
          </Card>
        )}
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  metaDot: { ...theme.typography.caption, color: theme.colors.textMuted },
  checkedInText: { ...theme.typography.caption, color: theme.colors.success, marginTop: 2 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm },
  actionBtn: { flexGrow: 1, minWidth: '44%' },
});
