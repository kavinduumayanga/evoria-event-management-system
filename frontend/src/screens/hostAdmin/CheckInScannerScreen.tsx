import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Camera, RefreshCw, QrCode, UserCheck } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard, Button } from '../../components';
import { CheckInService, EventService, UserService } from '../../api/services';
import { Event } from '../../types';

interface AttendanceRecord {
  bookingId: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketName: string;
  bookingStatus: string;
  approvalStatus: string;
  rsvpStatus: string;
  checkInStatus: 'not_checked_in' | 'checked_in';
  checkedInAt?: string | null;
  checkInMethod?: 'qr' | 'manual' | null;
  attendanceNote?: string | null;
}

interface RecentScanRecord {
  id: string;
  status: 'success' | 'duplicate' | 'invalid';
  message: string;
  at: string;
}

export const CheckInScannerScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [manualBookingId, setManualBookingId] = useState('');

  const [permission, requestPermission] = useCameraPermissions();

  const fetchScreenData = async () => {
    try {
      setError(null);
      const [userRes, eventsRes] = await Promise.all([UserService.getMe(), EventService.getEvents()]);
      const hostEvents = eventsRes.data.events.filter((item: Event) => item.hostAdminId === userRes.data.user.id);
      setEvents(hostEvents);

      const resolvedEventId = selectedEventId || hostEvents[0]?.id || '';
      setSelectedEventId(resolvedEventId);

      if (resolvedEventId) {
        const attendanceRes = await CheckInService.getEventAttendance(resolvedEventId);
        setAttendance(attendanceRes.data.attendance || []);
      } else {
        setAttendance([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load check-in data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchAttendance = async (eventId: string) => {
    if (!eventId) return;
    const attendanceRes = await CheckInService.getEventAttendance(eventId);
    setAttendance(attendanceRes.data.attendance || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchScreenData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchScreenData();
  }, []);

  const openScanner = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event first.');
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to scan QR codes.');
        return;
      }
    }

    setIsScannerOpen(true);
  };

  const pushRecentScan = (status: RecentScanRecord['status'], message: string) => {
    const record: RecentScanRecord = {
      id: `${Date.now()}_${Math.random()}`,
      status,
      message,
      at: new Date().toISOString(),
    };
    setRecentScans((prev) => [record, ...prev].slice(0, 8));
  };

  const handleScan = async (result: BarcodeScanningResult) => {
    if (isProcessingScan) return;

    try {
      setIsProcessingScan(true);
      const res = await CheckInService.scanQr(result.data);
      pushRecentScan('success', res.message || 'Check-in successful');
      Alert.alert('Success', res.message || 'Check-in successful');
      await fetchAttendance(selectedEventId);
    } catch (err: any) {
      const statusCode = err?.response?.status;
      const message = err?.response?.data?.message || 'Invalid QR code';

      if (statusCode === 409 || err?.response?.data?.status === 'duplicate') {
        pushRecentScan('duplicate', message);
        Alert.alert('Duplicate', message);
      } else {
        pushRecentScan('invalid', message);
        Alert.alert('Invalid QR', message);
      }
    } finally {
      setTimeout(() => {
        setIsProcessingScan(false);
      }, 1000);
    }
  };

  const handleManualCheckIn = async (bookingId: string, presetNote?: string) => {
    try {
      await CheckInService.manualCheckIn(bookingId, presetNote || undefined);
      Alert.alert('Success', 'Manual check-in successful');
      setManualBookingId('');
      setManualNote('');
      await fetchAttendance(selectedEventId);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to complete manual check-in');
    }
  };

  const summary = useMemo(() => {
    const checkedInCount = attendance.filter((item) => item.checkInStatus === 'checked_in').length;
    return {
      total: attendance.length,
      checkedIn: checkedInCount,
      notCheckedIn: attendance.length - checkedInCount,
    };
  }, [attendance]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchScreenData} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>QR Check-in</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.eventSwitchRow}>
        <FlatList
          data={events}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedEventId;
            return (
              <TouchableOpacity
                style={[styles.eventChip, isSelected && styles.eventChipSelected]}
                onPress={async () => {
                  setSelectedEventId(item.id);
                  try {
                    await fetchAttendance(item.id);
                  } catch (err: any) {
                    Alert.alert('Error', err?.response?.data?.message || 'Failed to fetch attendance');
                  }
                }}
              >
                <Text style={[styles.eventChipText, isSelected && styles.eventChipTextSelected]} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.noEventsWrap}>
              <Text style={styles.noEventsText}>No host events found.</Text>
            </View>
          }
        />
      </View>

      <GlassCard style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Attendance Summary</Text>
        <Text style={styles.summaryValue}>
          {summary.checkedIn}/{summary.total} checked in
        </Text>
        <Text style={styles.summaryMeta}>{summary.notCheckedIn} pending</Text>
      </GlassCard>

      <View style={styles.scannerActions}>
        <Button
          title={isScannerOpen ? 'Close Scanner' : 'Open QR Scanner'}
          onPress={() => (isScannerOpen ? setIsScannerOpen(false) : openScanner())}
          icon={<Camera size={16} color={theme.colors.text} />}
        />
      </View>

      {isScannerOpen && (
        <GlassCard style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isProcessingScan ? undefined : handleScan}
          />
          <View style={styles.scanHint}>
            <QrCode size={14} color={theme.colors.primaryLight} />
            <Text style={styles.scanHintText}>Align attendee QR code inside camera view</Text>
          </View>
        </GlassCard>
      )}

      <Text style={styles.sectionTitle}>Attendance Records</Text>
      <FlatList
        data={attendance}
        keyExtractor={(item) => item.bookingId}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <EmptyState title="No Attendance Yet" message="Attendees will appear here after registrations." />
        }
        renderItem={({ item }) => {
          const checkedIn = item.checkInStatus === 'checked_in';
          const statusColor = checkedIn ? theme.colors.success : theme.colors.warning;
          return (
            <GlassCard style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordName}>{item.attendeeName}</Text>
                <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {checkedIn ? 'Checked In' : 'Not Checked In'}
                  </Text>
                </View>
              </View>
              <Text style={styles.recordMeta}>{item.attendeeEmail}</Text>
              <Text style={styles.recordMeta}>Ticket: {item.ticketName}</Text>
              <Text style={styles.recordMeta}>Booking: {item.bookingStatus}</Text>
              {item.checkedInAt && (
                <Text style={styles.recordMeta}>
                  At: {new Date(item.checkedInAt).toLocaleString()} ({item.checkInMethod || 'manual'})
                </Text>
              )}

              {!checkedIn && (
                <View style={styles.manualRow}>
                  <TextInput
                    value={manualBookingId === item.bookingId ? manualNote : ''}
                    onChangeText={(text) => {
                      setManualBookingId(item.bookingId);
                      setManualNote(text);
                    }}
                    placeholder="Optional attendance note"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.manualInput}
                  />
                  <TouchableOpacity
                    style={styles.manualBtn}
                    onPress={() => handleManualCheckIn(item.bookingId, manualBookingId === item.bookingId ? manualNote : '')}
                  >
                    <UserCheck size={14} color={theme.colors.success} />
                    <Text style={styles.manualText}>Manual Check-in</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GlassCard>
          );
        }}
        ListFooterComponent={
          recentScans.length ? (
            <View style={styles.recentWrap}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              {recentScans.map((scan) => {
                const color =
                  scan.status === 'success'
                    ? theme.colors.success
                    : scan.status === 'duplicate'
                    ? theme.colors.warning
                    : theme.colors.error;
                return (
                  <View key={scan.id} style={styles.recentRow}>
                    <Text style={[styles.recentStatus, { color }]}>{scan.status.toUpperCase()}</Text>
                    <Text style={styles.recentMessage}>{scan.message}</Text>
                  </View>
                );
              })}
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  headerRow: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventSwitchRow: {
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  eventChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
    marginRight: theme.spacing.s,
    maxWidth: 220,
  },
  eventChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  eventChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  eventChipTextSelected: {
    color: theme.colors.text,
  },
  noEventsWrap: {
    paddingVertical: theme.spacing.s,
  },
  noEventsText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  summaryCard: {
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  summaryLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  summaryValue: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  summaryMeta: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
  },
  scannerActions: {
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  cameraWrap: {
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
    padding: 0,
  },
  camera: {
    width: '100%',
    height: 220,
  },
  scanHint: {
    padding: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  scanHintText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  listContainer: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  recordCard: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  recordName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 3,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  recordMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  manualRow: {
    marginTop: theme.spacing.s,
    gap: theme.spacing.s,
  },
  manualInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  manualBtn: {
    borderWidth: 1,
    borderColor: theme.colors.success,
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s,
    backgroundColor: `${theme.colors.success}10`,
  },
  manualText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
  recentWrap: {
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xl,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.xs,
  },
  recentStatus: {
    ...theme.typography.small,
    fontWeight: '700',
    width: 76,
  },
  recentMessage: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
});
