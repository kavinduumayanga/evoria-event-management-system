import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Booking } from '../../types';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, GlassCard } from '../../components';
import { BookingService, CheckInService, EventService, TicketService } from '../../api/services';

type MyTicketQRRouteProp = RouteProp<AttendeeHomeStackParamList, 'MyTicketQR'>;
type MyTicketQRNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'MyTicketQR'>;

interface Props {
  route: MyTicketQRRouteProp;
  navigation: MyTicketQRNavigationProp;
}

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
      const message = err?.response?.data?.message || 'Failed to load ticket QR';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketQr();
  }, [bookingId]);

  const checkedIn = booking?.checkInStatus === 'checked_in';
  const checkInColor = checkedIn ? theme.colors.success : theme.colors.warning;

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchTicketQr} />
      </ScreenContainer>
    );
  }

  if (!booking || !qrCodeValue) {
    return (
      <ScreenContainer>
        <ErrorState message="No QR data available for this booking" onRetry={fetchTicketQr} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.title}>My Ticket</Text>
      </View>

      <GlassCard style={styles.card} variant={checkedIn ? 'neonPurple' : 'dark'}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>
        <Text style={styles.ticketName}>{ticketName}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { borderColor: checkInColor, backgroundColor: `${checkInColor}20` }]}>
            <Text style={[styles.badgeText, { color: checkInColor }]}>
              {checkedIn ? 'Checked In' : 'Not Checked In'}
            </Text>
          </View>
        </View>

        <View style={styles.qrWrap}>
          <QRCode value={qrCodeValue} size={220} color={theme.colors.background} backgroundColor={theme.colors.text} />
        </View>

        <Text style={styles.meta}>Booking ID: {booking.id}</Text>
        <Text style={styles.meta}>Status: {booking.bookingStatus.toUpperCase()}</Text>
      </GlassCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.s,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  card: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginHorizontal: theme.spacing.m,
  },
  eventTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    textAlign: 'center',
  },
  ticketName: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.s,
  },
  badgeRow: {
    marginBottom: theme.spacing.xl,
  },
  badge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 6,
  },
  badgeText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  qrWrap: {
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.text,
    marginBottom: theme.spacing.xl,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 6,
    textAlign: 'center',
  },
});
