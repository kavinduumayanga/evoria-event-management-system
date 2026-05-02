import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList, AttendeeTabParamList } from '../../types/navigation';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ScreenContainer, Card, Button, IconButton, ErrorState, LoadingState } from '../../components';
import { theme } from '../../constants/theme';
import { CheckCircle2, Clock, Ticket as TicketIcon, ArrowLeft } from 'lucide-react-native';
import apiClient from '../../api/client';
import { Booking } from '../../types';
import { logDevMissing, safeStatus, safeString, safeUpper } from '../../utils/safeText';

type BookingConfirmationNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AttendeeHomeStackParamList, 'BookingConfirmation'>,
  BottomTabNavigationProp<AttendeeTabParamList>
>;
type BookingConfirmationRouteProp = RouteProp<AttendeeHomeStackParamList, 'BookingConfirmation'>;

interface Props {
  navigation: BookingConfirmationNavigationProp;
  route: BookingConfirmationRouteProp;
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value}>{value}</Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { ...theme.typography.caption, color: theme.colors.textMuted },
  value: { ...theme.typography.bodyMedium, color: theme.colors.text },
});

export const BookingConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const bookingId = route.params?.bookingId;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchBooking(); }, [bookingId]);

  const fetchBooking = async () => {
    try {
      if (!bookingId) return;
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get(`/bookings/${bookingId}`);
      setBooking(res.data.data.booking);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  if (!bookingId) {
    logDevMissing('booking-confirmation-missing-id', 'BookingConfirmationScreen missing bookingId route param.');
    return (
      <ScreenContainer>
        <ErrorState message="Missing booking details." onRetry={() => navigation.goBack()} actionLabel="Go Back" />
      </ScreenContainer>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchBooking} /></ScreenContainer>;
  if (!booking) return <ScreenContainer><ErrorState message="Booking not found" onRetry={fetchBooking} /></ScreenContainer>;

  const isWaitlisted = Boolean(booking.isWaitlisted);
  const approvalStatus = safeStatus(booking.approvalStatus, 'approved');
  const rsvpStatus = safeStatus(booking.rsvpStatus, 'going');
  const bookingIdLabel = safeString(booking.id, '').slice(-8);
  const totalAmount = Number.isFinite(Number(booking.totalAmount)) ? Number(booking.totalAmount) : 0;

  return (
    <ScreenContainer scrollable>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={36}
          />
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: isWaitlisted ? theme.colors.warningSubtle : theme.colors.successSubtle }]}>
            {isWaitlisted
              ? <Clock size={40} color={theme.colors.warning} />
              : <CheckCircle2 size={40} color={theme.colors.success} />
            }
          </View>
          <Text style={styles.heroTitle}>
            {isWaitlisted ? 'Joined Waitlist!' : 'Booking Confirmed!'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isWaitlisted
              ? 'Event is full. You\'ll be promoted automatically when a seat opens.'
              : 'Your registration is complete. See you there!'}
          </Text>
        </View>

        {/* Booking details card */}
        <Card variant="raised" style={styles.detailCard} noPadding>
          <View style={styles.cardHeader}>
            <TicketIcon size={16} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Booking Details</Text>
          </View>
          <View style={styles.cardBody}>
            <InfoRow label="Booking ID" value={`#${safeUpper(bookingIdLabel || '—', '—')}`} />
            {isWaitlisted && (
              <InfoRow label="Waitlist Position" value={`#${booking.waitlistPosition || '—'}`} />
            )}
            <InfoRow label="Quantity" value={String(booking.quantity || 0)} />
            <InfoRow label="Approval" value={safeUpper(approvalStatus, 'APPROVED')} />
            <InfoRow label="RSVP" value={safeUpper(rsvpStatus.replace('_', ' '), 'UNKNOWN')} />
            <View style={[infoStyles.row, { borderBottomWidth: 0 }]}>
              <Text style={infoStyles.label}>Total Paid</Text>
              <Text style={[infoStyles.value, styles.totalAmount]}>
                ${totalAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={isWaitlisted ? 'View My Waitlist' : 'View My Bookings'}
            onPress={() =>
              isWaitlisted
                ? navigation.navigate('HomeStack', { screen: 'MyWaitlist' })
                : navigation.navigate('MyRegistrations')
            }
            variant="primary"
            size="lg"
          />
          <Button
            title="Back to Discover"
            onPress={() => navigation.navigate('HomeStack', { screen: 'EventList' })}
            variant="ghost"
            size="md"
          />
        </View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: theme.spacing.base, paddingBottom: 140 },
  header: { paddingTop: theme.spacing.l, marginBottom: theme.spacing.s },
  heroSection: { alignItems: 'center', paddingTop: theme.spacing.xxl, paddingBottom: theme.spacing.xl },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  heroTitle: { ...theme.typography.h1, color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.m },
  heroSubtitle: { ...theme.typography.body, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 300 },
  detailCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden', marginBottom: theme.spacing.xl },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s, padding: theme.spacing.m, backgroundColor: theme.colors.primarySubtle },
  cardTitle: { ...theme.typography.label, color: theme.colors.primary },
  cardBody: { padding: theme.spacing.m },
  totalAmount: { ...theme.typography.h3, color: theme.colors.primary, fontWeight: '700' },
  actions: { gap: theme.spacing.m },
});
