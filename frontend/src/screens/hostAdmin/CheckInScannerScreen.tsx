import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Camera, RefreshCw, QrCode, UserCheck, ArrowLeft } from 'lucide-react-native';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, Card, Button, Input, IconButton } from '../../components';
import { CheckInService, EventService, UserService } from '../../api/services';
import { Event } from '../../types';
import { HostAdminEventStackParamList } from '../../types/navigation';
import { safeArray } from '../../utils/safeData';
import { formatSafeDate, safeString, safeUpper } from '../../utils/safeText';
import { goBackOrFallback } from '../../utils/navigationBack';

interface AttendanceRecord {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  mobile?: string;
  nic?: string;
  guestStatus?: string;
  checkInStatus: 'not_checked_in' | 'checked_in';
  checkedInAt?: string | null;
  checkInMethod?: 'qr' | 'manual' | null;
  attendanceNote?: string | null;
  qrCodeValue?: string | null;
}

interface RecentScanRecord {
  id: string;
  status: 'success' | 'duplicate' | 'invalid' | 'declined' | 'cancelled';
  message: string;
}

const normalizeAttendance = (rawItems: unknown): AttendanceRecord[] => {
  return safeArray<any>(rawItems).map((item) => ({
    id: String(item.registrationId || item.bookingId || item.id),
    attendeeName: item.attendeeName || item.name || 'Unknown attendee',
    attendeeEmail: item.attendeeEmail || item.email || 'Unknown email',
    mobile: item.mobile || '',
    nic: item.nic || '',
    guestStatus: item.guestStatus || item.status || '',
    checkInStatus: item.checkInStatus === 'checked_in' ? 'checked_in' : 'not_checked_in',
    checkedInAt: item.checkedInAt || null,
    checkInMethod: item.checkInMethod || null,
    attendanceNote: item.attendanceNote || null,
    qrCodeValue: item.qrCodeValue || null,
  }));
};

export const CheckInScannerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HostAdminEventStackParamList, 'CheckInScanner'>>();
  const preselectedEventId = String(route.params?.eventId || '');
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [manualNote, setManualNote] = useState('');
  const [manualRegistrationId, setManualRegistrationId] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<{ value: string; scannedAt: number } | null>(null);

  const fetchAttendance = useCallback(async (eventId: string) => {
    if (!eventId) return;
    const attendanceRes = await CheckInService.getEventAttendance(eventId);
    const normalized = normalizeAttendance(attendanceRes?.data?.attendance || []);
    setAttendance(normalized);
  }, []);

  const fetchScreenData = useCallback(async () => {
    try {
      setError(null);
      const userRes = await UserService.getMe();
      const userId = safeString(userRes?.data?.user?.id, '');
      const managedEventsRes = userId
        ? await EventService.getHostEvents(userId)
        : { data: { events: [] } };
      const managedEvents = safeArray<Event>(managedEventsRes?.data?.events);
      setEvents(managedEvents);

      const hasSelectedEvent = managedEvents.some((event: Event) => event.id === selectedEventId);
      const hasPreselectedEvent = managedEvents.some((event: Event) => event.id === preselectedEventId);
      const resolvedEventId = hasSelectedEvent
        ? selectedEventId
        : hasPreselectedEvent
          ? preselectedEventId
          : (managedEvents[0]?.id || '');
      setSelectedEventId(resolvedEventId);

      if (resolvedEventId) {
        await fetchAttendance(resolvedEventId);
      } else {
        setAttendance([]);
      }
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load check-in data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchAttendance, selectedEventId, preselectedEventId]);

  useFocusEffect(
    useCallback(() => {
      fetchScreenData();
    }, [fetchScreenData]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchScreenData();
  }, [fetchScreenData]);

  const handleBack = () => {
    goBackOrFallback(navigation as any, { name: 'ManageEvents' });
  };

  const openScanner = async () => {
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event first.');
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      setHasCameraPermission(result.granted);
      if (!result.granted) {
        setIsScannerOpen(true);
        return;
      }
    }

    setHasCameraPermission(true);
    setIsScannerOpen(true);
  };

  const pushRecentScan = (status: RecentScanRecord['status'], message: string) => {
    setRecentScans((previous) => [
      { id: `${Date.now()}_${Math.random()}`, status, message },
      ...previous,
    ].slice(0, 8));
  };

  const handleScan = async (result: BarcodeScanningResult) => {
    if (isProcessingScan) return;
    const qrCodeValue = String(result.data || '').trim();
    if (!qrCodeValue) return;

    const now = Date.now();
    const lastScan = lastScanRef.current;
    if (lastScan && lastScan.value === qrCodeValue && (now - lastScan.scannedAt) < 3500) {
      return;
    }

    lastScanRef.current = { value: qrCodeValue, scannedAt: now };

    try {
      setIsProcessingScan(true);
      const response = await CheckInService.scanQr(qrCodeValue, selectedEventId || undefined);
      pushRecentScan('success', response.message || 'Check-in successful');
      Alert.alert('Success', response.message || 'Check-in successful');
      await fetchAttendance(selectedEventId);
    } catch (scanError: any) {
      const statusCode = scanError?.response?.status;
      const message = scanError?.response?.data?.message || 'Invalid QR code';
      const responseStatus = String(scanError?.response?.data?.status || '').toLowerCase();

      if (statusCode === 409 || responseStatus === 'duplicate') {
        pushRecentScan('duplicate', message);
        Alert.alert('Duplicate', message);
      } else if (responseStatus === 'declined' || /declined|not-going/i.test(message)) {
        pushRecentScan('declined', message);
        Alert.alert('Declined', message);
      } else if (responseStatus === 'cancelled' || /cancelled/i.test(message)) {
        pushRecentScan('cancelled', message);
        Alert.alert('Cancelled', message);
      } else {
        pushRecentScan('invalid', message);
        Alert.alert('Invalid QR', message);
      }
    } finally {
      setTimeout(() => {
        setIsProcessingScan(false);
      }, 900);
    }
  };

  const handleManualCheckIn = async (registrationId: string, attendanceNote?: string) => {
    try {
      await CheckInService.manualCheckIn(registrationId, attendanceNote || undefined);
      Alert.alert('Success', 'Manual check-in successful');
      setManualRegistrationId('');
      setManualNote('');
      await fetchAttendance(selectedEventId);
    } catch (manualError: any) {
      Alert.alert('Error', manualError?.response?.data?.message || 'Failed to complete manual check-in');
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
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchScreenData} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={handleBack}
            variant="surface"
            size={36}
          />
          <Text style={styles.title}>QR Check-in</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.eventSwitchRow}>
        <FlatList
          data={events}
          horizontal
          keyExtractor={(item, index) => safeString(item.id, `event-${index}`)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedEventId;
            return (
              <TouchableOpacity
                style={[styles.eventChip, isSelected && styles.eventChipSelected]}
                onPress={async () => {
                  setSelectedEventId(item.id);
                  lastScanRef.current = null;
                  await fetchAttendance(item.id);
                }}
              >
                <Text style={[styles.eventChipText, isSelected && styles.eventChipTextSelected]} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<View style={styles.noEventsWrap}><Text style={styles.noEventsText}>No managed events found.</Text></View>}
        />
      </View>

      <Card variant="primary" style={styles.summaryCard} noPadding>
        <View style={styles.summaryInner}>
          <Text style={styles.summaryLabel}>Attendance Summary</Text>
          <Text style={styles.summaryValue}>{summary.checkedIn}/{summary.total} checked in</Text>
          <Text style={styles.summaryMeta}>{summary.notCheckedIn} pending check-in</Text>
        </View>
      </Card>

      <View style={styles.scannerActions}>
        <Button
          title={isScannerOpen ? 'Close Scanner' : 'Open QR Scanner'}
          onPress={() => (isScannerOpen ? setIsScannerOpen(false) : openScanner())}
          variant="primary"
          size="lg"
          icon={<Camera size={18} color={theme.colors.textOnPrimary} />}
        />
      </View>

      {isScannerOpen && (
        <Card variant="raised" style={styles.cameraWrap} noPadding>
          {!permission?.granted || hasCameraPermission === false ? (
            <View style={styles.permissionFallback}>
              <Text style={styles.permissionText}>Camera access is required to scan QR codes.</Text>
              <Button title="Grant Camera Access" onPress={openScanner} variant="primary" size="md" />
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={isProcessingScan ? undefined : handleScan}
              />
              <View style={styles.scanHint}>
                <QrCode size={14} color={theme.colors.primaryLight} />
                <Text style={styles.scanHintText}>Align guest QR code inside camera view</Text>
              </View>
            </>
          )}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Guest Check-in Queue</Text>
      <FlatList
        data={attendance}
        keyExtractor={(item, index) => safeString(item.id, `attendance-${index}`)}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState title="No Guests Yet" message="Guest records appear here after registrations." />}
        renderItem={({ item }) => {
          const checkedIn = item.checkInStatus === 'checked_in';
          const statusColor = checkedIn ? theme.colors.success : theme.colors.warning;
          return (
            <Card variant={checkedIn ? 'primary' : 'raised'} style={styles.recordCard} noPadding>
              <View style={styles.recordInner}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordName}>{item.attendeeName}</Text>
                  <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: `${statusColor}20` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {checkedIn ? 'Checked In' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recordMeta}>{item.attendeeEmail}</Text>
                {item.mobile ? <Text style={styles.recordMeta}>Mobile: {item.mobile}</Text> : null}
                {item.nic ? <Text style={styles.recordMeta}>NIC: {item.nic}</Text> : null}
                {item.guestStatus ? <Text style={styles.recordMeta}>Status: {safeUpper(item.guestStatus, 'UNKNOWN')}</Text> : null}
                {item.checkedInAt ? (
                  <Text style={styles.recordMeta}>
                    At: {formatSafeDate(item.checkedInAt, 'Time unavailable', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ({item.checkInMethod || 'manual'})
                  </Text>
                ) : null}

                {!checkedIn && (
                  <View style={styles.manualRow}>
                    <Input
                      value={manualRegistrationId === item.id ? manualNote : ''}
                      onChangeText={(text: string) => {
                        setManualRegistrationId(item.id);
                        setManualNote(text);
                      }}
                      placeholder="Optional attendance note"
                      containerStyle={styles.noteInput}
                    />
                    <Button
                      title="Manual Check-in"
                      onPress={() => handleManualCheckIn(item.id, manualRegistrationId === item.id ? manualNote : '')}
                      variant="secondary"
                      size="sm"
                      icon={<UserCheck size={16} color={theme.colors.success} />}
                    />
                  </View>
                )}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          recentScans.length ? (
            <View style={styles.recentWrap}>
              <Text style={styles.sectionTitle}>Recent Scans</Text>
              {recentScans.map((scan) => {
                const color = scan.status === 'success'
                  ? theme.colors.success
                  : scan.status === 'duplicate'
                    ? theme.colors.warning
                    : scan.status === 'declined' || scan.status === 'cancelled'
                      ? theme.colors.secondary
                      : theme.colors.error;
                return (
                  <Card key={scan.id} variant="raised" style={styles.recentCard} noPadding>
                    <View style={styles.recentRow}>
                      <Text style={[styles.recentStatus, { color }]}>{safeUpper(scan.status, 'UNKNOWN')}</Text>
                      <Text style={styles.recentMessage}>{scan.message}</Text>
                    </View>
                  </Card>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
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
    marginBottom: theme.spacing.m,
  },
  eventChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    marginRight: theme.spacing.s,
    maxWidth: 220,
    justifyContent: 'center',
  },
  eventChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.glass,
  },
  eventChipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  eventChipTextSelected: {
    color: theme.colors.primaryLight,
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
    overflow: 'hidden',
    borderRadius: theme.borderRadius.l,
  },
  summaryInner: { padding: theme.spacing.m },
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
  permissionFallback: {
    padding: theme.spacing.m,
    gap: theme.spacing.s,
  },
  permissionText: {
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
    paddingBottom: 100,
    flexGrow: 1,
  },
  recordCard: {
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
    borderRadius: theme.borderRadius.l,
  },
  recordInner: { padding: theme.spacing.m },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.xs,
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
    paddingVertical: 4,
  },
  statusText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  recordMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  manualRow: {
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  noteInput: { marginBottom: 0 },
  recentWrap: {
    marginBottom: theme.spacing.xl,
  },
  recentCard: {
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.s,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  recentStatus: {
    ...theme.typography.small,
    fontWeight: '700',
    minWidth: 80,
  },
  recentMessage: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    flex: 1,
  },
});
