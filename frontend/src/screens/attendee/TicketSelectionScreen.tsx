import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { GradientBackground, Button, GlassCard, LoadingState, Input } from '../../components';
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
        Alert.alert('Waitlist Failed', waitlistError.response?.data?.message || 'Unable to join waitlist');
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
        Alert.alert('Booking Failed', bookingError.response?.data?.message || 'Unable to confirm booking');
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Ticket</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {error && <Text style={styles.errorText}>{error}</Text>}

        {tickets.map((ticket) => {
          const available = Math.max(0, ticket.quantity - ticket.soldCount);
          const isSelected = selectedTicket?.id === ticket.id;

            return (
              <TouchableOpacity key={ticket.id} onPress={() => setSelectedTicket(ticket)} disabled={available === 0 && !isEventFull}>
                <GlassCard style={[styles.ticketCard, isSelected && styles.selectedCard]} variant={isSelected ? 'neon' : 'dark'}>
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
                <Input
                  label="Unlock Code (Required)"
                  value={unlockCode}
                  onChangeText={setUnlockCode}
                  placeholder="Enter unlock code"
                />
              )}

              {!selectedTicket.isFree && !isEventFull && (
                <>
                  <Input
                    label="Promo Code"
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter promo code"
                    autoCapitalize="characters"
                  />
                  <Button
                    title="Apply Promo"
                    onPress={applyPromoCode}
                    isLoading={isApplyingPromo}
                    variant="outline"
                  />
                </>
              )}

              {promoPreview && (
                <View style={styles.promoResult}>
                  <Text style={styles.promoText}>
                    Discount Applied: {promoPreview.currency} {promoPreview.discountAmount.toFixed(2)}
                  </Text>
                  <Text style={styles.promoText}>
                    Final Amount: {promoPreview.currency} {promoPreview.finalAmount.toFixed(2)}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {selectedTicket && !error && (
          <View style={styles.footer}>
            <View style={styles.quantityContainer}>
              <Button title="-" size="small" variant="outline" onPress={() => setQuantity(Math.max(1, quantity - 1))} />
              <Text style={styles.quantity}>{quantity}</Text>
              <Button
                title="+"
                size="small"
                variant="outline"
                onPress={() => {
                  const maxQuantity = isEventFull
                    ? selectedTicket.maxPerUser
                    : Math.min(selectedTicket.maxPerUser, remainingForSelected);
                  setQuantity(Math.min(maxQuantity, quantity + 1));
                }}
              />
            </View>
            <Button
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
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promoText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    marginBottom: 2,
  },
  footer: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.surfaceLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
    gap: theme.spacing.m,
  },
  quantity: { ...theme.typography.h2, color: theme.colors.text },
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
