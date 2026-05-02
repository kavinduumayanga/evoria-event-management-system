import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { ScreenContainer, Card, Button, LoadingState, ErrorState, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { ArrowLeft, Tag, Receipt, CreditCard } from 'lucide-react-native';
import { BookingService, PaymentService } from '../../api/services';

type PaymentSummaryNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PaymentSummary'>;
type PaymentSummaryRouteProp = RouteProp<AttendeeHomeStackParamList, 'PaymentSummary'>;

interface Props { navigation: PaymentSummaryNavigationProp; route: PaymentSummaryRouteProp; }

interface CheckoutSummary {
  totalAmount: number;
  discountedAmount: number;
  discountAmount: number;
  currency: string;
}

const LineRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={lineStyles.row}>
    <Text style={lineStyles.label}>{label}</Text>
    <Text style={[lineStyles.value, highlight && lineStyles.highlight]}>{value}</Text>
  </View>
);

const lineStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
  label: { ...theme.typography.body, color: theme.colors.textSecondary },
  value: { ...theme.typography.bodyMedium, color: theme.colors.text },
  highlight: { ...theme.typography.h3, color: theme.colors.primary, fontWeight: '700' },
});

export const PaymentSummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, ticketTypeId, quantity, promoCode, unlockCode, ticketName, currency, unitPrice } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchSummary(); }, [ticketTypeId, quantity, promoCode, unlockCode]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await PaymentService.mockCheckout({ ticketTypeId, quantity, promoCode, unlockCode });
      setSummary(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to prepare payment summary');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async () => {
    try {
      setIsConfirming(true);
      // Re-validate stock + promo before booking
      await PaymentService.mockCheckout({ ticketTypeId, quantity, promoCode, unlockCode });
      const bookingRes = await BookingService.createBooking({ eventId, ticketTypeId, quantity, promoCode, unlockCode });
      const waitlisted = Boolean(bookingRes.data.booking?.isWaitlisted);
      Alert.alert('Success', waitlisted
        ? 'Event reached capacity. You were added to the waitlist.'
        : 'Payment successful!'
      );
      navigation.replace('BookingConfirmation', { bookingId: bookingRes.data.booking.id });
    } catch (err: any) {
      Alert.alert('Payment Failed', err.response?.data?.message || 'Unable to complete payment');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={20} color={theme.colors.text} />}
          onPress={() => navigation.goBack()}
          variant="surface"
          size={36}
        />
        <Text style={styles.headerTitle}>Payment Summary</Text>
      </View>

      <View style={styles.content}>
        {error ? (
          <Card variant="raised" style={styles.errorCard} noPadding>
            <View style={styles.errorInner}>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Retry" onPress={fetchSummary} variant="secondary" size="md" style={styles.retryBtn} />
            </View>
          </Card>
        ) : (
          <>
            {/* Ticket Info */}
            <Card variant="primary" style={styles.ticketCard} noPadding>
              <View style={styles.ticketHeader}>
                <CreditCard size={16} color={theme.colors.primary} />
                <Text style={styles.ticketName}>{ticketName}</Text>
              </View>
              <View style={styles.ticketBody}>
                <LineRow label="Quantity" value={String(quantity)} />
                <LineRow label="Unit price" value={`${currency} ${unitPrice.toFixed(2)}`} />
                <View style={styles.divider} />
                <LineRow label="Subtotal" value={summary ? `${summary.currency} ${summary.totalAmount.toFixed(2)}` : '—'} />
                {(summary?.discountAmount ?? 0) > 0 && (
                  <LineRow label="Discount" value={summary ? `– ${summary.currency} ${summary.discountAmount.toFixed(2)}` : '—'} />
                )}
                {promoCode && (
                  <View style={styles.promoPill}>
                    <Tag size={12} color={theme.colors.success} />
                    <Text style={styles.promoText}>Code: {promoCode.toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.divider} />
                <LineRow
                  label="Total due"
                  value={summary ? `${summary.currency} ${summary.discountedAmount.toFixed(2)}` : '—'}
                  highlight
                />
              </View>
            </Card>

            {/* Mock disclaimer */}
            <Card variant="raised" style={styles.disclaimerCard} noPadding>
              <View style={styles.disclaimerInner}>
                <Receipt size={14} color={theme.colors.textMuted} />
                <Text style={styles.disclaimerText}>This is a simulated payment. No real charges will be made.</Text>
              </View>
            </Card>
          </>
        )}
      </View>

      {/* Bottom CTA */}
      {!error && (
        <View style={styles.footer}>
          <Button
            title="Confirm & Pay"
            onPress={confirmPayment}
            isLoading={isConfirming}
            variant="primary"
            size="lg"
          />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text },
  content: { flex: 1, paddingHorizontal: theme.spacing.base },
  ticketCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden', marginBottom: theme.spacing.m },
  ticketHeader: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s,
    padding: theme.spacing.m, backgroundColor: theme.colors.primarySubtle,
  },
  ticketName: { ...theme.typography.label, color: theme.colors.primary },
  ticketBody: { padding: theme.spacing.m },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm },
  promoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.successSubtle, borderRadius: theme.borderRadius.round,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: theme.spacing.sm,
  },
  promoText: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '600' },
  disclaimerCard: { borderRadius: theme.borderRadius.m, overflow: 'hidden' },
  disclaimerInner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s, padding: theme.spacing.m },
  disclaimerText: { ...theme.typography.caption, color: theme.colors.textMuted, flex: 1, lineHeight: 18 },
  errorCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  errorInner: { padding: theme.spacing.xl },
  errorText: { ...theme.typography.body, color: theme.colors.error, marginBottom: theme.spacing.m },
  retryBtn: { marginTop: theme.spacing.s },
  footer: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.l,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
