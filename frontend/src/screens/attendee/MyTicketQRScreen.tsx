import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, CheckCircle2, Ticket as TicketIcon } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Booking } from '../../types';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, Card, IconButton, StatusBadge } from '../../components';
import { BookingService, CheckInService, EventService, TicketService } from '../../api/services';
import { LinearGradient } from 'expo-linear-gradient';

type MyTicketQRRouteProp = RouteProp<AttendeeHomeStackParamList, 'MyTicketQR'>;
type MyTicketQRNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'MyTicketQR'>;

interface Props { route: MyTicketQRRouteProp; navigation: MyTicketQRNavigationProp; }

export const MyTicketQRScreen: React.FC<Props> = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [eventTitle, setEventTitle] = useState('Event');
  const [ticketName, setTicketName] = useState('Ticket');
  const [qrCodeValue, setQrCodeValue] = useState('');

  const fetchTicketQr = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [bookingRes, qrRes] = await Promise.all([
        BookingService.getBooking(bookingId),
        CheckInService.getBookingQr(bookingId),
      ]);
      const bookingData = bookingRes.data.booking as Booking;
      setBooking(bookingData);
      setQrCodeValue(qrRes.data.qrCodeValue || qrRes.data.qrData);
      const [eventRes, ticketRes] = await Promise.all([
        EventService.getEvent(bookingData.eventId),
        TicketService.getTicket(bookingData.ticketTypeId),
      ]);
      setEventTitle(eventRes.data.event.title);
      setTicketName(ticketRes.data.ticket.name);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load ticket QR');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTicketQr(); }, [bookingId]);

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchTicketQr} /></ScreenContainer>;
  if (!booking || !qrCodeValue) return <ScreenContainer><ErrorState message="No QR data available" onRetry={fetchTicketQr} /></ScreenContainer>;

  const checkedIn = booking.checkInStatus === 'checked_in';

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#3D2E1E', '#2A1F14', '#121212']}
        locations={[0, 0.3, 0.7]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScreenContainer scrollable style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={() => navigation.goBack()}
            variant="glass"
            size={38}
          />
          <Text style={styles.headerTitle}>My Ticket</Text>
        </View>

        {/* Ticket Card */}
        <View style={styles.ticketCard}>
          {/* Top stripe */}
          <View style={styles.ticketHeader}>
            <TicketIcon size={18} color={theme.colors.primary} />
            <Text style={styles.ticketType}>{ticketName}</Text>
            <StatusBadge
              status={checkedIn ? 'success' : 'warning'}
              label={checkedIn ? 'Checked In' : 'Not Checked In'}
            />
          </View>

          {/* Divider */}
          <View style={styles.dashedLine} />

          {/* Event name */}
          <View style={styles.ticketBody}>
            <Text style={styles.eventTitle}>{eventTitle}</Text>
            <Text style={styles.bookingId}>Booking #{booking.id.slice(-8).toUpperCase()}</Text>
            <Text style={styles.bookingStatus}>Status: {booking.bookingStatus.toUpperCase()}</Text>
          </View>

          {/* Divider */}
          <View style={styles.dashedLine} />

          {/* QR Code */}
          <View style={styles.qrSection}>
            <View style={styles.qrWrap}>
              <QRCode
                value={qrCodeValue}
                size={220}
                color={theme.colors.background}
                backgroundColor={theme.colors.text}
              />
            </View>
            <Text style={styles.qrHint}>Present this QR code at the entrance</Text>
          </View>

          {/* Check-in time */}
          {checkedIn && booking.checkedInAt && (
            <View style={styles.checkedInBanner}>
              <CheckCircle2 size={14} color={theme.colors.success} />
              <Text style={styles.checkedInText}>
                Verified {new Date(booking.checkedInAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      </ScreenContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  container: { backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text },
  ticketCard: {
    marginHorizontal: theme.spacing.base,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginBottom: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primarySubtle,
  },
  ticketType: { ...theme.typography.label, color: theme.colors.primary, flex: 1 },
  dashedLine: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: theme.spacing.m,
  },
  ticketBody: { padding: theme.spacing.xl, alignItems: 'center', gap: 6 },
  eventTitle: { ...theme.typography.h2, color: theme.colors.text, textAlign: 'center' },
  bookingId: { ...theme.typography.caption, color: theme.colors.textMuted, fontFamily: 'monospace' },
  bookingStatus: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600' },
  qrSection: { alignItems: 'center', paddingVertical: theme.spacing.xl, gap: theme.spacing.m },
  qrWrap: {
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.text,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  qrHint: { ...theme.typography.caption, color: theme.colors.textMuted, textAlign: 'center' },
  checkedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.successSubtle,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  checkedInText: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '600' },
});
