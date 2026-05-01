import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert, Linking } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { EmptyState, ErrorState, Input, LoadingState, NeonCard, ScreenContainer, Button } from '../../../components';
import { theme } from '../../../constants/theme';
import { GuestRecord, GuestService } from '../../../api/services';
import { ArrowLeft, Check, X, Download, UserCheck, Square, CheckSquare } from 'lucide-react-native';

type ManageRegistrationsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageRegistrations'>;
type ManageRegistrationsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageRegistrations'>;

interface Props {
  navigation: ManageRegistrationsNavigationProp;
  route: ManageRegistrationsRouteProp;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'checked_in' | 'not_checked_in' | 'confirmed' | 'cancelled';

const statusOptions: FilterStatus[] = [
  'all',
  'pending',
  'approved',
  'rejected',
  'checked_in',
  'not_checked_in',
  'confirmed',
  'cancelled',
];

const getApprovalColor = (status: string) => {
  switch (status) {
    case 'approved':
      return theme.colors.success;
    case 'pending':
      return theme.colors.warning;
    case 'rejected':
      return theme.colors.error;
    default:
      return theme.colors.textMuted;
  }
};

export const ManageRegistrationsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

  const [guests, setGuests] = useState<GuestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const queryParams = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: search.trim() || undefined,
    date: dateFilter.trim() || undefined,
  }), [statusFilter, search, dateFilter]);

  const fetchGuests = async () => {
    try {
      setError(null);
      const response = await GuestService.getEventGuests(eventId, queryParams);
      setGuests(response.data.guests);
      setSelectedIds((previousSelected) => previousSelected.filter((id) => response.data.guests.some((guest: GuestRecord) => guest.id === id)));
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load guests');
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

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === guests.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(guests.map((guest) => guest.id));
  };

  const runSingleStatusAction = async (guestId: string, status: 'approved' | 'rejected') => {
    try {
      await GuestService.updateGuestStatus(guestId, status);
      fetchGuests();
    } catch (actionError: any) {
      Alert.alert('Error', actionError.response?.data?.message || `Failed to set status to ${status}`);
    }
  };

  const runSingleCheckIn = async (guestId: string) => {
    try {
      await GuestService.checkInGuest(guestId);
      fetchGuests();
    } catch (actionError: any) {
      Alert.alert('Error', actionError.response?.data?.message || 'Failed to check in guest');
    }
  };

  const runBulkAction = async (action: 'approve' | 'reject' | 'checkin') => {
    if (selectedIds.length === 0) {
      Alert.alert('No Selection', 'Select at least one guest.');
      return;
    }

    try {
      setIsBulkApplying(true);
      await GuestService.bulkAction({ action, ids: selectedIds });
      setSelectedIds([]);
      fetchGuests();
    } catch (bulkError: any) {
      Alert.alert('Error', bulkError.response?.data?.message || `Failed to run bulk ${action}`);
    } finally {
      setIsBulkApplying(false);
    }
  };

  const exportCsv = async () => {
    try {
      setIsExporting(true);
      const csvData = await GuestService.exportEventGuests(eventId, queryParams);
      const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvData)}`;
      const canOpen = await Linking.canOpenURL(dataUrl);
      if (canOpen) {
        await Linking.openURL(dataUrl);
      } else {
        Alert.alert('Export Ready', 'CSV generated successfully. Copy from preview:\n\n' + csvData.slice(0, 500));
      }
    } catch (exportError: any) {
      Alert.alert('Export Error', exportError.response?.data?.message || 'Failed to export guest CSV');
    } finally {
      setIsExporting(false);
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
        <Text style={styles.title}>Guest Management</Text>
      </View>

      <View style={styles.filterSection}>
        <Input label="Search (name/email)" value={search} onChangeText={setSearch} placeholder="Search attendee" />
        <Input label="Date (YYYY-MM-DD)" value={dateFilter} onChangeText={setDateFilter} placeholder="2026-12-25" />

        <Text style={styles.filterLabel}>Status Filter</Text>
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

        <View style={styles.topActionsRow}>
          <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
            {selectedIds.length === guests.length && guests.length > 0 ? (
              <CheckSquare size={16} color={theme.colors.primary} />
            ) : (
              <Square size={16} color={theme.colors.textMuted} />
            )}
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportButton} onPress={exportCsv} disabled={isExporting}>
            <Download size={16} color={theme.colors.text} />
            <Text style={styles.exportText}>{isExporting ? 'Exporting...' : 'Export CSV'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bulkActionsRow}>
          <Button title="Bulk Approve" onPress={() => runBulkAction('approve')} disabled={isBulkApplying} size="small" />
          <Button title="Bulk Reject" onPress={() => runBulkAction('reject')} disabled={isBulkApplying} size="small" variant="secondary" />
          <Button title="Bulk Check-in" onPress={() => runBulkAction('checkin')} disabled={isBulkApplying} size="small" variant="outline" />
        </View>
      </View>

      <FlatList
        data={guests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        renderItem={({ item }) => (
          <NeonCard style={styles.guestCard}>
            <View style={styles.cardTopRow}>
              <TouchableOpacity style={styles.checkboxRow} onPress={() => toggleSelection(item.id)}>
                {selectedIds.includes(item.id) ? (
                  <CheckSquare size={16} color={theme.colors.primary} />
                ) : (
                  <Square size={16} color={theme.colors.textMuted} />
                )}
                <Text style={styles.guestName}>{item.guestName}</Text>
              </TouchableOpacity>
              <View style={[styles.badge, { borderColor: getApprovalColor(item.approvalStatus), backgroundColor: `${getApprovalColor(item.approvalStatus)}20` }]}>
                <Text style={[styles.badgeText, { color: getApprovalColor(item.approvalStatus) }]}>
                  {item.approvalStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.metaText}>{item.guestEmail}</Text>
            <Text style={styles.metaText}>Ticket: {item.ticketName}</Text>
            <Text style={styles.metaText}>Booking: {item.bookingStatus.toUpperCase()}</Text>
            <Text style={styles.metaText}>RSVP: {item.rsvpStatus.toUpperCase()}</Text>
            <Text style={styles.metaText}>Check-in: {item.checkInStatus.toUpperCase()}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveAction]} onPress={() => runSingleStatusAction(item.id, 'approved')}>
                <Check size={14} color={theme.colors.success} />
                <Text style={[styles.actionText, { color: theme.colors.success }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectAction]} onPress={() => runSingleStatusAction(item.id, 'rejected')}>
                <X size={14} color={theme.colors.error} />
                <Text style={[styles.actionText, { color: theme.colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.checkinAction]} onPress={() => runSingleCheckIn(item.id)}>
                <UserCheck size={14} color={theme.colors.primary} />
                <Text style={[styles.actionText, { color: theme.colors.primary }]}>Check-in</Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}
        ListEmptyComponent={<EmptyState title="No Guests Found" message="No attendee records match current filters." />}
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
  },
  statusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  statusChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  statusChipText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  statusChipTextSelected: {
    color: theme.colors.primary,
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
  },
  selectAllText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    backgroundColor: `${theme.colors.primary}20`,
  },
  exportText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
    fontWeight: '600',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.s,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  guestName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
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
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    borderWidth: 1,
  },
  approveAction: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}1A`,
  },
  rejectAction: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}1A`,
  },
  checkinAction: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}1A`,
  },
  actionText: {
    ...theme.typography.small,
    marginLeft: theme.spacing.xs,
    fontWeight: '700',
  },
});
