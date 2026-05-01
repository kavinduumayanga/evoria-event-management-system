import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { GradientBackground, Button, GlassCard, LoadingState } from '../../components';
import { theme } from '../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { BookingService, PaymentService } from '../../api/services';

type PaymentSummaryNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PaymentSummary'>;
type PaymentSummaryRouteProp = RouteProp<AttendeeHomeStackParamList, 'PaymentSummary'>;

interface Props {
  navigation: PaymentSummaryNavigationProp;
  route: PaymentSummaryRouteProp;
}

interface CheckoutSummary {
  totalAmount: number;
  discountedAmount: number;
  discountAmount: number;
  currency: string;
}

export const PaymentSummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    eventId,
    ticketTypeId,
    quantity,
    promoCode,
    unlockCode,
    ticketName,
    currency,
    unitPrice,
  } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [ticketTypeId, quantity, promoCode, unlockCode]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await PaymentService.mockCheckout({
        ticketTypeId,
        quantity,
        promoCode,
        unlockCode,
      });
      setSummary(response.data);
    } catch (checkoutError: any) {
      setError(checkoutError.response?.data?.message || 'Failed to prepare mock payment');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async () => {
    try {
      setIsConfirming(true);

      // Re-run mock checkout to validate latest stock and promo before booking.
      await PaymentService.mockCheckout({
        ticketTypeId,
        quantity,
        promoCode,
        unlockCode,
      });

      const bookingResponse = await BookingService.createBooking({
        eventId,
        ticketTypeId,
        quantity,
        promoCode,
        unlockCode,
      });

      Alert.alert('Success', 'Payment Successful (Mock)');
      navigation.replace('BookingConfirmation', { bookingId: bookingResponse.data.booking.id });
    } catch (confirmError: any) {
      Alert.alert('Payment Failed', confirmError.response?.data?.message || 'Unable to complete mock payment');
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Summary</Text>
        </View>

        <View style={styles.content}>
          {error ? (
            <GlassCard style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Button title="Retry" onPress={fetchSummary} style={{ marginTop: theme.spacing.m }} />
            </GlassCard>
          ) : (
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.ticketName}>{ticketName}</Text>
              <Text style={styles.rowText}>Quantity: {quantity}</Text>
              <Text style={styles.rowText}>Unit Price: {currency} {unitPrice.toFixed(2)}</Text>
              <Text style={styles.rowText}>Original Price: {summary ? `${summary.currency} ${summary.totalAmount.toFixed(2)}` : '-'}</Text>
              <Text style={styles.rowText}>Discount: {summary ? `${summary.currency} ${summary.discountAmount.toFixed(2)}` : '-'}</Text>
              <Text style={styles.finalAmount}>
                Final Amount: {summary ? `${summary.currency} ${summary.discountedAmount.toFixed(2)}` : '-'}
              </Text>
              {promoCode ? (
                <Text style={styles.promoText}>Promo Code: {promoCode.toUpperCase()}</Text>
              ) : null}
            </GlassCard>
          )}
        </View>

        {!error && (
          <View style={styles.footer}>
            <Button title="Confirm Payment" onPress={confirmPayment} isLoading={isConfirming} />
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.m },
  backButton: { marginRight: theme.spacing.m },
  headerTitle: { ...theme.typography.h2, color: theme.colors.text },
  content: { flex: 1, padding: theme.spacing.m },
  summaryCard: {
    padding: theme.spacing.l,
  },
  ticketName: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
  rowText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
  finalAmount: {
    ...theme.typography.h3,
    color: theme.colors.success,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  promoText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
  },
  footer: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.surfaceLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  errorCard: {
    padding: theme.spacing.l,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
});
