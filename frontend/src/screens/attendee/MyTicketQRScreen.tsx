import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle2, Ticket as TicketIcon } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Booking } from '../../types';
import { HeaderBar, QRCard, LoadingState, ErrorState, GlassCard } from '../../components';
import { BookingService, CheckInService, EventService, TicketService } from '../../api/services';
import { formatSafeDate, logDevMissing, safeStatus, safeString, safeTitle, safeUpper } from '../../utils/safeText';

type MyTicketQRRouteProp = RouteProp<AttendeeHomeStackParamList, 'MyTicketQR'>;
type MyTicketQRNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'MyTicketQR'>;

interface Props { route: MyTicketQRRouteProp; navigation: MyTicketQRNavigationProp; }

export const MyTicketQRScreen: React.FC<Props> = ({ route, navigation }) => {
  const bookingId = route.params?.bookingId;
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
      if (!bookingId) return;
      const [bookingRes, qrRes] = await Promise.all([ BookingService.getBooking(bookingId), CheckInService.getBookingQr(bookingId) ]);
      const bookingData = bookingRes?.data?.booking as Booking | undefined;
      if (!bookingData?.id || !bookingData.eventId || !bookingData.ticketTypeId) {
        throw new Error('Invalid booking payload');
      }
      setBooking(bookingData);
      setQrCodeValue(safeString(qrRes?.data?.qrCodeValue || qrRes?.data?.qrData, ''));
      const [eventRes, ticketRes] = await Promise.all([ EventService.getEvent(bookingData.eventId), TicketService.getTicket(bookingData.ticketTypeId) ]);
      setEventTitle(safeTitle(eventRes?.data?.event?.title, 'Untitled Event'));
      setTicketName(safeTitle(ticketRes?.data?.ticket?.name, 'Ticket'));
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to load ticket QR'); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchTicketQr(); }, [bookingId]);

  if (!bookingId) return <View style={styles.screen}><HeaderBar variant="back" /><ErrorState message="Missing ticket details." onRetry={() => navigation.goBack()} /></View>;
  if (isLoading) return <LoadingState />;
  if (error) return <View style={styles.screen}><HeaderBar variant="back" /><ErrorState message={error} onRetry={fetchTicketQr} /></View>;
  if (!booking || !qrCodeValue) return <View style={styles.screen}><HeaderBar variant="back" /><ErrorState message="No QR data available" onRetry={fetchTicketQr} /></View>;

  const checkedIn = booking.checkInStatus === 'checked_in';
  const bookingIdLabel = safeString(booking.id, '').slice(-8);

  return (
    <View style={styles.screen}>
      <HeaderBar variant="back" title="My Ticket" />
      <ScrollView contentContainerStyle={styles.container}>
        <GlassCard variant="dark" style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <TicketIcon size={20} color="#FFFFFF" />
            <Text style={styles.ticketType}>{ticketName}</Text>
          </View>
          
          <View style={styles.ticketBody}>
            <Text style={styles.eventTitle}>{safeTitle(eventTitle, 'Untitled Event')}</Text>
            <Text style={styles.bookingId}>Booking #{safeUpper(bookingIdLabel || '—', '—')}</Text>
          </View>

          <View style={styles.qrSection}>
            <QRCard value={qrCodeValue} size={220} label="Present this QR code at the entrance" />
          </View>

          {checkedIn && booking.checkedInAt && (
            <View style={styles.checkedInBanner}>
              <CheckCircle2 size={16} color="#20C997" />
              <Text style={styles.checkedInText}>
                Verified {formatSafeDate(booking.checkedInAt, 'Time unavailable', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  container: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  ticketCard: { padding: 0 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  ticketType: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  ticketBody: { padding: 24, alignItems: 'center', gap: 8 },
  eventTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 },
  bookingId: { color: '#A3A3A3', fontSize: 14, fontFamily: 'monospace' },
  qrSection: { paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  checkedInBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: 'rgba(32, 201, 151, 0.1)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  checkedInText: { color: '#20C997', fontSize: 14, fontWeight: '600' },
});
