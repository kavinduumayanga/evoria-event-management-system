import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { GradientBackground, Button, GlassCard, LoadingState, ErrorState, ScreenContainer } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { ArrowLeft, Calendar, MapPin, Clock, Wifi } from 'lucide-react-native';

type EventDetailsScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type EventDetailsScreenRouteProp = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;

interface Props {
  navigation: EventDetailsScreenNavigationProp;
  route: EventDetailsScreenRouteProp;
}

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [eventRes, sessionsRes, ticketsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/sessions/event/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`)
      ]);

      const eventData = eventRes.data.data.event;
      setEvent(eventData);
      setSessions(sessionsRes.data.data.sessions);
      setTickets(ticketsRes.data.data.tickets);

      if (eventData.venueId) {
        const venueRes = await apiClient.get(`/venues/${eventData.venueId}`);
        setVenue(venueRes.data.data.venue);
      } else {
        setVenue(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch event details', error);
      setError(error.response?.data?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <LoadingState />;

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchEventDetails} />
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer>
        <ErrorState 
          message="Event not found" 
          onRetry={() => navigation.goBack()} 
        />
      </ScreenContainer>
    );
  }

  const isAvailable = tickets.some(t => t.isActive && t.quantity > t.soldCount);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.imagePlaceholder}>
            <Text style={{color: theme.colors.textMuted}}>Event Cover Image</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{event.title}</Text>
            
            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <Calendar size={16} color={theme.colors.primaryLight} />
                <Text style={styles.metaText}>{event.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={16} color={theme.colors.secondary} />
                <Text style={styles.metaText}>{event.startTime} - {event.endTime}</Text>
              </View>
              <View style={styles.metaRow}>
                <Wifi size={16} color={theme.colors.primary} />
                <Text style={styles.metaText}>Type: {event.type ? event.type.toUpperCase() : 'PHYSICAL'}</Text>
              </View>
              {venue && (
                <View style={styles.metaRow}>
                  <MapPin size={16} color={theme.colors.accent} />
                  <Text style={styles.metaText}>{venue.name}, {venue.city}</Text>
                </View>
              )}
              {!venue && event.type === 'online' && (
                <View style={styles.metaRow}>
                  <MapPin size={16} color={theme.colors.accent} />
                  <Text style={styles.metaText}>Online event (no physical venue)</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            {sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agenda</Text>
                {sessions.map(session => (
                  <GlassCard key={session.id} style={styles.sessionCard}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionTime}>{session.startTime} - {session.endTime}</Text>
                    {session.speakerName && <Text style={styles.sessionSpeaker}>Speaker: {session.speakerName}</Text>}
                  </GlassCard>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tickets</Text>
              {tickets.length > 0 ? (
                tickets.map(ticket => (
                  <GlassCard key={ticket.id} style={styles.ticketCard} variant="light">
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      <Text style={styles.ticketPrice}>${ticket.price.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.ticketRemaining}>
                      {ticket.quantity - ticket.soldCount} left
                    </Text>
                  </GlassCard>
                ))
              ) : (
                <Text style={styles.description}>No tickets available.</Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button 
            title={isAvailable ? "Book Tickets" : "Sold Out"}
            disabled={!isAvailable || event.status !== 'published'}
            onPress={() => navigation.navigate('TicketSelection', { eventId })}
            style={styles.bookButton}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imagePlaceholder: {
    height: 250,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
  metaContainer: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.s,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  sessionCard: {
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  sessionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sessionTime: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    marginTop: 4,
  },
  sessionSpeaker: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  ticketCard: {
    marginBottom: theme.spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  ticketPrice: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  ticketRemaining: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xl,
    backgroundColor: 'rgba(9, 9, 11, 0.9)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bookButton: {
    width: '100%',
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
  },
});
