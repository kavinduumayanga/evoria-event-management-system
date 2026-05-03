import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarClock,
  Download,
  MailPlus,
  Megaphone,
  QrCode,
  Users,
  UserCheck,
  XCircle,
  Clock3,
  DollarSign,
  Star,
} from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { theme } from '../../../constants/theme';
import {
  Button,
  Card,
  ErrorState,
  IconButton,
  Input,
  LoadingState,
  ScreenContainer,
} from '../../../components';
import { EventService, GuestService, EventDashboardData, RegistrationService } from '../../../api/services';
import { useAuthStore } from '../../../store/auth.store';
import { safeArray } from '../../../utils/safeData';
import { safeString } from '../../../utils/safeText';
import { goBackOrFallback } from '../../../utils/navigationBack';

interface Props {
  navigation: NativeStackNavigationProp<HostAdminEventStackParamList, 'EventDashboard'>;
  route: RouteProp<HostAdminEventStackParamList, 'EventDashboard'>;
}

const formatPercent = (value: number) => `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;

const StatTile = ({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) => (
  <Card variant="raised" style={styles.statTile} noPadding>
    <View style={styles.statTileInner}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </Card>
);

const normalizeDashboardData = (payload: any): EventDashboardData => ({
  totalRegistrations: Number(payload?.totalRegistrations || 0),
  pendingCount: Number(payload?.pendingCount || 0),
  goingCount: Number(payload?.goingCount || 0),
  declinedCount: Number(payload?.declinedCount || 0),
  checkedInCount: Number(payload?.checkedInCount || 0),
  capacity: {
    used: Number(payload?.capacity?.used || 0),
    total: Number(payload?.capacity?.total || 0),
    percentage: Number(payload?.capacity?.percentage || 0),
  },
  ticketsSold: Number(payload?.ticketsSold || 0),
  revenue: Number(payload?.revenue || 0),
  remindersCount: Number(payload?.remindersCount || 0),
  feedback: {
    averageRating: Number(payload?.feedback?.averageRating || 0),
    totalReviews: Number(payload?.feedback?.totalReviews || 0),
  },
  recentRegistrations: safeArray(payload?.recentRegistrations) as EventDashboardData['recentRegistrations'],
  recentCheckIns: safeArray(payload?.recentCheckIns) as EventDashboardData['recentCheckIns'],
});

export const EventDashboardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<EventDashboardData | null>(null);
  const [coHosts, setCoHosts] = useState<any[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [blastMessage, setBlastMessage] = useState('');

  const [isInviting, setIsInviting] = useState(false);
  const [isBlasting, setIsBlasting] = useState(false);
  const [isUpdatingApprovalId, setIsUpdatingApprovalId] = useState<string | null>(null);

  const [hostEmail, setHostEmail] = useState('');
  const [isAddingHost, setIsAddingHost] = useState(false);

  const fetchDashboard = async () => {
    try {
      setError(null);
      const [dashboardRes, coHostsRes] = await Promise.all([
        EventService.getEventDashboard(eventId),
        EventService.getCoHosts(eventId).catch(() => ({ data: { coHosts: [] } })),
      ]);
      setDashboard(normalizeDashboardData(dashboardRes?.data));
      setCoHosts(coHostsRes?.data?.coHosts || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load event dashboard');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, [eventId]));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDashboard();
  }, [eventId]);

  const statusBars = useMemo(() => {
    if (!dashboard || dashboard.totalRegistrations <= 0) {
      return [
        { key: 'pending', label: 'Pending', value: 0, color: theme.colors.warning },
        { key: 'going', label: 'Going', value: 0, color: theme.colors.success },
        { key: 'declined', label: 'Declined', value: 0, color: theme.colors.error },
      ];
    }

    return [
      {
        key: 'pending',
        label: 'Pending',
        value: (dashboard.pendingCount / dashboard.totalRegistrations) * 100,
        color: theme.colors.warning,
      },
      {
        key: 'going',
        label: 'Going',
        value: (dashboard.goingCount / dashboard.totalRegistrations) * 100,
        color: theme.colors.success,
      },
      {
        key: 'declined',
        label: 'Declined',
        value: (dashboard.declinedCount / dashboard.totalRegistrations) * 100,
        color: theme.colors.error,
      },
    ];
  }, [dashboard]);

  const pendingApprovals = useMemo(
    () => safeArray(dashboard?.recentRegistrations).filter((entry: any) => safeString(entry?.status, '').toLowerCase() === 'pending'),
    [dashboard?.recentRegistrations],
  );

  const handleAddHost = async () => {
    if (!hostEmail.trim()) {
      Alert.alert('Missing Email', 'Enter the user email to add as host.');
      return;
    }
    try {
      setIsAddingHost(true);
      await EventService.addCoHost(eventId, { email: hostEmail.trim() });
      setHostEmail('');
      Alert.alert('Host Added', 'Co-host added successfully.');
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Add Host Failed', err?.response?.data?.message || 'Unable to add host');
    } finally {
      setIsAddingHost(false);
    }
  };

  const handleRemoveHost = async (userId: string) => {
    Alert.alert('Remove Host', 'Are you sure you want to remove this co-host?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await EventService.removeCoHost(eventId, userId);
            fetchDashboard();
          } catch (err: any) {
            Alert.alert('Remove Failed', err?.response?.data?.message || 'Unable to remove host');
          }
        },
      },
    ]);
  };

  const handleInviteGuest = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Missing Email', 'Enter a guest email first.');
      return;
    }

    try {
      setIsInviting(true);
      const response = await EventService.inviteGuest(eventId, {
        email: inviteEmail.trim(),
        message: inviteMessage.trim() || undefined,
      });
      Alert.alert('Invite', response.message || 'Invitation sent successfully');
      setInviteEmail('');
      setInviteMessage('');
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Invite Failed', err?.response?.data?.message || 'Unable to invite guest');
    } finally {
      setIsInviting(false);
    }
  };

  const handleSendBlast = async () => {
    if (!blastMessage.trim()) {
      Alert.alert('Missing Message', 'Enter a blast message first.');
      return;
    }

    try {
      setIsBlasting(true);
      const response = await EventService.blastMessage(eventId, { message: blastMessage.trim() });
      Alert.alert('Blast', response.message || 'Blast sent successfully');
      setBlastMessage('');
      fetchDashboard();
    } catch (err: any) {
      Alert.alert('Blast Failed', err?.response?.data?.message || 'Unable to send blast');
    } finally {
      setIsBlasting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await GuestService.exportEventGuests(eventId);
      const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      await Linking.openURL(dataUrl);
      Alert.alert('Export Ready', 'Guest CSV opened successfully.');
    } catch (err: any) {
      Alert.alert('Export Failed', err?.response?.data?.message || 'Unable to export guest CSV');
    }
  };

  const handlePendingApprovalAction = async (entry: EventDashboardData['recentRegistrations'][number], action: 'approve' | 'reject') => {
    try {
      setIsUpdatingApprovalId(entry.id);
      if (entry.source === 'registration') {
        await GuestService.updateGuestStatus(entry.id, action === 'approve' ? 'going' : 'declined');
      } else if (action === 'approve') {
        await RegistrationService.approveRegistration(entry.id);
      } else {
        await RegistrationService.rejectRegistration(entry.id);
      }

      await fetchDashboard();
      Alert.alert('Success', action === 'approve' ? 'Registration approved.' : 'Registration rejected.');
    } catch (err: any) {
      Alert.alert('Update Failed', err?.response?.data?.message || 'Unable to update registration status.');
    } finally {
      setIsUpdatingApprovalId(null);
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error || !dashboard) return <ScreenContainer><ErrorState message={error || 'Dashboard not available'} onRetry={fetchDashboard} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={() => goBackOrFallback(navigation as any, { name: 'ManageEvents' })}
            variant="surface"
            size={36}
          />
          <Text style={styles.title}>Event Dashboard</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatTile label="Registrations" value={dashboard.totalRegistrations} icon={<Users size={18} color={theme.colors.primary} />} />
            <StatTile label="Checked In" value={dashboard.checkedInCount} icon={<UserCheck size={18} color={theme.colors.success} />} />
          </View>
          <View style={styles.statsRow}>
            <StatTile label="Tickets Sold" value={dashboard.ticketsSold} icon={<QrCode size={18} color={theme.colors.secondary} />} />
            <StatTile label="Revenue" value={`$${dashboard.revenue.toFixed(2)}`} icon={<DollarSign size={18} color={theme.colors.warning} />} />
          </View>
          <View style={styles.statsRow}>
            <StatTile label="Reminders" value={dashboard.remindersCount} icon={<CalendarClock size={18} color={theme.colors.primaryLight} />} />
            <StatTile label="Feedback" value={`${dashboard.feedback.averageRating.toFixed(1)} (${dashboard.feedback.totalReviews})`} icon={<Star size={18} color={theme.colors.accent} />} />
          </View>
        </View>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Capacity</Text>
            <Text style={styles.capacityText}>{dashboard.capacity.used} / {dashboard.capacity.total} used</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, dashboard.capacity.percentage))}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{formatPercent(dashboard.capacity.percentage)} used</Text>
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Guest Status</Text>
            {statusBars.map((bar) => (
              <View key={bar.key} style={styles.statusBarWrap}>
                <View style={styles.statusBarTop}>
                  <Text style={styles.statusLabel}>{bar.label}</Text>
                  <Text style={styles.statusValue}>{formatPercent(bar.value)}</Text>
                </View>
                <View style={styles.statusTrack}>
                  <View style={[styles.statusFill, { width: `${Math.max(0, Math.min(100, bar.value))}%`, backgroundColor: bar.color }]} />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <View style={styles.pendingHeaderRow}>
              <Text style={styles.cardTitle}>Pending Approvals</Text>
              <View style={styles.pendingCountBadge}>
                <Text style={styles.pendingCountText}>{dashboard.pendingCount}</Text>
              </View>
            </View>

            {pendingApprovals.length === 0 ? (
              <Text style={styles.emptyText}>No pending approvals right now.</Text>
            ) : (
              pendingApprovals.slice(0, 4).map((entry) => (
                <View key={entry.id} style={styles.pendingRow}>
                  <View style={styles.pendingMeta}>
                    <Text style={styles.pendingName}>{safeString(entry.name, 'Guest')}</Text>
                    <Text style={styles.pendingEmail}>{safeString(entry.email, 'No email')}</Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <Button
                      title="Approve"
                      onPress={() => handlePendingApprovalAction(entry, 'approve')}
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      isLoading={isUpdatingApprovalId === entry.id}
                      style={styles.pendingActionButton}
                    />
                    <Button
                      title="Decline"
                      onPress={() => handlePendingApprovalAction(entry, 'reject')}
                      variant="danger"
                      size="sm"
                      fullWidth={false}
                      isLoading={isUpdatingApprovalId === entry.id}
                      style={styles.pendingActionButton}
                    />
                  </View>
                </View>
              ))
            )}

            <Button
              title="View All"
              onPress={() => navigation.navigate('ManageRegistrations', { eventId })}
              variant="ghost"
              size="sm"
            />
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('ManageRegistrations', { eventId })}>
                <Users size={16} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Guest List</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('CheckInScanner', { eventId })}>
                <QrCode size={16} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>QR Scanner</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={handleExportCsv}>
                <Download size={16} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('EventReminders', { eventId })}>
                <CalendarClock size={16} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Reminders</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => navigation.navigate('CheckInHistory', { eventId })}>
                <Clock3 size={16} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Check-in Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Event Hosts</Text>
            {coHosts.length > 0 && (
              <View style={{ marginBottom: theme.spacing.m }}>
                {coHosts.map((host: any) => (
                  <View key={host.id} style={styles.listRow}>
                    <View style={styles.listRowLeft}>
                      <Text style={styles.listRowTitle}>{safeString(host.name, 'Co-host')}</Text>
                      <Text style={styles.listRowMeta}>{host.email}</Text>
                    </View>
                    <IconButton
                      icon={<XCircle size={18} color={theme.colors.error} />}
                      onPress={() => handleRemoveHost(host.id)}
                      size={36}
                      variant="ghost"
                    />
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.cardTitle}>Add Co-host</Text>
            <Input
              value={hostEmail}
              onChangeText={setHostEmail}
              placeholder="user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Users size={16} color={theme.colors.textMuted} />}
              containerStyle={styles.inputNoMargin}
            />
            <Button
              title="Add Host"
              onPress={handleAddHost}
              isLoading={isAddingHost}
              variant="secondary"
              size="md"
              style={{ marginTop: theme.spacing.m }}
            />
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Invite Guest</Text>
            <Input
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="guest@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<MailPlus size={16} color={theme.colors.textMuted} />}
              containerStyle={styles.inputNoMargin}
            />
            <Input
              value={inviteMessage}
              onChangeText={setInviteMessage}
              placeholder="Optional message"
              multiline
              numberOfLines={3}
            />
            <Button
              title="Send Invite"
              onPress={handleInviteGuest}
              isLoading={isInviting}
              variant="secondary"
              size="md"
            />
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Send Blast</Text>
            <Input
              value={blastMessage}
              onChangeText={setBlastMessage}
              placeholder="Write an announcement for all registered guests"
              multiline
              numberOfLines={4}
            />
            <Button
              title="Send Blast"
              onPress={handleSendBlast}
              isLoading={isBlasting}
              variant="primary"
              size="md"
              icon={<Megaphone size={15} color={theme.colors.textOnPrimary} />}
            />
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Recent Registrations</Text>
            {dashboard.recentRegistrations.length === 0 ? (
              <Text style={styles.emptyText}>No recent registrations.</Text>
            ) : dashboard.recentRegistrations.map((entry) => (
              <View key={entry.id} style={styles.listRow}>
                <View style={styles.listRowLeft}>
                  <Text style={styles.listRowTitle}>{entry.name}</Text>
                  <Text style={styles.listRowMeta}>{entry.email}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{safeString(entry.status, 'unknown').replace('_', ' ')}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="raised" style={styles.card} noPadding>
          <View style={styles.cardInner}>
            <Text style={styles.cardTitle}>Recent Check-ins</Text>
            {dashboard.recentCheckIns.length === 0 ? (
              <Text style={styles.emptyText}>No check-ins recorded yet.</Text>
            ) : dashboard.recentCheckIns.map((entry) => (
              <View key={entry.id} style={styles.listRow}>
                <View style={styles.listRowLeft}>
                  <Text style={styles.listRowTitle}>{entry.guest?.name || 'Unknown guest'}</Text>
                  <Text style={styles.listRowMeta}>{entry.guest?.email || entry.reason}</Text>
                </View>
                <View style={[styles.resultPill, entry.result === 'success' ? styles.resultSuccess : entry.result === 'duplicate' ? styles.resultWarn : styles.resultError]}>
                  <Text style={styles.resultText}>{entry.result}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  statsGrid: {
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  statTile: {
    flex: 1,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  statTileInner: {
    padding: theme.spacing.m,
    gap: 6,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceOverlay,
  },
  statValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  card: {
    marginBottom: theme.spacing.m,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  cardInner: {
    padding: theme.spacing.m,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  capacityText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    marginTop: theme.spacing.s,
    height: 10,
    borderRadius: 6,
    backgroundColor: theme.colors.surfaceOverlay,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressLabel: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    marginTop: theme.spacing.xs,
  },
  statusBarWrap: {
    marginBottom: theme.spacing.s,
  },
  statusBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  statusValue: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  statusTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceOverlay,
    overflow: 'hidden',
  },
  statusFill: {
    height: '100%',
  },
  pendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  pendingCountBadge: {
    minWidth: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.warningSubtle,
    alignItems: 'center',
  },
  pendingCountText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
    gap: theme.spacing.s,
  },
  pendingMeta: {
    flex: 1,
    minWidth: 140,
  },
  pendingName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  pendingEmail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing.xs,
    flex: 1,
    minWidth: 160,
  },
  pendingActionButton: {
    flexGrow: 1,
    flexBasis: 72,
    minWidth: 72,
    maxWidth: 120,
    borderRadius: theme.borderRadius.s,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  quickAction: {
    minWidth: '47%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  quickActionText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listRowLeft: {
    flex: 1,
    paddingRight: theme.spacing.s,
  },
  listRowTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  listRowMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surfaceOverlay,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  resultPill: {
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resultSuccess: {
    backgroundColor: theme.colors.successSubtle,
  },
  resultWarn: {
    backgroundColor: theme.colors.warningSubtle,
  },
  resultError: {
    backgroundColor: theme.colors.errorSubtle,
  },
  resultText: {
    ...theme.typography.small,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  bottomSpacer: {
    height: theme.spacing.l,
  },
});
