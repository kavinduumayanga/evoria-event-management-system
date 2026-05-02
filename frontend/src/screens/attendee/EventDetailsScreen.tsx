import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as Calendar from 'expo-calendar';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { GradientBackground, PrimaryButton, SecondaryButton, GlassCard, LoadingState, ErrorState, ScreenContainer, EventCard, FormInput, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { BookingService, EventService, PublicEventDetails, ReportService } from '../../api/services';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Wifi, Share2, Mail, Phone, UserRound, Users2, Pencil, Ticket, Eye, Copy, Send } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';

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
  const { eventId, publicSlug } = route.params;
  const currentUser = useAuthStore((state) => state.user);
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [publicData, setPublicData] = useState<PublicEventDetails | null>(null);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [eventAdminEmail, setEventAdminEmail] = useState('');
  const [isAddingEventAdmin, setIsAddingEventAdmin] = useState(false);
  const [blastTitle, setBlastTitle] = useState('');
  const [blastMessage, setBlastMessage] = useState('');
  const [isSendingBlast, setIsSendingBlast] = useState(false);
  const [isRegisteringFree, setIsRegisteringFree] = useState(false);

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
      const resolvedSlug = publicSlug || eventData.publicSlug;
      if (resolvedSlug) {
        try {
          const publicRes = await EventService.getPublicEventBySlug(resolvedSlug);
          setPublicData(publicRes.data);
        } catch (publicFetchError) {
          // Keep details screen functional even if public endpoint access is restricted.
          setPublicData(null);
        }
      } else {
        setPublicData(null);
      }

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
  }, [eventId, publicSlug]);

  useFocusEffect(
    useCallback(() => {
      fetchEventDetails();
    }, [fetchEventDetails]),
  );

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

  const resolveShareUrl = () => {
    const slug = publicData?.event.publicSlug || event?.publicSlug || publicSlug;
    if (!slug) return '';

    return publicData?.event.publicUrl || EventService.buildPublicEventUrl(slug);
  };

  const handleShareEvent = async () => {
    if (!event) return;
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      Alert.alert('Share Unavailable', 'Public URL is not available for this event.');
      return;
    }

    await Share.share({
      title: event.title,
      message: `Check out this event: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const handleInviteGuests = async () => {
    if (!event) return;
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      Alert.alert('Invite Unavailable', 'Public URL is not available for this event.');
      return;
    }

    await Share.share({
      title: `Invitation: ${event.title}`,
      message: `You are invited to ${event.title}. Register here: ${shareUrl}`,
      url: shareUrl,
    });
  };

  const handleCopyEventUrl = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      Alert.alert('Copy Unavailable', 'Public URL is not available for this event.');
      return;
    }

    await Clipboard.setStringAsync(shareUrl);
    Alert.alert('Copied', 'Public event URL copied to clipboard.');
  };

  const handleContactHost = async () => {
    const host = publicData?.event.host;
    const contact = publicData?.event.contactDetails;
    if (!host && !contact) {
      Alert.alert('Contact Unavailable', 'Host contact details are not available.');
      return;
    }

    const phone = (contact?.phone || host?.phone || '').trim();
    if (phone) {
      const telUrl = `tel:${phone}`;
      const canDial = await Linking.canOpenURL(telUrl);
      if (canDial) {
        await Linking.openURL(telUrl);
        return;
      }
    }

    const email = (contact?.email || host?.email || '').trim();
    if (email) {
      const mailUrl = `mailto:${email}`;
      const canEmail = await Linking.canOpenURL(mailUrl);
      if (canEmail) {
        await Linking.openURL(mailUrl);
        return;
      }
    }

    Alert.alert('Contact Unavailable', 'Unable to open host contact options on this device.');
  };

  const handleOpenEditEvent = () => {
    if (!event) return;
    navigation.navigate('EventForm', { eventId: event.id });
  };

  const handleOpenGuestList = () => {
    if (!event) return;
    navigation.navigate('ManageRegistrations', { eventId: event.id });
  };

  const handleOpenCheckInGuests = () => {
    if (!event) return;
    navigation.navigate('ManageRegistrations', { eventId: event.id });
  };

  const handleOpenManageTickets = () => {
    if (!event) return;
    navigation.navigate('ManageTickets', { eventId: event.id });
  };

  const handleUpdateVisibility = async (visibility: 'public' | 'private' | 'unlisted') => {
    if (!event) return;

    try {
      await EventService.updateEventVisibility(event.id, visibility);
      Alert.alert('Updated', `Event visibility set to ${visibility}.`);
      fetchEventDetails();
    } catch (updateError: any) {
      Alert.alert('Update Failed', updateError?.response?.data?.message || 'Unable to update event visibility.');
    }
  };

  const handleAddEventAdmin = async () => {
    if (!event) return;
    const email = eventAdminEmail.trim();
    if (!email) {
      Alert.alert('Add Event Admin', 'Please enter an email address.');
      return;
    }

    try {
      setIsAddingEventAdmin(true);
      await EventService.addEventAdmin(event.id, { email });
      setEventAdminEmail('');
      Alert.alert('Success', 'Event admin added successfully.');
      fetchEventDetails();
    } catch (addError: any) {
      Alert.alert('Add Admin Failed', addError?.response?.data?.message || 'Unable to add event admin.');
    } finally {
      setIsAddingEventAdmin(false);
    }
  };

  const handleSendBlastMessage = async () => {
    if (!event) return;
    if (!blastTitle.trim() || !blastMessage.trim()) {
      Alert.alert('Missing Fields', 'Blast title and message are required.');
      return;
    }

    try {
      setIsSendingBlast(true);
      const response = await EventService.blastMessage(event.id, {
        subject: blastTitle.trim(),
        message: blastMessage.trim(),
      });
      setBlastTitle('');
      setBlastMessage('');
      Alert.alert('Blast Sent', response?.message || 'Blast message sent to attendees.');
    } catch (blastError: any) {
      Alert.alert('Blast Failed', blastError?.response?.data?.message || 'Unable to send blast message.');
    } finally {
      setIsSendingBlast(false);
    }
  };

  const handleRegisterFreeEvent = async () => {
    if (!event) return;

    try {
      setIsRegisteringFree(true);
      const response = await BookingService.createBooking({
        eventId: event.id,
        quantity: 1,
      });

      const booking = response?.data?.booking;
      if (!booking?.id) {
        Alert.alert('Registration Complete', 'Free event registration submitted.');
        fetchEventDetails();
        return;
      }

      if (booking.isWaitlisted) {
        Alert.alert(
          'Added to Waitlist',
          booking.waitlistPosition
            ? `Event is full. You were added at waitlist position #${booking.waitlistPosition}.`
            : 'Event is full. You were added to the waitlist.',
        );
      } else {
        Alert.alert('Registered', 'Free event registration confirmed.');
      }

      navigation.navigate('BookingConfirmation', { bookingId: booking.id });
    } catch (registrationError: any) {
      const message = registrationError?.response?.data?.message || 'Unable to register for this event.';
      if (registrationError?.response?.status === 409) {
        Alert.alert('Already Registered', message);
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setIsRegisteringFree(false);
    }
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
  const canRegister = event.visibility === 'public';
  const pricingMode = event.pricingMode || 'ticketed';
  const isFreeEvent = pricingMode === 'free';
  const hasActionableInventory = isFreeEvent || isAvailable;
  const canManageEvent = Boolean(
    publicData?.event.isManageableByCurrentUser
    || (currentUser && (event.ownerId === currentUser.id || (event.adminIds || []).includes(currentUser.id)))
  );
  const hostName = publicData?.event.host?.name || 'Host';
  const coverImage = publicData?.event.image || event.coverImage;
  const locationText = publicData?.event.location.label
    || (venue ? `${venue.name}, ${venue.city}` : event.city || (event.type === 'online' ? 'Online event' : 'Venue'));

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft color={theme.colors.text} size={24} />}
            onPress={() => navigation.goBack()}
            variant="solid"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ color: theme.colors.textMuted }}>Event Cover Image</Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text style={styles.title}>{event.title}</Text>
            {event.category ? <Text style={styles.topicText}>Topic: {event.category}</Text> : null}

            <GlassCard style={styles.metaContainer} variant="dark" animateEntrance>
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
              <View style={styles.metaRow}>
                <UserRound size={16} color={theme.colors.secondary} />
                <Text style={styles.metaText}>Host: {hostName}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Capacity:</Text>
                <Text style={styles.metaText}>{event.capacity}</Text>
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
              <View style={styles.metaRow}>
                <MapPin size={16} color={theme.colors.accent} />
                <Text style={styles.metaText}>{locationText}</Text>
              </View>
            </GlassCard>

            <View style={styles.inlineActions}>
              <SecondaryButton title="Add to Calendar" onPress={handleCalendarAction} />
              <SecondaryButton title="Share" onPress={handleShareEvent} />
              <SecondaryButton
                title="Contact Host"
                onPress={handleContactHost}
              />
              {event.type === 'online' && event.meetingLink ? (
                <SecondaryButton
                  title="Open Meeting Link"
                  onPress={handleOpenMeetingLink}
                />
              ) : null}
              {event.publicSlug ? (
                <SecondaryButton
                  title="Open Public Page"
                  onPress={() => navigation.navigate('PublicEventDetails', { slug: event.publicSlug })}
                />
              ) : null}
              <SecondaryButton
                title={showReportForm ? 'Hide Report Form' : 'Report Event'}
                onPress={() => setShowReportForm((previous) => !previous)}
              />
            </View>

            {canManageEvent ? (
              <GlassCard style={styles.managePanel} variant="primary" animateEntrance>
                <Text style={styles.manageTitle}>Manager Actions</Text>
                <View style={styles.manageActionGrid}>
                  <SecondaryButton title="Edit Event" onPress={handleOpenEditEvent} />
                  <SecondaryButton title="Check-in Guests" onPress={handleOpenCheckInGuests} />
                  <SecondaryButton title="Invite Guests" onPress={handleInviteGuests} />
                  <SecondaryButton title="Guest List" onPress={handleOpenGuestList} />
                  <SecondaryButton title="Manage Tickets" onPress={handleOpenManageTickets} />
                  <SecondaryButton title="Copy Public URL" onPress={handleCopyEventUrl} />
                </View>

                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Add Event Admins</Text>
                  <FormInput
                    label="Admin Email"
                    value={eventAdminEmail}
                    onChangeText={setEventAdminEmail}
                    placeholder="user@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <PrimaryButton
                    title="Add Event Admin"
                    onPress={handleAddEventAdmin}
                    isLoading={isAddingEventAdmin}
                  />
                </View>

                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Visibility Settings</Text>
                  <View style={styles.visibilityButtons}>
                    <SecondaryButton title="Set Public" onPress={() => handleUpdateVisibility('public')} />
                    <SecondaryButton title="Set Unlisted" onPress={() => handleUpdateVisibility('unlisted')} />
                    <SecondaryButton title="Set Private" onPress={() => handleUpdateVisibility('private')} />
                  </View>
                </View>

                <View style={styles.manageSection}>
                  <Text style={styles.manageSectionTitle}>Send Blast Message</Text>
                  <FormInput label="Blast Title" value={blastTitle} onChangeText={setBlastTitle} placeholder="Important event update" />
                  <FormInput
                    label="Blast Message"
                    value={blastMessage}
                    onChangeText={setBlastMessage}
                    placeholder="Write your message to all attendees"
                    multiline
                  />
                  <PrimaryButton
                    title="Send Blast Message"
                    onPress={handleSendBlastMessage}
                    isLoading={isSendingBlast}
                  />
                </View>
              </GlassCard>
            ) : null}

            {showReportForm && (
              <GlassCard style={styles.reportBox} variant="dark">
                <FormInput
                  label="Reason"
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Tell us what is wrong with this event"
                  multiline
                />
                <PrimaryButton
                  title="Submit Report"
                  onPress={handleSubmitReport}
                  isLoading={isSubmittingReport}
                />
              </GlassCard>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>

            {sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agenda</Text>
                {sessions.map((session) => (
                  <GlassCard key={session.id} style={styles.sessionCard} variant="dark">
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionTime}>{session.startTime} - {session.endTime}</Text>
                    {session.speakerName && <Text style={styles.sessionSpeaker}>Speaker: {session.speakerName}</Text>}
                  </GlassCard>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tickets</Text>
              {isFreeEvent ? (
                <Text style={styles.description}>This is a free event. Tap Register to reserve your spot.</Text>
              ) : tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <GlassCard key={ticket.id} style={styles.ticketCard} variant="dark">
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
                    onPress={() => navigation.push('EventDetails', { eventId: recommended.id, publicSlug: recommended.publicSlug })}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {!canRegister && (
            <Text style={styles.waitlistHint}>Registrations are available only for public events.</Text>
          )}
          {isEventFull && (
            <Text style={styles.waitlistHint}>Event full - joining now adds you to waitlist.</Text>
          )}
          <PrimaryButton
            title={isEventFull ? 'Join Waitlist' : (isFreeEvent ? 'Register' : (isAvailable ? 'Book Tickets' : 'Sold Out'))}
            disabled={!canRegister || event.status !== 'published' || (!isEventFull && !hasActionableInventory)}
            isLoading={isFreeEvent && isRegisteringFree}
            onPress={() => {
              if (isFreeEvent) {
                handleRegisterFreeEvent();
                return;
              }
              navigation.navigate('TicketSelection', { eventId });
            }}
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
  coverImage: {
    width: '100%',
    height: 250,
  },
  infoContainer: {
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.m,
  },
  topicText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.m,
  },
  metaContainer: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.l,
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
  managePanel: {
    marginBottom: theme.spacing.l,
    padding: theme.spacing.l,
  },
  manageTitle: {
    ...theme.typography.h2,
    color: theme.colors.primaryLight,
    marginBottom: theme.spacing.s,
  },
  manageActionGrid: {
    gap: theme.spacing.s,
  },
  manageSection: {
    marginTop: theme.spacing.m,
  },
  manageSectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  visibilityButtons: {
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
