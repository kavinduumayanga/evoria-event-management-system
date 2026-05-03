import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Keyboard } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { HeaderBar, PrimaryButton, InputField, GlassCard, SectionBlock, LoadingState, ErrorState, EmptyState } from '../../components';
import apiClient from '../../api/client';
import { Event, EventCustomQuestion, TicketType } from '../../types';
import { BookingService } from '../../api/services';
import { safeString } from '../../utils/safeText';
import { safeArray } from '../../utils/safeData';

type TicketSelectionNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'TicketSelection'>;
type TicketSelectionRouteProp = RouteProp<AttendeeHomeStackParamList, 'TicketSelection'>;

interface Props { navigation: TicketSelectionNavigationProp; route: TicketSelectionRouteProp; }

const CHOICE_TYPES = new Set(['choice', 'dropdown', 'radio', 'checkbox', 'multiple_choice']);

const normalizeQuestionOptions = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const options: string[] = [];
  for (const item of raw) {
    const value = typeof item === 'string' ? item.trim() : String(item || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(value);
  }

  return options;
};

export const TicketSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAnswerMap, setCustomAnswerMap] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { fetchTickets(); }, [eventId]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!eventId) return;
      const [eventRes, ticketRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`),
      ]);
      const eventData = (eventRes?.data?.data?.event as Event) || null;
      setEvent(eventData);
      const eventTickets = safeArray<TicketType>(ticketRes?.data?.data?.tickets);
      setTickets(eventTickets.filter((ticket) => Boolean(ticket?.isActive)));
      if (eventData?.pricingMode === 'free') {
        const firstFree = eventTickets.find((ticket) => ticket.isActive && ticket.isFree);
        setSelectedTicket(firstFree || null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const registrationQuestions = useMemo(() => {
    if (!event) return [] as EventCustomQuestion[];
    const fromRegistrationFields = safeArray<EventCustomQuestion>(event.registrationFields?.customQuestions);
    const fromCustomQuestions = safeArray<EventCustomQuestion>(event.customQuestions);
    const questions = fromRegistrationFields.length > 0 ? fromRegistrationFields : fromCustomQuestions;
    return questions.map((question) => ({
      ...question,
      options: normalizeQuestionOptions(question.options),
    }));
  }, [event]);

  const requiredQuestionIds = useMemo(
    () => new Set(registrationQuestions.filter((question) => question.required).map((question) => question.id)),
    [registrationQuestions],
  );

  const isFreeEvent = safeString(event?.pricingMode, 'ticketed') === 'free';
  const availableTicketOptions = tickets.filter((ticket) => ticket.isActive);
  const selectablePaidTickets = availableTicketOptions.filter((ticket) => (ticket.quantity - ticket.soldCount) > 0);

  const validateAnswers = () => {
    const errors: Record<string, string> = {};
    for (const question of registrationQuestions) {
      const answer = (customAnswerMap[question.id] || '').trim();
      if (requiredQuestionIds.has(question.id) && !answer) {
        errors[`q_${question.id}`] = 'This field is required';
        continue;
      }

      const type = safeString(question.type, 'text').toLowerCase();
      if (!answer) continue;

      if (CHOICE_TYPES.has(type)) {
        const options = normalizeQuestionOptions(question.options);
        const optionSet = new Set(options.map((option) => option.toLowerCase()));
        if (type === 'checkbox' || type === 'multiple_choice') {
          const values = answer.split(',').map((item) => item.trim()).filter(Boolean).map((item) => item.toLowerCase());
          if (!values.length || values.some((value) => !optionSet.has(value))) {
            errors[`q_${question.id}`] = 'Please select a valid option.';
          }
        } else if (!optionSet.has(answer.toLowerCase())) {
          errors[`q_${question.id}`] = 'Please select a valid option.';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAnswersOrNotify = () => {
    const isValid = validateAnswers();
    if (!isValid) {
      Alert.alert('Registration Form Incomplete', 'Please complete the registration form.');
    }
    return isValid;
  };

  const getCustomAnswersPayload = () => (
    registrationQuestions
      .map((question) => ({
        questionId: question.id,
        answer: (customAnswerMap[question.id] || '').trim(),
      }))
      .filter((answer) => answer.answer.length > 0)
  );

  const createFreeBooking = async () => {
    if (!eventId || !event) return;
    if (!validateAnswersOrNotify()) return;

    try {
      setIsBooking(true);
      const payload = {
        eventId,
        quantity: 1,
        customAnswers: getCustomAnswersPayload(),
        allowWaitlist: false,
        ...(selectedTicket?.id ? { ticketTypeId: selectedTicket.id } : {}),
      };
      const response = await BookingService.createBooking(payload);
      navigation.replace('BookingConfirmation', { bookingId: response.data.booking.id });
    } catch (err: any) {
      Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Registration Failed', err?.response?.data?.message || 'Unable to register.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleContinue = async () => {
    Keyboard.dismiss();
    if (!eventId || !event) return;

    if (isFreeEvent) {
      await createFreeBooking();
      return;
    }

    if (!selectedTicket) {
      Alert.alert('Ticket Required', 'Please select a ticket.');
      return;
    }

    if (!validateAnswersOrNotify()) {
      return;
    }

    navigation.navigate('PaymentSummary', {
      eventId,
      ticketTypeId: selectedTicket.id,
      quantity,
      ticketName: selectedTicket.name,
      currency: selectedTicket.currency,
      unitPrice: selectedTicket.price,
      customAnswers: getCustomAnswersPayload(),
    });
  };

  if (isLoading) return <LoadingState />;
  if (error || !eventId || !event) {
    return (
      <View style={styles.root}>
        <HeaderBar />
        <ErrorState message={error || 'Failed to load event details'} onRetry={fetchTickets} />
      </View>
    );
  }

  const isTicketedUnavailable = !isFreeEvent && selectablePaidTickets.length === 0;

  return (
    <View style={styles.root}>
      <HeaderBar variant="back" title={isFreeEvent ? 'Free Registration' : 'Select Ticket'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {!isFreeEvent ? (
          <SectionBlock title="Tickets">
            {availableTicketOptions.length === 0 ? (
              <EmptyState
                title="No Tickets Available"
                message="This event does not currently have any active tickets."
              />
            ) : availableTicketOptions.map((ticket, index) => {
              const remaining = Math.max(0, ticket.quantity - ticket.soldCount);
              const soldOut = remaining <= 0;
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <TouchableOpacity
                  key={safeString(ticket.id, `ticket-${index}`)}
                  onPress={() => { if (!soldOut) setSelectedTicket(ticket); }}
                  activeOpacity={0.8}
                  style={[styles.ticketWrap, soldOut && styles.ticketWrapDisabled]}
                >
                  <GlassCard variant={isSelected ? 'light' : 'dark'} style={[styles.ticketCard, isSelected && styles.ticketCardSelected, soldOut && styles.ticketCardDisabled]}>
                    <View style={styles.ticketTopRow}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      <Text style={styles.ticketPrice}>{ticket.isFree ? 'Free' : `${ticket.currency} ${ticket.price}`}</Text>
                    </View>
                    <Text style={styles.ticketMeta}>{soldOut ? 'Sold Out' : `Remaining: ${remaining}`}</Text>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </SectionBlock>
        ) : (
          <SectionBlock title="Registration">
            <GlassCard variant="dark" style={styles.formCard}>
              <Text style={styles.freeInfoText}>
                {registrationQuestions.length > 0
                  ? 'Complete the registration form below.'
                  : 'This is a free event. Confirm to complete your registration.'}
              </Text>
            </GlassCard>
          </SectionBlock>
        )}

        {registrationQuestions.length > 0 && (
          <SectionBlock title="Additional Information">
            <GlassCard variant="dark" style={styles.formCard}>
              {registrationQuestions.map((question, index) => {
                const questionType = safeString(question.type, 'text').toLowerCase();
                const value = customAnswerMap[question.id] || '';
                const options = normalizeQuestionOptions(question.options);

                if (CHOICE_TYPES.has(questionType) && options.length > 0) {
                  const isMultiSelect = questionType === 'checkbox' || questionType === 'multiple_choice';
                  const selectedValues = value.split(',').map((item) => item.trim()).filter(Boolean);

                  return (
                    <View key={safeString(question.id, `question-${index}`)} style={styles.choiceQuestionWrap}>
                      <Text style={styles.choiceQuestionLabel}>{question.question}{question.required ? ' *' : ''}</Text>
                      <View style={styles.choiceOptionsRow}>
                        {options.map((option, optionIndex) => {
                          const isSelected = isMultiSelect
                            ? selectedValues.some((selected) => selected.toLowerCase() === option.toLowerCase())
                            : value.trim().toLowerCase() === option.toLowerCase();
                          return (
                            <TouchableOpacity
                              key={`${question.id}-${optionIndex}`}
                              style={[styles.choiceChip, isSelected && styles.choiceChipSelected]}
                              onPress={() => {
                                if (isMultiSelect) {
                                  const nextValues = isSelected
                                    ? selectedValues.filter((selected) => selected.toLowerCase() !== option.toLowerCase())
                                    : [...selectedValues, option];
                                  setCustomAnswerMap((previous) => ({ ...previous, [question.id]: nextValues.join(', ') }));
                                } else {
                                  setCustomAnswerMap((previous) => ({ ...previous, [question.id]: option }));
                                }
                                setFormErrors((previous) => ({ ...previous, [`q_${question.id}`]: '' }));
                              }}
                            >
                              <Text style={[styles.choiceChipText, isSelected && styles.choiceChipTextSelected]}>{option}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {formErrors[`q_${question.id}`] ? <Text style={styles.choiceErrorText}>{formErrors[`q_${question.id}`]}</Text> : null}
                    </View>
                  );
                }

                return (
                  <InputField
                    key={safeString(question.id, `question-${index}`)}
                    label={`${question.question}${question.required ? ' *' : ''}`}
                    value={value}
                    onChangeText={(inputValue) => {
                      setCustomAnswerMap((previous) => ({ ...previous, [question.id]: inputValue }));
                      setFormErrors((previous) => ({ ...previous, [`q_${question.id}`]: '' }));
                    }}
                    placeholder={question.type === 'number' ? 'Enter a number' : 'Your answer'}
                    keyboardType={question.type === 'number' ? 'numeric' : 'default'}
                    error={formErrors[`q_${question.id}`]}
                  />
                );
              })}
            </GlassCard>
          </SectionBlock>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={isFreeEvent ? 'Register Free' : (selectedTicket ? `Continue (${quantity})` : 'Select a ticket')}
          onPress={handleContinue}
          disabled={isBooking || (isFreeEvent ? false : (!selectedTicket || isTicketedUnavailable))}
          isLoading={isBooking}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 120, paddingTop: 20 },
  ticketWrap: { marginBottom: 12 },
  ticketWrapDisabled: { opacity: 0.6 },
  ticketCard: { padding: 20 },
  ticketCardSelected: { borderColor: '#FFFFFF', borderWidth: 2 },
  ticketCardDisabled: { borderColor: 'rgba(255,255,255,0.08)' },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  ticketPrice: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  ticketMeta: { color: '#A3A3A3', fontSize: 14 },
  formCard: { padding: 20 },
  freeInfoText: { color: '#CFCFCF', fontSize: 14, lineHeight: 20 },
  choiceQuestionWrap: { marginBottom: 16 },
  choiceQuestionLabel: { color: '#A3A3A3', fontSize: 14, marginBottom: 8, marginLeft: 2 },
  choiceOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  choiceChipText: { color: '#CFCFCF', fontSize: 13, fontWeight: '600' },
  choiceChipTextSelected: { color: '#FFFFFF' },
  choiceErrorText: { color: '#FA5252', fontSize: 12, marginTop: 6, marginLeft: 2 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
});
