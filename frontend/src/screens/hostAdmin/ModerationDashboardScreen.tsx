import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, Card, StatCard } from '../../components';
import { theme } from '../../constants/theme';
import { AdminService, ModerationService, ReportService } from '../../api/services';
import { PlatformAnalytics, ReportRecord } from '../../types';
import { Flag, ShieldBan, ShieldCheck } from 'lucide-react-native';

export const ModerationDashboardScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics>({
    totalUsers: 0,
    totalEvents: 0,
    flaggedEvents: 0,
    suspendedUsers: 0,
    totalReports: 0,
  });

  const fetchData = async () => {
    try {
      setError(null);
      const [reportsResponse, analyticsResponse] = await Promise.all([
        ReportService.getReports(),
        AdminService.getPlatformAnalytics(),
      ]);

      setReports(reportsResponse.data.reports || []);
      setAnalytics(analyticsResponse.data || {
        totalUsers: 0,
        totalEvents: 0,
        flaggedEvents: 0,
        suspendedUsers: 0,
        totalReports: 0,
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load moderation data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  const runActionWithConfirmation = (
    title: string,
    message: string,
    action: () => Promise<void>,
  ) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await action();
            fetchData();
          } catch (actionError: any) {
            Alert.alert('Action Failed', actionError.response?.data?.message || 'Unable to complete moderation action');
          }
        },
      },
    ]);
  };

  const handleResolve = (report: ReportRecord) => {
    runActionWithConfirmation(
      'Resolve Report',
      'Mark this report as resolved?',
      async () => {
        await ReportService.resolveReport(report.id);
      },
    );
  };

  const handleApproveEvent = (report: ReportRecord) => {
    runActionWithConfirmation(
      'Approve Event',
      'Approve this event for attendee visibility/booking?',
      async () => {
        await ModerationService.approveEvent(report.targetId);
      },
    );
  };

  const handleRejectEvent = (report: ReportRecord) => {
    runActionWithConfirmation(
      'Reject Event',
      'Reject this event? It will be hidden from attendees.',
      async () => {
        await ModerationService.rejectEvent(report.targetId);
      },
    );
  };

  const handleUserToggle = (report: ReportRecord) => {
    const isSuspended = Boolean(report.target?.isSuspended);
    runActionWithConfirmation(
      isSuspended ? 'Activate User' : 'Suspend User',
      isSuspended ? 'Restore this user account?' : 'Suspend this user account from login and booking?',
      async () => {
        if (isSuspended) {
          await ModerationService.activateUser(report.targetId);
        } else {
          await ModerationService.suspendUser(report.targetId);
        }
      },
    );
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Moderation Dashboard</Text>
              <Text style={styles.subtitle}>Review reports and enforce platform rules</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatCard
                  title="Total Users"
                  value={analytics.totalUsers}
                  icon={<ShieldCheck size={20} color={theme.colors.primary} />}
                  style={styles.statCard}
                />
                <StatCard
                  title="Total Events"
                  value={analytics.totalEvents}
                  icon={<Flag size={20} color={theme.colors.secondary} />}
                  style={styles.statCard}
                  accentColor={theme.colors.secondary}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  title="Flagged Events"
                  value={analytics.flaggedEvents}
                  icon={<Flag size={20} color={theme.colors.warning} />}
                  style={styles.statCard}
                  accentColor={theme.colors.warning}
                />
                <StatCard
                  title="Suspended Users"
                  value={analytics.suspendedUsers}
                  icon={<ShieldBan size={20} color={theme.colors.error} />}
                  style={styles.statCard}
                  accentColor={theme.colors.error}
                />
              </View>
              <Card variant="primary" style={styles.totalReportsCard} noPadding>
                <View style={styles.totalReportsInner}>
                  <Text style={styles.totalReportsLabel}>Total Reports</Text>
                  <Text style={styles.totalReportsValue}>{analytics.totalReports}</Text>
                </View>
              </Card>
            </View>

            <Text style={styles.sectionTitle}>Reports</Text>
          </>
        }
        renderItem={({ item }) => {
          const targetLabel = item.targetType === 'event'
            ? (item.target?.title || `Event ${item.targetId}`)
            : (item.target?.name || `User ${item.targetId}`);

          return (
            <Card variant="raised" style={styles.reportCard} noPadding>
              <View style={styles.reportCardInner}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportType}>{item.targetType.toUpperCase()} REPORT</Text>
                  <View style={[
                    styles.statusBadge,
                    item.isResolved ? styles.statusResolved : styles.statusPending,
                  ]}>
                    <Text style={styles.statusText}>{item.isResolved ? 'RESOLVED' : 'OPEN'}</Text>
                  </View>
                </View>

                <Text style={styles.targetText}>{targetLabel}</Text>
                <Text style={styles.reasonText}>Reason: {item.reason}</Text>
                <Text style={styles.metaText}>Reporter: {item.reporter?.name || item.reporterId}</Text>
                <Text style={styles.metaText}>Created: {new Date(item.createdAt).toLocaleString()}</Text>

                <View style={styles.actionsRow}>
                  {item.targetType === 'event' ? (
                    <>
                      <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => handleApproveEvent(item)}>
                        <Text style={[styles.actionText, { color: theme.colors.success }]}>Approve Event</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleRejectEvent(item)}>
                        <Text style={[styles.actionText, { color: theme.colors.error }]}>Reject Event</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={[styles.actionButton, styles.suspendButton]} onPress={() => handleUserToggle(item)}>
                      <Text style={[styles.actionText, { color: theme.colors.warning }]}>
                        {item.target?.isSuspended ? 'Activate User' : 'Suspend User'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!item.isResolved && (
                    <TouchableOpacity style={[styles.actionButton, styles.resolveButton]} onPress={() => handleResolve(item)}>
                      <Text style={[styles.actionText, { color: theme.colors.primaryLight }]}>Resolve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState title="No Reports" message="No moderation reports have been submitted yet." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.m,
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
  statsGrid: {
    marginBottom: theme.spacing.l,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s,
  },
  statCard: {
    flex: 0.48,
  },
  totalReportsCard: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  totalReportsInner: {
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  totalReportsLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  totalReportsValue: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: 2,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  reportCard: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    marginBottom: theme.spacing.m,
  },
  reportCardInner: { padding: theme.spacing.m },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  reportType: {
    ...theme.typography.small,
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusPending: {
    borderColor: theme.colors.warning,
    backgroundColor: `${theme.colors.warning}22`,
  },
  statusResolved: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}22`,
  },
  statusText: {
    ...theme.typography.small,
    color: theme.colors.text,
    fontWeight: '700',
  },
  targetText: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  reasonText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  actionsRow: {
    marginTop: theme.spacing.s,
    gap: theme.spacing.s,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
  },
  approveButton: {
    borderColor: theme.colors.success,
    backgroundColor: `${theme.colors.success}1A`,
  },
  rejectButton: {
    borderColor: theme.colors.error,
    backgroundColor: `${theme.colors.error}1A`,
  },
  suspendButton: {
    borderColor: theme.colors.warning,
    backgroundColor: `${theme.colors.warning}1A`,
  },
  resolveButton: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}1A`,
  },
  actionText: {
    ...theme.typography.button,
  },
});
