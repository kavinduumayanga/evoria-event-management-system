import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Calendar from 'expo-calendar';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { GradientBackground, Button, GlassCard, LoadingState, ErrorState, ScreenContainer, EventCard, Input } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { EventService, ReportService } from '../../api/services';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Wifi, Link as LinkIcon } from 'lucide-react-native';

type EventDetailsScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type EventDetailsScreenRouteProp = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;

interface Props {
  navigation: EventDetailsScreenNavigationProp;
  route: EventDetailsScreenRouteProp;
}

const parseEventDateTime = (dateValue: string, timeValue: string) => {
  const [year, month, day] = dateValue.slice(0, 10).split('-').map((item) => Number(item));
  const [hours, minutes] = timeValue.split(':').map((item) => Number(item));
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0);
};

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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
        apiClient.get(`/tickets/event/${eventId}`),
      ]);

      const eventData = eventRes.data.data.event as Event;
      setEvent(eventData);
      setSessions(sessionsRes.data.data.sessions || []);
      setTickets(ticketsRes.data.data.tickets || []);

      if (eventData.venueId) {
        const venueRes = await apiClient.get(`/venues/${eventData.venueId}`);
        setVenue(venueRes.data.data.venue);
      } else {
        setVenue(null);
      }

      const recommendedRes = await EventService.getRecommendedEvents({ eventId: eventData.id, limit: 6 });
      setRecommendedEvents(recommendedRes.data.events || []);

      EventService.incrementView(eventId).catch(() => undefined);
    } catch (fetchError: any) {
      console.error('Failed to fetch event details', fetchError);
      setError(fetchError.response?.data?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarAction = () => {
    if (!event) return;

    Alert.alert('Add to Calendar', 'Choose an option', [
      {
        text: 'Download ICS',
        onPress: async () => {
          try {
            const icsContent = await EventService.getEventCalendar(event.id, true);
            const dataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(String(icsContent))}`;
            const canOpen = await Linking.canOpenURL(dataUrl);
            if (canOpen) {
              await Linking.openURL(dataUrl);
            } else {
              Alert.alert('ICS Ready', 'Calendar file generated. Copy from preview:\n\n' + String(icsContent).slice(0, 500));
            }
          } catch (calendarError: any) {
            Alert.alert('Calendar Error', calendarError.response?.data?.message || 'Failed to generate ICS file');
          }
        },
      },
      {
        text: 'Open Device Calendar',
        onPress: async () => {
          try {
            const startDate = parseEventDateTime(event.date, event.startTime);
            const endDate = parseEventDateTime(event.date, event.endTime);
            const location = event.type === 'online' ? (event.meetingLink || 'Online') : (venue ? `${venue.name}, ${venue.city}` : event.city);

            await Calendar.createEventInCalendarAsync({
              title: event.title,
              startDate,
              endDate,
              location,
              notes: event.description,
              url: event.meetingLink || undefined,
            });
          } catch (calendarError) {
            Alert.alert('Calendar Error', 'Unable to open device calendar on this device.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleOpenMeetingLink = async () => {
    if (!event?.meetingLink) return;
    const supported = await Linking.canOpenURL(event.meetingLink);
    if (!supported) {
      Alert.alert('Invalid Link', 'Meeting link is invalid or unsupported on this device.');
      return;
    }
    await Linking.openURL(event.meetingLink);
  };

  const handleSubmitReport = async () => {
    if (!event) return;
    if (!reportReason.trim()) {
      Alert.alert('Report Event', 'Please enter a reason before submitting.');
      return;
    }

    try {
      setIsSubmittingReport(true);
      await ReportService.createReport({
        targetType: 'event',
        targetId: event.id,
        reason: reportReason.trim(),
      });
      setReportReason('');
      setShowReportForm(false);
      Alert.alert('Report Submitted', 'Thanks for your report. Our moderation team will review it.');
    } catch (submitError: any) {
      Alert.alert('Report Failed', submitError.response?.data?.message || 'Unable to submit report right now.');
    } finally {
      setIsSubmittingReport(false);
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
        <ErrorState message="Event not found" onRetry={() => navigation.goBack()} />
      </ScreenContainer>
    );
  }

  const isAvailable = tickets.some((ticket) => ticket.isActive && ticket.quantity > ticket.soldCount);
  const isEventFull = event.bookingCount >= event.capacity;

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
            <Text style={{ color: theme.colors.textMuted }}>Event Cover Image</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.metaContainer}>
              <View style={styles.metaRow}>
                <CalendarIcon size={16} color={theme.colors.primaryLight} />
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
              {event.category ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Category:</Text>
                  <Text style={styles.metaText}>{event.category}</Text>
                </View>
              ) : null}
              {event.tags && event.tags.length > 0 ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Tags:</Text>
                  <Text style={styles.metaText}>{event.tags.join(', ')}</Text>
                </View>
              ) : null}
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

            <View style={styles.inlineActions}>
              <Button title="Add to Calendar" variant="outline" onPress={handleCalendarAction} />
              {event.type === 'online' && event.meetingLink ? (
                <Button
                  title="Open Meeting Link"
                  onPress={handleOpenMeetingLink}
                  icon={<LinkIcon size={16} color={theme.colors.text} />}
                />
              ) : null}
              <Button
                title={showReportForm ? 'Hide Report Form' : 'Report Event'}
                variant="outline"
                onPress={() => setShowReportForm((previous) => !previous)}
              />
            </View>

            {showReportForm && (
              <View style={styles.reportBox}>
                <Input
                  label="Reason"
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Tell us what is wrong with this event"
                  multiline
                />
                <Button
                  title="Submit Report"
                  onPress={handleSubmitReport}
                  isLoading={isSubmittingReport}
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            {sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agenda</Text>
                {sessions.map((session) => (
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
                tickets.map((ticket) => (
                  <GlassCard key={ticket.id} style={styles.ticketCard} variant="light">
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketName}>{ticket.name}</Text>
                      <Text style={styles.ticketPrice}>
                        {ticket.isFree ? 'Free' : `${ticket.currency || 'LKR'} ${ticket.price.toFixed(2)}`}
                      </Text>
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

            {recommendedEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended Events</Text>
                {recommendedEvents.slice(0, 4).map((recommended) => (
                  <EventCard
                    key={recommended.id}
                    event={recommended}
                    onPress={() => navigation.push('EventDetails', { eventId: recommended.id })}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {isEventFull && (
            <Text style={styles.waitlistHint}>Event full - joining now adds you to waitlist.</Text>
          )}
          <Button
            title={isEventFull ? 'Join Waitlist' : (isAvailable ? 'Book Tickets' : 'Sold Out')}
            disabled={event.status !== 'published' || (!isEventFull && !isAvailable)}
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
  metaLabel: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.s,
  },
  metaText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginLeft: theme.spacing.s,
  },
  inlineActions: {
    marginBottom: theme.spacing.m,
    gap: theme.spacing.s,
  },
  reportBox: {
    marginBottom: theme.spacing.l,
    gap: theme.spacing.s,
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
  waitlistHint: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginBottom: theme.spacing.s,
  },
  bookButton: {
    width: '100%',
  },
});
