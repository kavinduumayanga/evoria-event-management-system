import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { GradientBackground, PrimaryButton, SecondaryButton, GlassCard, LoadingState, FormInput } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { Event, TicketType } from '../../types';
import { ArrowLeft } from 'lucide-react-native';
import { BookingService, TicketService } from '../../api/services';

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

export const TicketSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;

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

  useEffect(() => {
    fetchTickets();
  }, [eventId]);

  useEffect(() => {
    // quantity or ticket change invalidates previous preview
    setPromoPreview(null);
  }, [quantity, selectedTicket?.id]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [eventRes, ticketRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`),
      ]);

      const eventData: Event = eventRes.data.data.event;
      setEvent(eventData);

      if (eventData.status !== 'published' || eventData.visibility === 'private') {
        setTickets([]);
        setError('This event is currently unavailable for booking.');
        return;
      }

      setTickets(ticketRes.data.data.tickets.filter((ticket: TicketType) => ticket.isActive));
    } catch (fetchError: any) {
      setError(fetchError.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const remainingForSelected = useMemo(() => {
    if (!selectedTicket) return 0;
    return Math.max(0, selectedTicket.quantity - selectedTicket.soldCount);
  }, [selectedTicket]);

  const isEventFull = Boolean(event && event.bookingCount >= event.capacity);
  const isFreeEventMode = (event?.pricingMode || 'ticketed') === 'free';

  const applyPromoCode = async () => {
    if (!selectedTicket) return;
    if (!promoCode.trim()) {
      Alert.alert('Promo Code', 'Enter a promo code first.');
      return;
    }

    try {
      setIsApplyingPromo(true);
      const response = await TicketService.applyPromo({
        ticketTypeId: selectedTicket.id,
        quantity,
        promoCode: promoCode.trim(),
        unlockCode: unlockCode.trim() || undefined,
      });

      setPromoPreview(response.data);
    } catch (applyError: any) {
      setPromoPreview(null);
      Alert.alert('Promo Error', applyError.response?.data?.message || 'Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleFreeRegister = async () => {
    if (!event) return;

    try {
      setIsBooking(true);
      const response = await BookingService.createBooking({
        eventId,
        quantity: 1,
      });

      const booking = response?.data?.booking;
      if (!booking?.id) {
        Alert.alert('Registered', 'Free event registration submitted.');
        return;
      }

      if (booking.isWaitlisted) {
        Alert.alert(
          'Added to Waitlist',
          booking.waitlistPosition
            ? `Event full - you are now #${booking.waitlistPosition} on the waitlist.`
            : 'Event full - you were added to waitlist.',
        );
      } else {
        Alert.alert('Registered', 'Free event registration confirmed.');
      }

      navigation.navigate('BookingConfirmation', { bookingId: booking.id });
    } catch (registrationError: any) {
      const message = registrationError?.response?.data?.message || 'Unable to register for this free event.';
      if (registrationError?.response?.status === 409) {
        Alert.alert('Already Registered', message);
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedTicket || !event) return;

    if (event.status !== 'published' || event.visibility === 'private') {
      Alert.alert('Booking Blocked', 'This event is currently unavailable for booking.');
      return;
    }

    if (!isEventFull && remainingForSelected <= 0) {
      Alert.alert('Sold Out', 'This ticket is sold out.');
      return;
    }

    if (quantity > selectedTicket.maxPerUser) {
      Alert.alert('Limit Exceeded', `You can only book up to ${selectedTicket.maxPerUser} tickets.`);
      return;
    }

    if (isEventFull) {
      try {
        setIsBooking(true);
        const response = await BookingService.createBooking({
          eventId,
          ticketTypeId: selectedTicket.id,
          quantity,
          unlockCode: unlockCode.trim() || undefined,
        });

        const waitlistPosition = response.data?.booking?.waitlistPosition;
        Alert.alert(
          'Added to Waitlist',
          waitlistPosition ? `Event full - you are now #${waitlistPosition} on the waitlist.` : 'Event full - you were added to waitlist.',
        );
        navigation.navigate('BookingConfirmation', { bookingId: response.data.booking.id });
      } catch (waitlistError: any) {
        const message = waitlistError?.response?.data?.message || 'Unable to join waitlist';
        if (waitlistError?.response?.status === 409) {
          Alert.alert('Already Registered', message);
        } else {
          Alert.alert('Waitlist Failed', message);
        }
      } finally {
        setIsBooking(false);
      }
      return;
    }

    if (selectedTicket.isFree) {
      try {
        setIsBooking(true);
        const response = await BookingService.createBooking({
          eventId,
          ticketTypeId: selectedTicket.id,
          quantity,
          unlockCode: unlockCode.trim() || undefined,
        });
        navigation.navigate('BookingConfirmation', { bookingId: response.data.booking.id });
      } catch (bookingError: any) {
        const message = bookingError?.response?.data?.message || 'Unable to confirm booking';
        if (bookingError?.response?.status === 409) {
          Alert.alert('Already Registered', message);
        } else {
          Alert.alert('Booking Failed', message);
        }
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
      ticketName: selectedTicket.name,
      currency: selectedTicket.currency || 'LKR',
      unitPrice: selectedTicket.price,
    });
  };

  if (isLoading) return <LoadingState />;

  if (isFreeEventMode) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Free Registration</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {error && <Text style={styles.errorText}>{error}</Text>}
            <GlassCard style={styles.ticketCard} variant="dark">
              <Text style={styles.ticketName}>{event?.title || 'Event'}</Text>
              <Text style={styles.ticketPrice}>This event is free to attend.</Text>
              <Text style={styles.ticketMeta}>Capacity: {event?.capacity || 0}</Text>
              <Text style={styles.ticketMeta}>Booked: {event?.bookingCount || 0}</Text>
            </GlassCard>

            {isEventFull && (
              <Text style={styles.waitlistMessage}>
                Event full - register to join the waitlist.
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              title={isEventFull ? 'Join Waitlist' : 'Register'}
              onPress={handleFreeRegister}
              isLoading={isBooking}
              disabled={Boolean(error)}
            />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Ticket</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && <Text style={styles.errorText}>{error}</Text>}

        {tickets.map((ticket) => {
          const available = Math.max(0, ticket.quantity - ticket.soldCount);
          const isSelected = selectedTicket?.id === ticket.id;

            return (
              <TouchableOpacity key={ticket.id} onPress={() => setSelectedTicket(ticket)} disabled={available === 0 && !isEventFull}>
                <GlassCard style={[styles.ticketCard, isSelected && styles.selectedCard]} variant={isSelected ? 'primary' : 'dark'}>
                  <View style={styles.ticketTopRow}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <View style={[styles.badge, { backgroundColor: ticket.isFree ? `${theme.colors.success}20` : `${theme.colors.secondary}20` }]}>
                      <Text style={[styles.badgeText, { color: ticket.isFree ? theme.colors.success : theme.colors.secondary }]}>
                        {ticket.isFree ? 'FREE' : 'PAID'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketPrice}>
                    {ticket.isFree ? 'Free' : `${ticket.currency || 'LKR'} ${ticket.price.toFixed(2)}`}
                  </Text>
                  <Text style={styles.ticketMeta}>Remaining: {available}</Text>
                  <Text style={styles.ticketMeta}>Max per user: {ticket.maxPerUser}</Text>
                  {available === 0 && <Text style={styles.soldOutText}>{isEventFull ? 'Sold Out (waitlist available)' : 'Sold Out'}</Text>}
                </GlassCard>
              </TouchableOpacity>
            );
          })}

          {isEventFull && (
            <Text style={styles.waitlistMessage}>
              Event full - continue to join the waitlist. We will promote bookings in FIFO order when seats open.
            </Text>
          )}

          {selectedTicket && (
            <>
              {selectedTicket.unlockCode && (
                <FormInput
                  label="Unlock Code (Required)"
                  value={unlockCode}
                  onChangeText={setUnlockCode}
                  placeholder="Enter unlock code"
                />
              )}

              {!selectedTicket.isFree && !isEventFull && (
                <>
                  <FormInput
                    label="Promo Code"
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter promo code"
                    autoCapitalize="characters"
                  />
                  <SecondaryButton
                    title="Apply Promo"
                    onPress={applyPromoCode}
                    isLoading={isApplyingPromo}
                  />
                </>
              )}

              {promoPreview && (
                <GlassCard style={styles.promoResult} variant="primary">
                  <Text style={styles.promoText}>
                    Discount Applied: {promoPreview.currency} {promoPreview.discountAmount.toFixed(2)}
                  </Text>
                  <Text style={styles.promoText}>
                    Final Amount: {promoPreview.currency} {promoPreview.finalAmount.toFixed(2)}
                  </Text>
                </GlassCard>
              )}
            </>
          )}
        </ScrollView>

        {selectedTicket && !error && (
          <View style={styles.footer}>
            <View style={styles.quantityContainer}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantity}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => {
                const maxQuantity = isEventFull
                  ? selectedTicket.maxPerUser
                  : Math.min(selectedTicket.maxPerUser, remainingForSelected);
                setQuantity(Math.min(maxQuantity, quantity + 1));
              }}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <PrimaryButton
              title={isEventFull ? 'Join Waitlist' : (selectedTicket.isFree ? 'Book Free Ticket' : 'Continue to Payment')}
              onPress={handleContinue}
              isLoading={isBooking}
              disabled={!isEventFull && remainingForSelected === 0}
            />
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
  content: { padding: theme.spacing.m, paddingBottom: theme.spacing.xl },
  ticketCard: { marginBottom: theme.spacing.m },
  selectedCard: { borderColor: theme.colors.primary },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketName: { ...theme.typography.h3, color: theme.colors.text },
  ticketPrice: { ...theme.typography.body, color: theme.colors.primaryLight, marginTop: 4, fontWeight: 'bold' },
  ticketMeta: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  soldOutText: { ...theme.typography.caption, color: theme.colors.error, marginTop: 6, fontWeight: '700' },
  badge: {
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 4,
  },
  badgeText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  promoResult: {
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  promoText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 2,
    fontWeight: '600'
  },
  footer: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glassBorder,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
    gap: theme.spacing.xl,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.glass,
  },
  qtyBtnText: {
    ...theme.typography.h2,
    color: theme.colors.text,
    lineHeight: 28,
  },
  quantity: { ...theme.typography.h2, color: theme.colors.text, minWidth: 30, textAlign: 'center' },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.m,
  },
  waitlistMessage: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginBottom: theme.spacing.m,
  },
});
