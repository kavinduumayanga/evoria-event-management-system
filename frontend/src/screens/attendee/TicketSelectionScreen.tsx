import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { ScreenContainer, Card, Button, LoadingState, ErrorState, Input, StatusBadge, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { Event, EventCustomQuestion, TicketType } from '../../types';
import { ArrowLeft, Tag, Minus, Plus, AlertTriangle } from 'lucide-react-native';
import { BookingService, TicketService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { logDevMissing, safeStatus, safeString, safeTitle } from '../../utils/safeText';

type TicketSelectionNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'TicketSelection'>;
type TicketSelectionRouteProp = RouteProp<AttendeeHomeStackParamList, 'TicketSelection'>;

interface Props {
  navigation: TicketSelectionNavigationProp;
  route: TicketSelectionRouteProp;
}

interface PromoPreview {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  appliedPromoCode?: string;
}

const toCustomAnswersPayload = (
  questions: EventCustomQuestion[],
  answerMap: Record<string, string>,
) => questions
  .map((question) => ({
    questionId: question.id,
    answer: (answerMap[question.id] || '').trim(),
  }))
  .filter((entry) => entry.answer.length > 0);

const validateRequiredQuestions = (
  questions: EventCustomQuestion[],
  answerMap: Record<string, string>,
): string | null => {
  const requiredQuestion = questions.find((question) => question.required && !(answerMap[question.id] || '').trim());
  if (!requiredQuestion) return null;
  return `Please answer required question: ${requiredQuestion.question}`;
};

export const TicketSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const currentUser = useAuthStore((state) => state.user);

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [promoPreview, setPromoPreview] = useState<PromoPreview | null>(null);
  const [customAnswerMap, setCustomAnswerMap] = useState<Record<string, string>>({});

  useEffect(() => { fetchTickets(); }, [eventId]);
  useEffect(() => { setPromoPreview(null); }, [quantity, selectedTicket?.id]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!eventId) return;
      const [eventRes, ticketRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`),
      ]);

      const eventData: Event = eventRes.data.data.event;
      setEvent(eventData);

      const eventStatus = safeStatus(eventData.status, 'draft');
      const eventVisibility = safeString(eventData.visibility, 'private');
      if (eventStatus !== 'published' || eventVisibility === 'private') {
        setTickets([]);
        setError('This event is currently unavailable for booking.');
        return;
      }

      setTickets(ticketRes.data.data.tickets.filter((ticket: TicketType) => ticket.isActive));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const eventQuestions = useMemo(
    () => event?.customQuestions || event?.registrationFields?.customQuestions || [],
    [event],
  );

  const remainingForSelected = useMemo(() => {
    if (!selectedTicket) return 0;
    return Math.max(0, selectedTicket.quantity - selectedTicket.soldCount);
  }, [selectedTicket]);

  const isEventSoldOut = Boolean(event && event.bookingCount >= event.capacity);
  const isFreeEventMode = (event?.pricingMode || 'ticketed') === 'free';

  const applyPromoCode = async () => {
    if (!selectedTicket) return;
    if (!promoCode.trim()) {
      Alert.alert('Promo Code', 'Enter a promo code first.');
      return;
    }

    try {
      setIsApplyingPromo(true);
      const res = await TicketService.applyPromo({
        ticketTypeId: selectedTicket.id,
        quantity,
        promoCode: promoCode.trim(),
        unlockCode: unlockCode.trim() || undefined,
      });
      setPromoPreview(res.data);
    } catch (err: any) {
      setPromoPreview(null);
      Alert.alert('Promo Error', err.response?.data?.message || 'Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleFreeRegister = async () => {
    if (!event) return;
    if (isEventSoldOut) {
      Alert.alert('Sold Out', 'Sold Out / Capacity Full');
      return;
    }

    const validationError = validateRequiredQuestions(eventQuestions, customAnswerMap);
    if (validationError) {
      Alert.alert('Registration Form', validationError);
      return;
    }

    try {
      setIsBooking(true);
      const res = await BookingService.createBooking({
        eventId,
        quantity: 1,
        customAnswers: toCustomAnswersPayload(eventQuestions, customAnswerMap),
        allowWaitlist: false,
      });
      navigation.navigate('BookingConfirmation', { bookingId: res.data.booking.id });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to register for this free event.';
      Alert.alert(err?.response?.status === 409 ? 'Sold Out' : 'Registration Failed', msg);
    } finally {
      setIsBooking(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedTicket || !event) return;
    if (isEventSoldOut) {
      Alert.alert('Sold Out', 'Sold Out / Capacity Full');
      return;
    }
    const eventStatus = safeStatus(event.status, 'draft');
    const eventVisibility = safeString(event.visibility, 'private');
    if (eventStatus !== 'published' || eventVisibility === 'private') {
      Alert.alert('Booking Blocked', 'This event is currently unavailable for booking.');
      return;
    }
    if (remainingForSelected <= 0) {
      Alert.alert('Sold Out', 'This ticket is sold out.');
      return;
    }
    if (quantity > selectedTicket.maxPerUser) {
      Alert.alert('Limit Exceeded', `You can only book up to ${selectedTicket.maxPerUser} tickets.`);
      return;
    }

    const validationError = validateRequiredQuestions(eventQuestions, customAnswerMap);
    if (validationError) {
      Alert.alert('Registration Form', validationError);
      return;
    }

    const customAnswers = toCustomAnswersPayload(eventQuestions, customAnswerMap);

    if (selectedTicket.isFree) {
      try {
        setIsBooking(true);
        const res = await BookingService.createBooking({
          eventId,
          ticketTypeId: selectedTicket.id,
          quantity,
          unlockCode: unlockCode.trim() || undefined,
          customAnswers,
          allowWaitlist: false,
        });
        navigation.navigate('BookingConfirmation', { bookingId: res.data.booking.id });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Unable to confirm registration';
        Alert.alert(err?.response?.status === 409 ? 'Sold Out' : 'Booking Failed', msg);
      } finally {
        setIsBooking(false);
      }
      return;
    }

    navigation.navigate('PaymentSummary', {
      eventId,
      ticketTypeId: selectedTicket.id,
      quantity,
      promoCode: promoCode.trim() || undefined,
      unlockCode: unlockCode.trim() || undefined,
      ticketName: safeTitle(selectedTicket.name, 'Ticket'),
      currency: safeString(selectedTicket.currency, 'LKR'),
      unitPrice: selectedTicket.price,
      customAnswers,
    });
  };

  if (!eventId) {
    logDevMissing('ticket-selection-missing-id', 'TicketSelectionScreen missing eventId route param.');
    return (
      <ScreenContainer>
        <ErrorState message="Missing event details." onRetry={() => navigation.goBack()} actionLabel="Go Back" />
      </ScreenContainer>
    );
  }

  if (isLoading) return <LoadingState />;

  const renderRegistrationQuestions = () => (
    <Card variant="raised" style={styles.registrationCard}>
      <Text style={styles.sectionTitle}>Registration Form</Text>
      <Text style={styles.readonlyText}>Name: {currentUser?.name || 'Attendee'}</Text>
      <Text style={styles.readonlyText}>Email: {currentUser?.email || 'N/A'}</Text>
      {eventQuestions.length > 0 ? eventQuestions.map((question) => (
        <Input
          key={question.id}
          label={`${question.question}${question.required ? ' *' : ''}`}
          value={customAnswerMap[question.id] || ''}
          onChangeText={(value) => setCustomAnswerMap((prev) => ({ ...prev, [question.id]: value }))}
          placeholder={question.type === 'number' ? 'Enter a number' : 'Type your answer'}
          keyboardType={question.type === 'number' ? 'numeric' : 'default'}
        />
      )) : (
        <Text style={styles.questionHint}>No extra questions for this event.</Text>
      )}
    </Card>
  );

  if (isFreeEventMode) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={20} color={theme.colors.text} />} onPress={() => navigation.goBack()} variant="surface" size={36} />
          <Text style={styles.headerTitle}>Free Registration</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Card variant="primary" style={styles.eventCard}>
            <Text style={styles.eventTitle}>{safeTitle(event?.title, 'Untitled Event')}</Text>
            <Text style={styles.freeLabel}>Free to attend</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Capacity: {event?.capacity || 0}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>Booked: {event?.bookingCount || 0}</Text>
            </View>
            {isEventSoldOut ? (
              <View style={styles.soldOutBanner}>
                <AlertTriangle size={14} color={theme.colors.error} />
                <Text style={styles.soldOutText}>Sold Out / Capacity Full</Text>
              </View>
            ) : null}
          </Card>

          {renderRegistrationQuestions()}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title={isEventSoldOut ? 'Sold Out / Capacity Full' : 'Confirm Registration'}
            onPress={handleFreeRegister}
            isLoading={isBooking}
            disabled={Boolean(error) || isEventSoldOut}
            variant="primary"
            size="lg"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft size={20} color={theme.colors.text} />} onPress={() => navigation.goBack()} variant="surface" size={36} />
        <Text style={styles.headerTitle}>Select Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isEventSoldOut ? (
          <View style={styles.soldOutBanner}>
            <AlertTriangle size={14} color={theme.colors.error} />
            <Text style={styles.soldOutText}>Sold Out / Capacity Full</Text>
          </View>
        ) : null}

        {renderRegistrationQuestions()}

        {tickets.map((ticket) => {
          const available = Math.max(0, ticket.quantity - ticket.soldCount);
          const isSelected = selectedTicket?.id === ticket.id;
          const isSoldOut = available === 0;

          return (
            <TouchableOpacity key={ticket.id} onPress={() => setSelectedTicket(ticket)} disabled={isSoldOut} activeOpacity={0.8}>
              <Card
                variant={isSelected ? 'primary' : 'raised'}
                style={[styles.ticketCard, isSelected && styles.ticketCardSelected]}
              >
                <View style={styles.ticketTopRow}>
                  <Text style={styles.ticketName}>{ticket.name}</Text>
                  <StatusBadge status={ticket.isFree ? 'success' : 'info'} label={ticket.isFree ? 'Free' : 'Paid'} />
                </View>
                <Text style={styles.ticketPrice}>
                  {ticket.isFree ? 'Free' : `${safeString(ticket.currency, 'LKR')} ${Number(ticket.price || 0).toFixed(2)}`}
                </Text>
                <View style={styles.ticketMetaRow}>
                  <Text style={styles.ticketMeta}>Remaining: {available}</Text>
                  <Text style={styles.ticketMetaDot}>·</Text>
                  <Text style={styles.ticketMeta}>Max/person: {ticket.maxPerUser}</Text>
                </View>
                {isSoldOut ? <Text style={styles.ticketSoldOutText}>Sold Out</Text> : null}
              </Card>
            </TouchableOpacity>
          );
        })}

        {selectedTicket ? (
          <View style={styles.codesSection}>
            {selectedTicket.unlockCode ? (
              <Input
                label="Unlock Code (required)"
                value={unlockCode}
                onChangeText={setUnlockCode}
                placeholder="Enter unlock code"
              />
            ) : null}

            {!selectedTicket.isFree ? (
              <View style={styles.promoRow}>
                <Input
                  label="Promo code"
                  value={promoCode}
                  onChangeText={(value) => { setPromoCode(value); setPromoPreview(null); }}
                  placeholder="SAVE20"
                  autoCapitalize="characters"
                  containerStyle={styles.promoInput}
                />
                <Button
                  title="Apply"
                  onPress={applyPromoCode}
                  isLoading={isApplyingPromo}
                  variant="secondary"
                  size="sm"
                  icon={<Tag size={14} color={theme.colors.text} />}
                  style={styles.applyBtn}
                />
              </View>
            ) : null}

            {promoPreview ? (
              <Card variant="primary" style={styles.promoResult}>
                <Text style={styles.promoSaving}>Saving {promoPreview.currency} {promoPreview.discountAmount.toFixed(2)}</Text>
                <Text style={styles.promoFinal}>Final: {promoPreview.currency} {promoPreview.finalAmount.toFixed(2)}</Text>
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {selectedTicket && !error ? (
        <View style={styles.footer}>
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={16} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  const max = Math.min(selectedTicket.maxPerUser, remainingForSelected);
                  setQuantity(Math.min(max, quantity + 1));
                }}
              >
                <Plus size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <Button
            title={isEventSoldOut ? 'Sold Out / Capacity Full' : (selectedTicket.isFree ? 'Register Ticket' : 'Continue to Mock Payment')}
            onPress={handleContinue}
            isLoading={isBooking}
            disabled={isEventSoldOut || remainingForSelected === 0}
            variant="primary"
            size="lg"
          />
        </View>
      ) : null}
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
    marginBottom: theme.spacing.m,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  content: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 156,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.m,
  },
  registrationCard: {
    marginBottom: theme.spacing.m,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  readonlyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.s,
  },
  questionHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  eventCard: {
    marginBottom: theme.spacing.m,
  },
  eventTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 4,
  },
  freeLabel: {
    ...theme.typography.label,
    color: theme.colors.success,
    marginBottom: theme.spacing.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  metaDot: {
    marginHorizontal: theme.spacing.s,
    color: theme.colors.textMuted,
  },
  soldOutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.colors.errorSubtle,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  soldOutText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: '700',
  },
  ticketCard: {
    marginBottom: theme.spacing.s,
  },
  ticketCardSelected: {
    borderColor: theme.colors.primary,
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  ticketName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.s,
  },
  ticketPrice: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
  },
  ticketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  ticketMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  ticketMetaDot: {
    marginHorizontal: theme.spacing.s,
    color: theme.colors.textMuted,
  },
  ticketSoldOutText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    fontWeight: '700',
  },
  codesSection: {
    marginTop: theme.spacing.s,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.s,
  },
  promoInput: {
    flex: 1,
  },
  applyBtn: {
    marginBottom: theme.spacing.m,
  },
  promoResult: {
    marginTop: theme.spacing.s,
  },
  promoSaving: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
    marginBottom: 4,
  },
  promoFinal: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.s,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyLabel: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
  },
  qtyNum: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
});
