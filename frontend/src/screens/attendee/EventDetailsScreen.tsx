import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, Session, TicketType } from '../../types';
import { LoadingState, ErrorState, ScreenContainer, HeaderBar, PrimaryButton, SecondaryButton, SectionBlock } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { EventService, PublicEventDetails } from '../../api/services';
import { MapPin, Calendar as CalendarIcon, Clock, MoreHorizontal, Mail, Ticket } from 'lucide-react-native';
import { formatSafeDate, formatSafeTime, safeLower, safeStatus, safeString, safeTitle } from '../../utils/safeText';
import { resolveImageUrl } from '../../utils/imageUrl';
import { LinearGradient } from 'expo-linear-gradient';

type EventDetailsScreenNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type EventDetailsScreenRouteProp = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;

interface Props { navigation: EventDetailsScreenNavigationProp; route: EventDetailsScreenRouteProp; }

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const publicSlug = route.params?.publicSlug;
  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [publicData, setPublicData] = useState<PublicEventDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoading(true); setError(null);
      const [eventRes, ticketsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`), apiClient.get(`/tickets/event/${eventId}`)
      ]);
      const eventData = eventRes.data.data.event as Event;
      setEvent(eventData); setTickets(ticketsRes.data.data.tickets || []);
      if (eventData.venueId) { const venueRes = await apiClient.get(`/venues/${eventData.venueId}`); setVenue(venueRes.data.data.venue); }
      const resolvedSlug = publicSlug || eventData.publicSlug;
      if (resolvedSlug) { try { setPublicData((await EventService.getPublicEventBySlug(resolvedSlug)).data); } catch {} }
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to load event details'); } finally { setIsLoading(false); }
  }, [eventId, publicSlug]);

  useFocusEffect(useCallback(() => { fetchEventDetails(); }, [fetchEventDetails]));

  if (!eventId) return <ScreenContainer><ErrorState message="Missing event details." onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;
  if (isLoading) return <LoadingState />;
  if (error || !event) return <ScreenContainer><ErrorState message={error || "Event not found"} onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;

  const host = typeof publicData?.event.host === 'object' && publicData?.event.host ? publicData.event.host : null;
  const hostName = safeTitle(host?.name, 'Dallas Matcha Club');
  const coverImage = resolveImageUrl(publicData?.event.image || event.coverImage);
  const formattedDate = formatSafeDate(event.date, 'Today', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isSoldOut = Number(event.capacity) > 0 && Number(event.bookingCount) >= Number(event.capacity);
  const hasRegistrationInventory = safeString(event.pricingMode, 'ticketed') === 'free' || tickets.some(t => t.isActive && t.quantity > t.soldCount);
  const canRegister = safeStatus(event.status, 'draft') === 'published' && safeString(event.visibility, 'private') === 'public' && !isSoldOut && hasRegistrationInventory;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#4A4232', '#000000']} style={StyleSheet.absoluteFillObject} />
      <HeaderBar variant="event" transparent />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageCard}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" /> : <View style={styles.coverPlaceholder} />}
          <View style={styles.featuredPill}>
            <Text style={styles.featuredText}>Featured in Dallas</Text>
          </View>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.title}>{safeTitle(event.title, 'Untitled Event')}</Text>
          <View style={styles.calendarRow}>
            <View style={styles.calendarIcon} />
            <Text style={styles.calendarText}>{hostName} Events Calendar &gt;</Text>
          </View>
          <Text style={styles.timeText}>
            Today, {formatSafeTime(event.startTime, '11:00')} - {formatSafeTime(event.endTime, '20:00')} GMT-5
          </Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.actionFlex1}>
            <PrimaryButton
              title="Register"
              icon={<Ticket color="#000" size={20} />}
              onPress={() => navigation.navigate('TicketSelection', { eventId })}
              disabled={!canRegister}
            />
          </View>
          <View style={styles.actionFlex1}>
            <SecondaryButton
              title="Contact"
              icon={<Mail color="#FFF" size={20} />}
              onPress={() => {}}
            />
          </View>
          <View style={styles.actionFlex1}>
            <SecondaryButton
              title="More"
              icon={<MoreHorizontal color="#FFF" size={20} />}
              onPress={() => {}}
            />
          </View>
        </View>

        <SectionBlock title="Location" style={styles.sectionBlock}>
          <Text style={styles.locationTitle}>{venue?.name || 'Irving Mall'}</Text>
          <Text style={styles.locationSubtitle}>{venue?.address || '3880 Irving Mall, Irving, TX 75062, USA'}</Text>
          <View style={styles.mapMockup}>
            <Image source={{uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop'}} style={StyleSheet.absoluteFillObject} />
          </View>
        </SectionBlock>

        <SectionBlock title="Host" style={styles.sectionBlock}>
          <View style={styles.hostRow}>
            <View style={styles.hostAvatar} />
            <Text style={styles.hostName}>{hostName}</Text>
          </View>
        </SectionBlock>

        <SectionBlock title="954 Going" style={styles.sectionBlock}>
          <View style={styles.avatarsRow}>
            {[1, 2, 3, 4].map(i => <View key={i} style={[styles.goingAvatar, { zIndex: 5 - i, marginLeft: i === 1 ? 0 : -10 }]} />)}
            <View style={[styles.goingAvatarMore, { zIndex: 0, marginLeft: -10 }]}><Text style={styles.goingMoreText}>+950</Text></View>
          </View>
          <Text style={styles.goingNames}>Tommy Croft, Ciria, Khristan Maney, Taylor Vogel, and 950 more</Text>
        </SectionBlock>

        <SectionBlock title="About Event" style={styles.sectionBlock}>
          <Text style={styles.description}>{safeString(event.description, "We're celebrating National Matcha Day with our biggest event yet! Join us for a full-day matcha experience featuring your favorite local vendors, a live DJ, giveaways, and interactive experiences!")}</Text>
          <View style={styles.aboutMetaRow}>
            <MapPin size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{venue?.name || 'Irving Mall (AMC entrance by Chick-fil-A)'}</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <CalendarIcon size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{formattedDate}</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Clock size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{formatSafeTime(event.startTime, '11:00 AM')} – {formatSafeTime(event.endTime, '8:00 PM')}</Text>
          </View>
          
          <View style={styles.tagPill}>
            <Text style={styles.tagText}># Food & Drink</Text>
          </View>
        </SectionBlock>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingBottom: 120 },
  imageCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    height: 400,
    alignItems: 'center',
    paddingTop: 80,
    position: 'relative',
    ...theme.shadows.premium,
  },
  coverImage: { width: '80%', height: '80%', borderRadius: 16 },
  coverPlaceholder: { width: '80%', height: '80%', backgroundColor: '#F0F0F0', borderRadius: 16 },
  featuredPill: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    ...theme.shadows.md,
  },
  featuredText: { color: '#000', fontWeight: '600', fontSize: 12 },
  headerInfo: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 24 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  calendarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calendarIcon: { width: 16, height: 16, backgroundColor: '#A3A3A3', borderRadius: 4, marginRight: 8 },
  calendarText: { color: '#A3A3A3', fontSize: 16, fontWeight: '500' },
  timeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  actionFlex1: { flex: 1 },
  sectionBlock: { paddingHorizontal: 20, marginBottom: 32 },
  locationTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  locationSubtitle: { color: '#A3A3A3', fontSize: 14, marginBottom: 16 },
  mapMockup: { height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#333' },
  hostRow: { flexDirection: 'row', alignItems: 'center' },
  hostAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#5D8B84', marginRight: 16 },
  hostName: { color: '#FFFFFF', fontSize: 18, fontWeight: '500' },
  avatarsRow: { flexDirection: 'row', marginBottom: 12 },
  goingAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFB8B8', borderWidth: 2, borderColor: '#000' },
  goingAvatarMore: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#666', borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center' },
  goingMoreText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  goingNames: { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  description: { color: '#FFFFFF', fontSize: 16, lineHeight: 24, marginBottom: 24 },
  aboutMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aboutMetaText: { color: '#FFFFFF', fontSize: 16, marginLeft: 12 },
  tagPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginTop: 16 },
  tagText: { color: '#A3A3A3', fontSize: 14, fontWeight: '500' },
});
