import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
  Share,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { Button, LoadingState, ErrorState, ScreenContainer, IconButton, Card, StatusBadge } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { EventService, PublicEventDetails } from '../../api/services';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Share2, Mail, Phone, Users, Star } from 'lucide-react-native';

type EventDetailsScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type EventDetailsScreenRouteProp = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;

interface Props {
  navigation: EventDetailsScreenNavigationProp;
  route: EventDetailsScreenRouteProp;
}

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, publicSlug } = route.params;
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [publicData, setPublicData] = useState<PublicEventDetails | null>(null);
  const [reviewSummary, setReviewSummary] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContactModalVisible, setIsContactModalVisible] = useState(false);

  const fetchEventDetails = useCallback(async () => {
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

      const resolvedSlug = publicSlug || eventData.publicSlug;
      if (resolvedSlug) {
        try {
          const publicRes = await EventService.getPublicEventBySlug(resolvedSlug);
          setPublicData(publicRes.data);
        } catch {
          setPublicData(null);
        }
      } else {
        setPublicData(null);
      }

      try {
        const summaryRes = await EventService.getEventReviewSummary(eventId);
        setReviewSummary(summaryRes.data);
      } catch {
        setReviewSummary(null);
      }

      EventService.incrementView(eventId).catch(() => undefined);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, publicSlug]);

  useFocusEffect(
    useCallback(() => {
      fetchEventDetails();
    }, [fetchEventDetails]),
  );

  const handleShareEvent = async () => {
    if (!event) return;
    const slug = publicData?.event.publicSlug || event.publicSlug || publicSlug;
    if (!slug) {
      Alert.alert('Share Unavailable', 'Public URL is not available for this event.');
      return;
    }

    const shareUrl = publicData?.event.publicUrl || EventService.buildPublicEventUrl(slug);
    await Share.share({
      title: event.title,
      message: `Check out this event: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const openMailClient = async (email: string) => {
    const mailUrl = `mailto:${email}`;
    const canEmail = await Linking.canOpenURL(mailUrl);
    if (!canEmail) {
      Alert.alert('Unavailable', 'Email app is unavailable on this device.');
      return;
    }
    await Linking.openURL(mailUrl);
  };

  const openDialer = async (phone: string) => {
    const dialUrl = `tel:${phone}`;
    const canDial = await Linking.canOpenURL(dialUrl);
    if (!canDial) {
      Alert.alert('Unavailable', 'Calling is unavailable on this device.');
      return;
    }
    await Linking.openURL(dialUrl);
  };

  const handleAddToCalendar = async () => {
    const calendarUrl = EventService.getCalendarIcsUrl(eventId);
    const canOpen = await Linking.canOpenURL(calendarUrl);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Unable to open calendar link on this device.');
      return;
    }
    await Linking.openURL(calendarUrl);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEventDetails} /></ScreenContainer>;
  if (!event) return <ScreenContainer><ErrorState message="Event not found" onRetry={() => navigation.goBack()} /></ScreenContainer>;

  const host = publicData?.event.host;
  const hostName = (host?.name || 'Event Host').trim();
  const hostEmail = (publicData?.event.contactDetails?.email || host?.email || '').trim();
  const hostPhone = (publicData?.event.contactDetails?.phone || host?.phone || '').trim();
  const coverImage = publicData?.event.image || event.coverImage;
  const locationLabel = event.type === 'online'
    ? (event.meetingLink || 'Online')
    : (venue ? `${venue.name}, ${venue.city}` : event.city || 'Venue');
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const hasActiveTickets = tickets.some((ticket) => ticket.isActive && ticket.quantity > ticket.soldCount);
  const isSoldOut = Number(event.bookingCount || 0) >= Number(event.capacity || 0);
  const hasRegistrationInventory = event.pricingMode === 'free' || hasActiveTickets;
  const canRegister = event.status === 'published' && event.visibility === 'public' && !isSoldOut && hasRegistrationInventory;
  const registerLabel = isSoldOut ? 'Sold Out / Capacity Full' : (hasRegistrationInventory ? 'Register' : 'Registration Unavailable');

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft color={theme.colors.text} size={20} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={40}
          />
          <View style={styles.headerActions}>
            <IconButton
              icon={<Share2 color={theme.colors.text} size={18} />}
              onPress={handleShareEvent}
              variant="surface"
              size={40}
            />
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <CalendarIcon size={40} color={theme.colors.textMuted} />
            </View>
          )}

          <Text style={styles.title}>{event.title}</Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <CalendarIcon size={14} color={theme.colors.primary} />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <Clock size={14} color={theme.colors.secondary} />
              <Text style={styles.metaText}>{event.startTime} - {event.endTime}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={14} color={theme.colors.accent} />
              <Text style={styles.metaText}>{locationLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Users size={14} color={theme.colors.textMuted} />
              <Text style={styles.metaText}>{event.bookingCount}/{event.capacity} registered</Text>
            </View>
            <View style={styles.badgesRow}>
              <StatusBadge status="neutral" label={event.type.toUpperCase()} />
              <StatusBadge status="neutral" label={event.visibility.toUpperCase()} />
              <StatusBadge status={isSoldOut ? 'error' : 'success'} label={isSoldOut ? 'SOLD OUT' : 'OPEN'} />
            </View>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setIsContactModalVisible(true)} activeOpacity={0.8}>
              <Mail size={18} color={theme.colors.text} />
              <Text style={styles.quickActionLabel}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleShareEvent} activeOpacity={0.8}>
              <Share2 size={18} color={theme.colors.text} />
              <Text style={styles.quickActionLabel}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleAddToCalendar} activeOpacity={0.8}>
              <CalendarIcon size={18} color={theme.colors.text} />
              <Text style={styles.quickActionLabel}>Add Calendar</Text>
            </TouchableOpacity>
          </View>

          {reviewSummary && reviewSummary.totalReviews > 0 ? (
            <Card variant="raised" style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Reviews</Text>
              <View style={styles.reviewRow}>
                <Star size={14} color={theme.colors.warning} />
                <Text style={styles.reviewText}>
                  {reviewSummary.averageRating.toFixed(1)} average from {reviewSummary.totalReviews} review(s)
                </Text>
              </View>
            </Card>
          ) : null}

          <Card variant="raised" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Host</Text>
            <Text style={styles.description}>{hostName}</Text>
            {hostEmail ? <Text style={styles.hostMeta}>{hostEmail}</Text> : null}
            {hostPhone ? <Text style={styles.hostMeta}>{hostPhone}</Text> : null}
          </Card>

          <Card variant="raised" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About Event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </Card>

          {sessions.length > 0 && (
            <Card variant="raised" style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Agenda</Text>
              {sessions.map((session) => (
                <View key={session.id} style={styles.sessionRow}>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionMeta}>{session.startTime} - {session.endTime}</Text>
                  {session.speakerName ? <Text style={styles.sessionMeta}>Speaker: {session.speakerName}</Text> : null}
                </View>
              ))}
            </Card>
          )}

          <Card variant="raised" style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            <Text style={styles.description}>
              {event.pricingMode === 'free'
                ? 'This event is free to attend.'
                : (hasActiveTickets ? 'Select ticket type and continue to mock payment.' : 'No active ticket types available.')}
            </Text>
          </Card>

          {isSoldOut ? (
            <Text style={styles.soldOutText}>Sold Out / Capacity Full</Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={registerLabel}
            onPress={() => navigation.navigate('TicketSelection', { eventId })}
            disabled={!canRegister}
            variant="primary"
            size="lg"
          />
        </View>
      </SafeAreaView>

      <Modal
        transparent
        visible={isContactModalVisible}
        animationType="slide"
        onRequestClose={() => setIsContactModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsContactModalVisible(false)}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Contact Host</Text>
            {hostEmail ? (
              <TouchableOpacity style={styles.contactRow} onPress={() => openMailClient(hostEmail)}>
                <Mail size={16} color={theme.colors.primary} />
                <Text style={styles.contactText}>{hostEmail}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.contactUnavailable}>Host email unavailable</Text>
            )}
            {hostPhone ? (
              <TouchableOpacity style={styles.contactRow} onPress={() => openDialer(hostPhone)}>
                <Phone size={16} color={theme.colors.primary} />
                <Text style={styles.contactText}>{hostPhone}</Text>
              </TouchableOpacity>
            ) : null}
            <Button
              title="Close"
              onPress={() => setIsContactModalVisible(false)}
              variant="secondary"
              size="md"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 168,
  },
  coverImage: {
    width: '100%',
    height: 260,
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.m,
  },
  coverPlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.m,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
  metaCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.m,
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginTop: theme.spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    paddingVertical: theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickActionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: theme.spacing.m,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  reviewText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  hostMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sessionRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.s,
    marginTop: theme.spacing.s,
  },
  sessionTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  sessionMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  soldOutText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.error,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.colors.surfaceRaised,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.base,
    gap: theme.spacing.s,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  contactText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  contactUnavailable: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
});
