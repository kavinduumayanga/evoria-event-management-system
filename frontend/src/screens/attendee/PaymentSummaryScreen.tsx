import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { ScreenContainer, Card, Button, LoadingState, ErrorState, IconButton, Input } from '../../components';
import { theme } from '../../constants/theme';
import { ArrowLeft, Tag, Receipt, CreditCard, Calendar, Ticket as TicketIcon } from 'lucide-react-native';
import { BookingService, EventService, PaymentService } from '../../api/services';
import { formatSafeDate, formatSafeTime, logDevMissing, safeString, safeTitle, safeUpper } from '../../utils/safeText';

type PaymentSummaryNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PaymentSummary'>;
type PaymentSummaryRouteProp = RouteProp<AttendeeHomeStackParamList, 'PaymentSummary'>;

interface Props { navigation: PaymentSummaryNavigationProp; route: PaymentSummaryRouteProp; }

interface CheckoutSummary {
  totalAmount: number;
  discountedAmount: number;
  discountAmount: number;
  currency: string;
}

interface EventSnapshot {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

const LineRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={lineStyles.row}>
    <Text style={lineStyles.label}>{label}</Text>
    <Text style={[lineStyles.value, highlight && lineStyles.highlight]}>{value}</Text>
  </View>
);

const lineStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.xs },
  label: { ...theme.typography.body, color: theme.colors.textSecondary },
  value: { ...theme.typography.bodyMedium, color: theme.colors.text },
  highlight: { ...theme.typography.h3, color: theme.colors.primary, fontWeight: '700' },
});

export const PaymentSummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const params = route.params;
  const eventId = params?.eventId;
  const ticketTypeId = params?.ticketTypeId;
  const quantity = params?.quantity;
  const promoCode = params?.promoCode;
  const unlockCode = params?.unlockCode;
  const ticketName = params?.ticketName;
  const currency = params?.currency;
  const unitPrice = params?.unitPrice;
  const customAnswers = params?.customAnswers;

  const cardNumberRef = useRef<TextInput>(null);
  const expiryRef = useRef<TextInput>(null);
  const cvvRef = useRef<TextInput>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [eventSnapshot, setEventSnapshot] = useState<EventSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Validation States
  const [nameError, setNameError] = useState('');
  const [cardError, setCardError] = useState('');
  const [expiryError, setExpiryError] = useState('');
  const [cvvError, setCvvError] = useState('');

  const handleCardNumberChange = (text: string) => {
    // Remove all non-digits
    const digits = text.replace(/\D/g, '');
    // Format with spaces
    const formatted = digits.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    if (formatted.replace(/\s+/g, '').length === 16 || formatted.length === 0) {
      setCardError('');
    } else {
      setCardError('Card number must be 16 digits');
    }
  };

  const handleExpiryChange = (text: string) => {
    // Allow deleting slash properly
    if (expiry.endsWith('/') && text.length < expiry.length) {
      setExpiry(text.slice(0, -1));
      return;
    }
    // Remove all non-digits
    let digits = text.replace(/\D/g, '');
    if (digits.length >= 2) {
      digits = digits.slice(0, 2) + '/' + digits.slice(2, 4);
    }
    setExpiry(digits);
    
    // Validate
    if (digits.length === 0) {
      setExpiryError('');
      return;
    }
    if (digits.length === 5) {
      const [mm, yy] = digits.split('/');
      const month = parseInt(mm, 10);
      const year = parseInt(`20${yy}`, 10);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        setExpiryError('Invalid month');
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        setExpiryError('Card expired');
      } else {
        setExpiryError('');
      }
    } else {
      setExpiryError('Use MM/YY format');
    }
  };

  const handleCvvChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setCvv(digits);
    if (digits.length === 3 || digits.length === 0) {
      setCvvError('');
    } else {
      setCvvError('CVV must be exactly 3 digits');
    }
  };

  const handleNameChange = (text: string) => {
    setCardholderName(text);
    if (text.trim().length >= 2 || text.length === 0) {
      setNameError('');
    } else {
      setNameError('Name too short');
    }
  };

  useEffect(() => { void fetchSummary(); }, [ticketTypeId, quantity, promoCode, unlockCode, eventId]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!ticketTypeId || !quantity || !eventId) return;
      const [checkoutResponse, eventResponse] = await Promise.all([
        PaymentService.mockCheckout({ ticketTypeId, quantity, promoCode, unlockCode }),
        EventService.getEvent(eventId),
      ]);
      const eventData = eventResponse?.data?.event;
      setSummary(checkoutResponse.data);
      setEventSnapshot({
        title: safeTitle(eventData?.title, 'Event'),
        date: safeString(eventData?.date, ''),
        startTime: safeString(eventData?.startTime, ''),
        endTime: safeString(eventData?.endTime, ''),
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to prepare payment summary');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async () => {
    Keyboard.dismiss();
    if (!eventId || !ticketTypeId || !quantity) return;

    const totalDue = Number(summary?.discountedAmount ?? (Number(unitPrice || 0) * quantity));
    const requiresPaymentDetails = totalDue > 0;
    const normalizedCardNumber = cardNumber.replace(/\s+/g, '');
    let isValid = true;

    if (requiresPaymentDetails) {
      const hasMissingPaymentDetails = !cardholderName.trim() || !normalizedCardNumber || !expiry.trim() || !cvv.trim();
      if (hasMissingPaymentDetails) {
        Alert.alert('Payment Failed', 'Payment method details are missing.');
      }

      if (!cardholderName.trim() || cardholderName.trim().length < 2) {
        setNameError('Cardholder name is required');
        isValid = false;
      }
      if (!/^\d{16}$/.test(normalizedCardNumber)) {
        setCardError('Card number must be 16 digits');
        isValid = false;
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry.trim()) || expiryError) {
        setExpiryError(expiryError || 'Expiry must be in MM/YY format');
        isValid = false;
      }
      if (!/^\d{3}$/.test(cvv.trim())) {
        setCvvError('CVV must be exactly 3 digits');
        isValid = false;
      }
    }

    if (!isValid) return;

    try {
      setIsConfirming(true);
      await PaymentService.mockCheckout({ ticketTypeId, quantity, promoCode, unlockCode });
      const bookingRes = await BookingService.createBooking({
        eventId,
        ticketTypeId,
        quantity,
        promoCode,
        unlockCode,
        customAnswers,
        allowWaitlist: false,
      });
      Alert.alert(
        requiresPaymentDetails ? 'Payment Successful' : 'Registration Confirmed',
        requiresPaymentDetails ? 'Payment completed successfully.' : 'No payment was required for this ticket.',
      );
      navigation.replace('BookingConfirmation', { bookingId: bookingRes.data.booking.id });
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      const rawMessage = safeString(err?.response?.data?.message, '').toLowerCase();
      let title = 'Payment Failed';
      let message = 'Payment could not be completed. Please try again';

      if (
        rawMessage.includes('required question is missing an answer')
        || rawMessage.includes('invalid custom question answer')
        || rawMessage.includes('invalid answer for question')
      ) {
        message = 'Please complete the registration form';
      } else if (
        rawMessage.includes('tickettypeid is required')
        || rawMessage.includes('ticket not found')
        || rawMessage.includes('ticket does not belong to this event')
      ) {
        message = 'Please select a ticket';
      } else if (
        rawMessage.includes('requested quantity exceeds ticket capacity')
        || rawMessage.includes('ticket is not active')
      ) {
        title = 'Sold Out';
        message = 'Selected ticket is sold out';
      } else if (
        rawMessage.includes('sold out')
        || rawMessage.includes('capacity full')
        || status === 409
      ) {
        title = 'Sold Out';
        message = 'This event is full';
      } else if (rawMessage.includes('payment method details are missing')) {
        message = 'Payment method details are missing';
      }

      Alert.alert(title, message);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!eventId || !ticketTypeId || !quantity || !ticketName || !currency || typeof unitPrice !== 'number') {
    logDevMissing('payment-summary-missing-params', 'PaymentSummaryScreen missing required route params.');
    return (
      <ScreenContainer>
        <ErrorState message="Payment method details are missing." onRetry={() => navigation.goBack()} actionLabel="Go Back" />
      </ScreenContainer>
    );
  }

  if (isLoading) return <LoadingState />;

  return (
    <ScreenContainer>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        >
          <View style={styles.header}>
            <IconButton
              icon={<ArrowLeft size={20} color={theme.colors.text} />}
              onPress={() => navigation.goBack()}
              variant="surface"
              size={36}
            />
            <Text style={styles.headerTitle}>Payment Summary</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 96 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <Card variant="raised" style={styles.errorCard} noPadding>
                <View style={styles.errorInner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Button title="Retry" onPress={() => { void fetchSummary(); }} variant="secondary" size="md" style={styles.retryBtn} />
                </View>
              </Card>
            ) : (
              <>
                <Card variant="raised" style={styles.sectionCard} noPadding>
                  <View style={styles.sectionInner}>
                    <View style={styles.sectionTitleRow}>
                      <Calendar size={16} color={theme.colors.primary} />
                      <Text style={styles.sectionTitle}>Event Summary</Text>
                    </View>
                    <Text style={styles.eventTitle}>{safeTitle(eventSnapshot?.title, 'Event')}</Text>
                    <Text style={styles.eventMeta}>
                      {formatSafeDate(eventSnapshot?.date || '', 'Date unavailable')} · {formatSafeTime(eventSnapshot?.startTime || '', 'Time')} - {formatSafeTime(eventSnapshot?.endTime || '', 'Time')}
                    </Text>
                  </View>
                </Card>

                <Card variant="primary" style={styles.sectionCard} noPadding>
                  <View style={styles.sectionInner}>
                    <View style={styles.sectionTitleRow}>
                      <TicketIcon size={16} color={theme.colors.primary} />
                      <Text style={styles.sectionTitle}>Ticket Summary</Text>
                    </View>
                    <LineRow label="Ticket" value={safeTitle(ticketName, 'Ticket')} />
                    <LineRow label="Quantity" value={String(quantity)} />
                    <LineRow label="Unit price" value={`${safeString(currency, 'LKR')} ${Number(unitPrice || 0).toFixed(2)}`} />
                  </View>
                </Card>

                <Card variant="raised" style={styles.sectionCard} noPadding>
                  <View style={styles.sectionInner}>
                    <View style={styles.sectionTitleRow}>
                      <Receipt size={16} color={theme.colors.primary} />
                      <Text style={styles.sectionTitle}>Price Breakdown</Text>
                    </View>
                    <LineRow label="Subtotal" value={summary ? `${summary.currency} ${summary.totalAmount.toFixed(2)}` : '—'} />
                    {(summary?.discountAmount ?? 0) > 0 && (
                      <LineRow label="Discount" value={summary ? `– ${summary.currency} ${summary.discountAmount.toFixed(2)}` : '—'} />
                    )}
                    {promoCode ? (
                      <View style={styles.promoPill}>
                        <Tag size={12} color={theme.colors.success} />
                        <Text style={styles.promoText}>Code: {safeUpper(promoCode)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.divider} />
                    <LineRow label="Total due" value={summary ? `${summary.currency} ${summary.discountedAmount.toFixed(2)}` : '—'} highlight />
                  </View>
                </Card>

                {(summary?.discountedAmount ?? Number(unitPrice || 0) * quantity) > 0 ? (
                  <Card variant="raised" style={styles.sectionCard} noPadding>
                    <View style={styles.sectionInner}>
                      <View style={styles.sectionTitleRow}>
                        <CreditCard size={16} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                      </View>
                      <Text style={styles.disclaimerText}>This is a simulated payment form. No real card charge is made.</Text>
                      <Input
                        label="Cardholder name"
                        value={cardholderName}
                        onChangeText={handleNameChange}
                        placeholder="John Doe"
                        returnKeyType="next"
                        error={nameError}
                        onSubmitEditing={() => cardNumberRef.current?.focus()}
                      />
                      <Input
                        ref={cardNumberRef}
                        label="Card number"
                        value={cardNumber}
                        onChangeText={handleCardNumberChange}
                        keyboardType="number-pad"
                        placeholder="4111 1111 1111 1111"
                        returnKeyType="next"
                        error={cardError}
                        maxLength={19}
                        onSubmitEditing={() => expiryRef.current?.focus()}
                      />
                      <View style={styles.formRow}>
                        <Input
                          ref={expiryRef}
                          label="Expiry (MM/YY)"
                          value={expiry}
                          onChangeText={handleExpiryChange}
                          keyboardType="number-pad"
                          placeholder="12/30"
                          containerStyle={styles.flexInput}
                          returnKeyType="next"
                          error={expiryError}
                          maxLength={5}
                          onSubmitEditing={() => cvvRef.current?.focus()}
                        />
                        <Input
                          ref={cvvRef}
                          label="CVV"
                          value={cvv}
                          onChangeText={handleCvvChange}
                          keyboardType="number-pad"
                          placeholder="123"
                          containerStyle={styles.flexInput}
                          returnKeyType="done"
                          error={cvvError}
                          maxLength={3}
                          blurOnSubmit
                        />
                      </View>
                    </View>
                  </Card>
                ) : (
                  <Card variant="raised" style={styles.sectionCard} noPadding>
                    <View style={styles.sectionInner}>
                      <View style={styles.sectionTitleRow}>
                        <CreditCard size={16} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                      </View>
                      <Text style={styles.disclaimerText}>No payment method is required for this ticket.</Text>
                    </View>
                  </Card>
                )}

                <View style={styles.payActionWrap}>
                  <Button
                    title={(summary?.discountedAmount ?? Number(unitPrice || 0) * quantity) > 0 ? 'Confirm & Pay' : 'Confirm Registration'}
                    onPress={confirmPayment}
                    isLoading={isConfirming}
                    variant="primary"
                    size="lg"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.m,
  },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: theme.spacing.base, gap: theme.spacing.m, flexGrow: 1 },
  sectionCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  sectionInner: { padding: theme.spacing.m },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s, marginBottom: theme.spacing.s },
  sectionTitle: { ...theme.typography.label, color: theme.colors.text },
  eventTitle: { ...theme.typography.bodyMedium, color: theme.colors.text },
  eventMeta: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 4 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.s },
  promoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.successSubtle,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  promoText: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '600' },
  disclaimerText: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.s },
  formRow: { flexDirection: 'row', gap: theme.spacing.s },
  flexInput: { flex: 1 },
  errorCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  errorInner: { padding: theme.spacing.xl },
  errorText: { ...theme.typography.body, color: theme.colors.error, marginBottom: theme.spacing.m },
  retryBtn: { marginTop: theme.spacing.s },
  payActionWrap: {
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
});
