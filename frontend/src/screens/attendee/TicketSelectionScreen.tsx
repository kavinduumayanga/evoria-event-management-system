import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { HeaderBar, PrimaryButton, InputField, GlassCard, SectionBlock, LoadingState, ErrorState } from '../../components';
import apiClient from '../../api/client';
import { Event, EventCustomQuestion, TicketType } from '../../types';
import { BookingService, TicketService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { safeStatus, safeString, safeTitle } from '../../utils/safeText';

type TicketSelectionNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'TicketSelection'>;
type TicketSelectionRouteProp = RouteProp<AttendeeHomeStackParamList, 'TicketSelection'>;

interface Props { navigation: TicketSelectionNavigationProp; route: TicketSelectionRouteProp; }

export const TicketSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const currentUser = useAuthStore((state) => state.user);

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAnswerMap, setCustomAnswerMap] = useState<Record<string, string>>({});

  useEffect(() => { fetchTickets(); }, [eventId]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true); setError(null);
      if (!eventId) return;
      const [eventRes, ticketRes] = await Promise.all([ apiClient.get(`/events/${eventId}`), apiClient.get(`/tickets/event/${eventId}`) ]);
      setEvent(eventRes.data.data.event);
      setTickets(ticketRes.data.data.tickets.filter((t: TicketType) => t.isActive));
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to fetch tickets'); } finally { setIsLoading(false); }
  };

  const handleContinue = async () => {
    if (!selectedTicket || !event) return;
    try {
      setIsBooking(true);
      const customAnswers = event.customQuestions?.map(q => ({ questionId: q.id, answer: customAnswerMap[q.id] || '' })) || [];
      if (selectedTicket.isFree) {
        const res = await BookingService.createBooking({ eventId, ticketTypeId: selectedTicket.id, quantity, customAnswers, allowWaitlist: false });
        navigation.navigate('BookingConfirmation', { bookingId: res.data.booking.id });
      } else {
        navigation.navigate('PaymentSummary', { eventId, ticketTypeId: selectedTicket.id, quantity, ticketName: selectedTicket.name, currency: selectedTicket.currency, unitPrice: selectedTicket.price, customAnswers });
      }
    } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Booking failed'); } finally { setIsBooking(false); }
  };

  if (isLoading) return <LoadingState />;
  if (error || !eventId) return <View style={styles.root}><HeaderBar /><ErrorState message={error || 'Error'} onRetry={fetchTickets} /></View>;

  return (
    <View style={styles.root}>
      <HeaderBar variant="back" title="Select Ticket" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <SectionBlock title="Tickets">
          {tickets.map(ticket => {
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <TouchableOpacity key={ticket.id} onPress={() => setSelectedTicket(ticket)} activeOpacity={0.8} style={styles.ticketWrap}>
                <GlassCard variant={isSelected ? 'light' : 'dark'} style={[styles.ticketCard, isSelected && styles.ticketCardSelected]}>
                  <View style={styles.ticketTopRow}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text style={styles.ticketPrice}>{ticket.isFree ? 'Free' : `${ticket.currency} ${ticket.price}`}</Text>
                  </View>
                  <Text style={styles.ticketMeta}>Remaining: {ticket.quantity - ticket.soldCount}</Text>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </SectionBlock>

        {event?.customQuestions && event.customQuestions.length > 0 && (
          <SectionBlock title="Additional Information">
            <GlassCard variant="dark" style={styles.formCard}>
              {event.customQuestions.map(q => (
                <InputField
                  key={q.id}
                  label={q.question}
                  value={customAnswerMap[q.id] || ''}
                  onChangeText={(val) => setCustomAnswerMap(prev => ({...prev, [q.id]: val}))}
                  placeholder="Your answer"
                />
              ))}
            </GlassCard>
          </SectionBlock>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          title={selectedTicket ? `Continue (${quantity})` : 'Select a ticket'}
          onPress={handleContinue}
          disabled={!selectedTicket || isBooking}
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
  ticketCard: { padding: 20 },
  ticketCardSelected: { borderColor: '#FFFFFF', borderWidth: 2 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  ticketPrice: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  ticketMeta: { color: '#A3A3A3', fontSize: 14 },
  formCard: { padding: 20 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
});
