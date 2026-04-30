import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { GradientBackground, Button, GlassCard, LoadingState } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { Event, TicketType } from '../../types';
import { ArrowLeft } from 'lucide-react-native';

type TicketSelectionNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'TicketSelection'>;
type TicketSelectionRouteProp = RouteProp<AttendeeHomeStackParamList, 'TicketSelection'>;

interface Props {
  navigation: TicketSelectionNavigationProp;
  route: TicketSelectionRouteProp;
}

export const TicketSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [eventId]);

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
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedTicket || !event || event.status !== 'published' || event.visibility === 'private') {
      return;
    }
    try {
      setIsBooking(true);
      const res = await apiClient.post('/bookings', {
        eventId,
        ticketTypeId: selectedTicket.id,
        quantity,
      });
      navigation.navigate('BookingConfirmation', { bookingId: res.data.data.booking.id });
    } catch (error: any) {
      Alert.alert('Booking Failed', error.response?.data?.message || 'Error occurred');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Tickets</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {tickets.map(ticket => {
            const available = ticket.quantity - ticket.soldCount;
            const isSelected = selectedTicket?.id === ticket.id;
            
            return (
              <TouchableOpacity 
                key={ticket.id} 
                onPress={() => setSelectedTicket(ticket)}
                disabled={available === 0}
              >
                <GlassCard 
                  style={[styles.ticketCard, isSelected && styles.selectedCard]}
                  variant={isSelected ? 'neon' : 'dark'}
                >
                  <Text style={styles.ticketName}>{ticket.name}</Text>
                  <Text style={styles.ticketPrice}>${ticket.price.toFixed(2)}</Text>
                  <Text style={styles.ticketAvailable}>{available} available</Text>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedTicket && !error && (
          <View style={styles.footer}>
            <View style={styles.quantityContainer}>
              <Button title="-" onPress={() => setQuantity(Math.max(1, quantity - 1))} size="small" variant="outline" />
              <Text style={styles.quantity}>{quantity}</Text>
              <Button title="+" onPress={() => setQuantity(Math.min(selectedTicket.maxPerUser, selectedTicket.quantity - selectedTicket.soldCount, quantity + 1))} size="small" variant="outline" />
            </View>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalPrice}>${(selectedTicket.price * quantity).toFixed(2)}</Text>
            </View>
            <Button title="Confirm Booking" onPress={handleBook} isLoading={isBooking} />
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
  content: { padding: theme.spacing.m },
  ticketCard: { marginBottom: theme.spacing.m },
  selectedCard: { borderColor: theme.colors.primary },
  ticketName: { ...theme.typography.h3, color: theme.colors.text },
  ticketPrice: { ...theme.typography.body, color: theme.colors.secondary, marginTop: 4 },
  ticketAvailable: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 4 },
  footer: { padding: theme.spacing.l, backgroundColor: theme.colors.surfaceLight, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.m, gap: theme.spacing.m },
  quantity: { ...theme.typography.h2, color: theme.colors.text },
  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.m },
  totalLabel: { ...theme.typography.h3, color: theme.colors.text },
  totalPrice: { ...theme.typography.h3, color: theme.colors.primaryLight },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.m,
  },
});
