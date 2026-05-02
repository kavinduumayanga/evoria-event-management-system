import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Image, Share, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { Button, LoadingState, ErrorState, ScreenContainer, IconButton, StatusBadge } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { EventService, PublicEventDetails } from '../../api/services';
import { ArrowLeft, Calendar, MapPin, Clock, Share2, Mail, Phone, Users, Star } from 'lucide-react-native';
import { formatSafeDate, formatSafeTime, logDevMissing, safeLower, safeStatus, safeString, safeTitle } from '../../utils/safeText';
import { resolveImageUrl } from '../../utils/imageUrl';

type EventDetailsScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type EventDetailsScreenRouteProp = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;

interface Props { navigation: EventDetailsScreenNavigationProp; route: EventDetailsScreenRouteProp; }

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const publicSlug = route.params?.publicSlug;
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
    if (!eventId) return;
    try {
      setIsLoading(true); setError(null);
      const [eventRes, sessionsRes, ticketsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`), apiClient.get(`/sessions/event/${eventId}`), apiClient.get(`/tickets/event/${eventId}`)
      ]);
      const eventData = eventRes.data.data.event as Event;
      setEvent(eventData); setSessions(sessionsRes.data.data.sessions || []); setTickets(ticketsRes.data.data.tickets || []);
      if (eventData.venueId) { const venueRes = await apiClient.get(`/venues/${eventData.venueId}`); setVenue(venueRes.data.data.venue); } else setVenue(null);
      const resolvedSlug = publicSlug || eventData.publicSlug;
      if (resolvedSlug) { try { setPublicData((await EventService.getPublicEventBySlug(resolvedSlug)).data); } catch { setPublicData(null); } }
      try { setReviewSummary((await EventService.getEventReviewSummary(eventId)).data); } catch { setReviewSummary(null); }
      EventService.incrementView(eventId).catch(() => undefined);
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to load event details'); } finally { setIsLoading(false); }
  }, [eventId, publicSlug]);

  useFocusEffect(useCallback(() => { fetchEventDetails(); }, [fetchEventDetails]));

  if (!eventId) return <ScreenContainer><ErrorState message="Missing event details." onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;
  if (isLoading) return <LoadingState />;
  if (error || !event) return <ScreenContainer><ErrorState message={error || "Event not found"} onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;

  const host = typeof publicData?.event.host === 'object' && publicData?.event.host ? publicData.event.host : null;
  const hostName = safeTitle(host?.name, 'Host unavailable');
  const coverImage = resolveImageUrl(publicData?.event.image || event.coverImage);
  const eventType = safeLower(event.type, 'physical');
  const locationLabel = eventType === 'online' ? safeString(event.meetingLink, 'Online') : safeString(venue ? `${venue.name}, ${venue.city}` : event.city, 'Location not specified');
  const formattedDate = formatSafeDate(event.date, 'Date unavailable', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isSoldOut = Number(event.capacity) > 0 && Number(event.bookingCount) >= Number(event.capacity);
  const hasRegistrationInventory = safeString(event.pricingMode, 'ticketed') === 'free' || tickets.some(t => t.isActive && t.quantity > t.soldCount);
  const canRegister = safeStatus(event.status, 'draft') === 'published' && safeString(event.visibility, 'private') === 'public' && !isSoldOut && hasRegistrationInventory;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.heroSection}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverImage} /> : <View style={styles.coverPlaceholder} />}
          <View style={styles.overlay} />
          <SafeAreaView style={styles.heroHeader} edges={['top']}>
            <IconButton icon={<ArrowLeft color="#FFF" size={24} />} onPress={() => navigation.goBack()} variant="ghost" size={48} />
            <IconButton icon={<Share2 color="#FFF" size={24} />} onPress={() => {}} variant="ghost" size={48} />
          </SafeAreaView>
          <View style={styles.heroContent}>
            <View style={styles.badges}>
              <StatusBadge status="info" label={safeString(event.type, 'event')} />
              {isSoldOut && <StatusBadge status="error" label="SOLD OUT" />}
            </View>
            <Text style={styles.title}>{safeTitle(event.title, 'Untitled Event')}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}><Calendar size={20} color={theme.colors.primary} /></View>
              <View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formattedDate}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}><Clock size={20} color={theme.colors.primary} /></View>
              <View>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatSafeTime(event.startTime, '--')} - {formatSafeTime(event.endTime, '--')}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}><MapPin size={20} color={theme.colors.primary} /></View>
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{locationLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setIsContactModalVisible(true)}>
              <Mail size={18} color={theme.colors.text} />
              <Text style={styles.actionBtnText}>Contact Host</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this event</Text>
            <Text style={styles.description}>{safeString(event.description, '')}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hosted by</Text>
            <Text style={styles.hostName}>{hostName}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title={isSoldOut ? 'Sold Out' : (hasRegistrationInventory ? 'Register Now' : 'Unavailable')}
          onPress={() => navigation.navigate('TicketSelection', { eventId })}
          disabled={!canRegister}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: 120 },
  heroSection: { height: 350, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { width: '100%', height: '100%', backgroundColor: theme.colors.primaryDark },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  heroContent: { position: 'absolute', bottom: 24, left: 24, right: 24 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  title: { ...theme.typography.display, color: '#FFF' },
  body: { padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: theme.colors.background, marginTop: -32 },
  infoGrid: { gap: 20, marginBottom: 24 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  infoIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  infoValue: { ...theme.typography.bodyMedium, color: theme.colors.text, marginTop: 2 },
  actionsRow: { flexDirection: 'row', marginBottom: 32 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, backgroundColor: theme.colors.surfaceLight },
  actionBtnText: { ...theme.typography.button, color: theme.colors.text },
  section: { marginBottom: 32 },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: 12 },
  description: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 24 },
  hostName: { ...theme.typography.bodyMedium, color: theme.colors.primary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: theme.colors.background, borderTopWidth: 1, borderTopColor: theme.colors.border },
});
