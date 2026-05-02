import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { ScreenContainer, Card, Button, LoadingState, Input, StatusBadge, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { Event, TicketType } from '../../types';
import { ArrowLeft, Tag, Minus, Plus, AlertTriangle } from 'lucide-react-native';
import { BookingService, TicketService } from '../../api/services';

type TicketSelectionNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'TicketSelection'>;
type TicketSelectionRouteProp = RouteProp<AttendeeHomeStackParamList, 'TicketSelection'>;
interface Props { navigation: TicketSelectionNavigationProp; route: TicketSelectionRouteProp; }

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

  useEffect(() => { fetchTickets(); }, [eventId]);
  useEffect(() => { setPromoPreview(null); }, [quantity, selectedTicket?.id]);

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
      setTickets(ticketRes.data.data.tickets.filter((t: TicketType) => t.isActive));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
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
    if (!promoCode.trim()) { Alert.alert('Promo Code', 'Enter a promo code first.'); return; }
    try {
      setIsApplyingPromo(true);
      const res = await TicketService.applyPromo({ ticketTypeId: selectedTicket.id, quantity, promoCode: promoCode.trim(), unlockCode: unlockCode.trim() || undefined });
      setPromoPreview(res.data);
    } catch (err: any) {
      setPromoPreview(null);
      Alert.alert('Promo Error', err.response?.data?.message || 'Failed to apply promo code');
    } finally { setIsApplyingPromo(false); }
  };

  const handleFreeRegister = async () => {
    if (!event) return;
    try {
      setIsBooking(true);
      const res = await BookingService.createBooking({ eventId, quantity: 1 });
      const booking = res?.data?.booking;
      if (!booking?.id) { Alert.alert('Registered', 'Free event registration submitted.'); return; }
      if (booking.isWaitlisted) {
        Alert.alert('Added to Waitlist', booking.waitlistPosition ? `Event full - you are now #${booking.waitlistPosition} on the waitlist.` : 'Event full - you were added to waitlist.');
      } else { Alert.alert('Registered', 'Free event registration confirmed.'); }
      navigation.navigate('BookingConfirmation', { bookingId: booking.id });
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to register for this free event.';
      Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Registration Failed', msg);
    } finally { setIsBooking(false); }
  };

  const handleContinue = async () => {
    if (!selectedTicket || !event) return;
    if (event.status !== 'published' || event.visibility === 'private') { Alert.alert('Booking Blocked', 'This event is currently unavailable for booking.'); return; }
    if (!isEventFull && remainingForSelected <= 0) { Alert.alert('Sold Out', 'This ticket is sold out.'); return; }
    if (quantity > selectedTicket.maxPerUser) { Alert.alert('Limit Exceeded', `You can only book up to ${selectedTicket.maxPerUser} tickets.`); return; }

    if (isEventFull) {
      try {
        setIsBooking(true);
        const res = await BookingService.createBooking({ eventId, ticketTypeId: selectedTicket.id, quantity, unlockCode: unlockCode.trim() || undefined });
        const pos = res.data?.booking?.waitlistPosition;
        Alert.alert('Added to Waitlist', pos ? `Event full - you are now #${pos} on the waitlist.` : 'Event full - you were added to waitlist.');
        navigation.navigate('BookingConfirmation', { bookingId: res.data.booking.id });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Unable to join waitlist';
        Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Waitlist Failed', msg);
      } finally { setIsBooking(false); }
      return;
    }

    if (selectedTicket.isFree) {
      try {
        setIsBooking(true);
        const res = await BookingService.createBooking({ eventId, ticketTypeId: selectedTicket.id, quantity, unlockCode: unlockCode.trim() || undefined });
        navigation.navigate('BookingConfirmation', { bookingId: res.data.booking.id });
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Unable to confirm booking';
        Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Booking Failed', msg);
      } finally { setIsBooking(false); }
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

  // ─── FREE EVENT MODE ──────────────────────────────────────────────────────
  if (isFreeEventMode) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <IconButton icon={<ArrowLeft size={20} color={theme.colors.text} />} onPress={() => navigation.goBack()} variant="surface" size={36} />
          <Text style={styles.headerTitle}>Free Registration</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Card variant="primary" style={styles.eventCard} noPadding>
            <View style={styles.cardInner}>
              <Text style={styles.eventTitle}>{event?.title || 'Event'}</Text>
              <Text style={styles.freeLabel}>Free to attend</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Capacity: {event?.capacity || 0}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>Booked: {event?.bookingCount || 0}</Text>
              </View>
              {isEventFull && (
                <View style={styles.fullBanner}>
                  <AlertTriangle size={14} color={theme.colors.warning} />
                  <Text style={styles.fullText}>Event full — register to join the waitlist</Text>
                </View>
              )}
            </View>
          </Card>
        </ScrollView>
        <View style={styles.footer}>
          <Button title={isEventFull ? 'Join Waitlist' : 'Register Free'} onPress={handleFreeRegister} isLoading={isBooking} disabled={Boolean(error)} variant="primary" size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  // ─── TICKETED MODE ────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft size={20} color={theme.colors.text} />} onPress={() => navigation.goBack()} variant="surface" size={36} />
        <Text style={styles.headerTitle}>Select Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {isEventFull && (
          <View style={styles.waitlistBanner}>
            <AlertTriangle size={14} color={theme.colors.warning} />
            <Text style={styles.waitlistText}>Event full — continue to join the waitlist (FIFO)</Text>
          </View>
        )}

        {/* Ticket list */}
        {tickets.map((ticket) => {
          const available = Math.max(0, ticket.quantity - ticket.soldCount);
          const isSelected = selectedTicket?.id === ticket.id;
          const isSoldOut = available === 0 && !isEventFull;
          return (
            <TouchableOpacity key={ticket.id} onPress={() => setSelectedTicket(ticket)} disabled={isSoldOut} activeOpacity={0.8}>
              <Card
                variant={isSelected ? 'primary' : 'raised'}
                style={[styles.ticketCard, isSelected && styles.ticketCardSelected]}
                noPadding
              >
                <View style={styles.ticketInner}>
                  <View style={styles.ticketTopRow}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <StatusBadge status={ticket.isFree ? 'success' : 'info'} label={ticket.isFree ? 'Free' : 'Paid'} />
                  </View>
                  <Text style={styles.ticketPrice}>
                    {ticket.isFree ? 'Free' : `${ticket.currency || 'LKR'} ${ticket.price.toFixed(2)}`}
                  </Text>
                  <View style={styles.ticketMetaRow}>
                    <Text style={styles.ticketMeta}>Remaining: {available}</Text>
                    <Text style={styles.ticketMetaDot}>·</Text>
                    <Text style={styles.ticketMeta}>Max/person: {ticket.maxPerUser}</Text>
                  </View>
                  {isSoldOut && <Text style={styles.soldOutText}>Sold Out</Text>}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Unlock + Promo codes */}
        {selectedTicket && (
          <View style={styles.codesSection}>
            {selectedTicket.unlockCode && (
              <Input
                label="Unlock Code (required)"
                value={unlockCode}
                onChangeText={setUnlockCode}
                placeholder="Enter unlock code"
              />
            )}
            {!selectedTicket.isFree && !isEventFull && (
              <View style={styles.promoRow}>
                <Input
                  label="Promo code"
                  value={promoCode}
                  onChangeText={(v) => { setPromoCode(v); setPromoPreview(null); }}
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
            )}
            {promoPreview && (
              <Card variant="primary" style={styles.promoResult} noPadding>
                <View style={styles.promoResultInner}>
                  <Text style={styles.promoSaving}>✓ Saving {promoPreview.currency} {promoPreview.discountAmount.toFixed(2)}</Text>
                  <Text style={styles.promoFinal}>Final: {promoPreview.currency} {promoPreview.finalAmount.toFixed(2)}</Text>
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer: qty + CTA */}
      {selectedTicket && !error && (
        <View style={styles.footer}>
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={16} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => {
                const max = isEventFull ? selectedTicket.maxPerUser : Math.min(selectedTicket.maxPerUser, remainingForSelected);
                setQuantity(Math.min(max, quantity + 1));
              }}>
                <Plus size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <Button
            title={isEventFull ? 'Join Waitlist' : (selectedTicket.isFree ? 'Book Free Ticket' : 'Continue to Payment')}
            onPress={handleContinue}
            isLoading={isBooking}
            disabled={!isEventFull && remainingForSelected === 0}
            variant="primary"
            size="lg"
          />
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m, paddingHorizontal: theme.spacing.base, paddingTop: theme.spacing.xl, marginBottom: theme.spacing.m },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text },
  content: { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.xl },
  errorText: { ...theme.typography.body, color: theme.colors.error, marginBottom: theme.spacing.m },
  waitlistBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s, backgroundColor: theme.colors.warningSubtle, borderRadius: theme.borderRadius.m, padding: theme.spacing.m, marginBottom: theme.spacing.m },
  waitlistText: { ...theme.typography.caption, color: theme.colors.warning, flex: 1 },
  eventCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden', marginBottom: theme.spacing.xl },
  cardInner: { padding: theme.spacing.xl },
  eventTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 4 },
  freeLabel: { ...theme.typography.body, color: theme.colors.success, fontWeight: '600', marginBottom: theme.spacing.m },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  metaDot: { ...theme.typography.caption, color: theme.colors.textMuted },
  fullBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s, marginTop: theme.spacing.m },
  fullText: { ...theme.typography.caption, color: theme.colors.warning },
  ticketCard: { borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  ticketCardSelected: { borderColor: theme.colors.primary },
  ticketInner: { padding: theme.spacing.m },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ticketName: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1, marginRight: theme.spacing.s },
  ticketPrice: { ...theme.typography.h3, color: theme.colors.primary, marginBottom: 6 },
  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ticketMeta: { ...theme.typography.caption, color: theme.colors.textMuted },
  ticketMetaDot: { ...theme.typography.caption, color: theme.colors.textMuted },
  soldOutText: { ...theme.typography.caption, color: theme.colors.error, fontWeight: '700', marginTop: 4 },
  codesSection: { marginTop: theme.spacing.m, gap: theme.spacing.s },
  promoRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.s },
  promoInput: { flex: 1, marginBottom: 0 },
  applyBtn: { marginBottom: 0, flexShrink: 0 },
  promoResult: { borderRadius: theme.borderRadius.m, overflow: 'hidden', marginTop: theme.spacing.xs },
  promoResultInner: { padding: theme.spacing.m },
  promoSaving: { ...theme.typography.caption, color: theme.colors.success, fontWeight: '600' },
  promoFinal: { ...theme.typography.bodyMedium, color: theme.colors.text },
  footer: { paddingHorizontal: theme.spacing.base, paddingVertical: theme.spacing.l, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, gap: theme.spacing.m },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyLabel: { ...theme.typography.bodyMedium, color: theme.colors.text },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xl },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface },
  qtyNum: { ...theme.typography.h3, color: theme.colors.text, minWidth: 28, textAlign: 'center' },
});
