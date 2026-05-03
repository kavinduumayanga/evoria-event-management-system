import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Share as RNShare, Linking, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Event, Venue, TicketType } from '../../types';
import { LoadingState, ErrorState, ScreenContainer, HeaderBar, PrimaryButton, SecondaryButton, SectionBlock } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { EventService, PublicEventDetails, ReportService } from '../../api/services';
import { MapPin, Calendar as CalendarIcon, Clock, MoreHorizontal, Mail, Ticket } from 'lucide-react-native';
import { formatSafeDate, formatSafeTime, safeStatus, safeString, safeTitle } from '../../utils/safeText';
import { resolveImageUrl } from '../../utils/imageUrl';
import { LinearGradient } from 'expo-linear-gradient';
import { safeArray } from '../../utils/safeData';

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
  const [isMoreModalVisible, setIsMoreModalVisible] = useState(false);

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      setError(null);
      setEvent(null);
      setVenue(null);
      setTickets([]);
      setPublicData(null);

      const [eventRes, ticketsRes] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`),
      ]);

      const eventData = eventRes?.data?.data?.event as Event | undefined;
      if (!eventData?.id) {
        throw new Error('Invalid event payload');
      }

      setEvent(eventData);
      setTickets(safeArray<TicketType>(ticketsRes?.data?.data?.tickets));

      if (eventData.venueId) {
        try {
          const venueRes = await apiClient.get(`/venues/${eventData.venueId}`);
          setVenue((venueRes?.data?.data?.venue as Venue) || null);
        } catch {
          setVenue(null);
        }
      }

      const resolvedSlug = publicSlug || eventData.publicSlug;
      if (resolvedSlug) {
        try {
          setPublicData((await EventService.getPublicEventBySlug(resolvedSlug)).data);
        } catch (publicError: any) {
          if (__DEV__) {
            console.warn('Unable to load public event details', publicError?.response?.data || publicError?.message || publicError);
          }
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId, publicSlug]);

  useFocusEffect(useCallback(() => { fetchEventDetails(); }, [fetchEventDetails]));

  if (!eventId) return <ScreenContainer><ErrorState message="Missing event details." onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;
  if (isLoading) return <LoadingState />;
  if (error || !event) return <ScreenContainer><ErrorState message={error || "Event not found"} onRetry={() => navigation.goBack()} actionLabel="Go Back" /></ScreenContainer>;

  const host = typeof publicData?.event.host === 'object' && publicData?.event.host ? publicData.event.host : null;
  const hostName = safeTitle(host?.name, 'Host unavailable');
  const coverImage = resolveImageUrl(publicData?.event.image || event.coverImage);
  const formattedDate = formatSafeDate(event.date, 'Date unavailable', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isSoldOut = Number(event.capacity) > 0 && Number(event.bookingCount) >= Number(event.capacity);
  const hasRegistrationInventory = safeString(event.pricingMode, 'ticketed') === 'free' || tickets.some(t => t.isActive && t.quantity > t.soldCount);
  const canRegister = safeStatus(event.status, 'draft') === 'published' && safeString(event.visibility, 'private') === 'public' && !isSoldOut && hasRegistrationInventory;
  const isManageableByCurrentUser = Boolean(publicData?.event?.isManageableByCurrentUser);
  const isCancelled = safeStatus(event.status, 'draft') === 'cancelled';
  const toFiniteCoordinate = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const rawLocation = (event as any).location;
  const publicLocation = publicData?.event?.location;
  const eventLocationName = typeof rawLocation === 'string'
    ? rawLocation.trim()
    : safeString(rawLocation?.name, '').trim();
  const eventLocationAddress = typeof rawLocation === 'object' && rawLocation
    ? safeString(rawLocation.address, '').trim()
    : '';
  const locationName = eventLocationName || safeString(publicLocation?.name || publicLocation?.label, '').trim();
  const locationAddress = eventLocationAddress || safeString(publicLocation?.address, '').trim();
  const eventLat = typeof rawLocation === 'object' && rawLocation ? toFiniteCoordinate(rawLocation.lat) : null;
  const eventLng = typeof rawLocation === 'object' && rawLocation ? toFiniteCoordinate(rawLocation.lng) : null;
  const publicLat = toFiniteCoordinate(publicLocation?.lat);
  const publicLng = toFiniteCoordinate(publicLocation?.lng);
  const resolvedLat = eventLat ?? publicLat;
  const resolvedLng = eventLng ?? publicLng;
  const hasLocationCoordinates = resolvedLat !== null && resolvedLng !== null && (resolvedLat !== 0 || resolvedLng !== 0);
  const locationCoordinates = hasLocationCoordinates
    ? { lat: resolvedLat as number, lng: resolvedLng as number }
    : null;
  const goingCount = Number.isFinite(Number(event.bookingCount)) ? Number(event.bookingCount) : 0;
  const categoryLabel = safeString(publicData?.event?.topic || event.category, '').trim();

  const legacyAgendaSource = Array.isArray((event as any)?.agenda)
    ? (event as any).agenda
    : Array.isArray((event as any)?.agendas)
      ? (event as any).agendas
      : [];
  const legacyAgendaSessions = safeArray<any>(legacyAgendaSource).map((item, index) => ({
    id: safeString(item?.id, `legacy-${index}`),
    title: safeString(item?.title || item?.name, 'Session'),
    startTime: safeString(item?.startTime || item?.time, ''),
    endTime: safeString(item?.endTime, ''),
    speakerName: safeString(item?.speakerName || item?.speaker, ''),
    description: safeString(item?.description || item?.details, ''),
  }));
  const agendaSessions = safeArray<any>(publicData?.agenda?.sessions).length > 0
    ? safeArray<any>(publicData?.agenda?.sessions)
    : legacyAgendaSessions;

  const buildMapTilePreviewUrl = (lat: number, lng: number) => {
    const zoom = 14;
    const clampedLat = Math.max(Math.min(lat, 85.0511), -85.0511);
    const xTile = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
    const yTile = Math.floor(
      ((1 - Math.log(Math.tan((clampedLat * Math.PI) / 180) + (1 / Math.cos((clampedLat * Math.PI) / 180))) / Math.PI) / 2) * Math.pow(2, zoom)
    );
    return `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;
  };

  const handleShare = async () => {
    const slug = publicSlug || event.publicSlug;
    if (!slug) return;
    try {
      await RNShare.share({
        message: `Check out this event: ${EventService.buildPublicEventUrl(slug)}`,
      });
    } catch (e) {}
  };

  const handleContact = () => {
    const email = publicData?.event.contactDetails?.email || host?.email;
    if (email) Linking.openURL(`mailto:${email}`);
  };

  const handleAddToCalendar = async () => {
    if (!eventId) return;
    const url = EventService.getCalendarIcsUrl(eventId);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Unable to open calendar link.');
      return;
    }
    await Linking.openURL(url);
  };

  const reportEvent = async (reason: string) => {
    if (!eventId) return;
    try {
      await ReportService.createReport({
        targetType: 'event',
        targetId: eventId,
        reason,
      });
      Alert.alert('Reported', 'Thanks for reporting. Our moderation team will review this event.');
    } catch (reportError: any) {
      Alert.alert('Report Failed', reportError?.response?.data?.message || 'Unable to submit report right now.');
    }
  };

  const handleReportEvent = () => {
    Alert.alert('Report Event', 'Why are you reporting this event?', [
      { text: 'Spam', onPress: () => reportEvent('Spam or misleading event content') },
      { text: 'Inappropriate', onPress: () => reportEvent('Inappropriate or abusive event content') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditEvent = () => {
    if (!eventId) return;
    navigation.navigate('EventForm', { eventId });
  };

  const handleCancelEvent = () => {
    if (!eventId) return;
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await EventService.updateEventStatus(eventId, 'cancelled');
              await fetchEventDetails();
            } catch (cancelError: any) {
              Alert.alert('Error', cancelError?.response?.data?.message || 'Failed to cancel event.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = () => {
    if (!eventId) return;
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await EventService.deleteEvent(eventId);
              navigation.goBack();
            } catch (deleteError: any) {
              Alert.alert('Error', deleteError?.response?.data?.message || 'Failed to delete event.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#4A4232', '#000000']} style={StyleSheet.absoluteFillObject} />
      <HeaderBar variant="event" transparent onShare={handleShare} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageCard}>
          {coverImage ? <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" /> : <View style={styles.coverPlaceholder} />}
          <View style={styles.featuredPill}>
            <Text style={styles.featuredText}>Featured Event</Text>
          </View>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.title}>{safeTitle(event.title, 'Untitled Event')}</Text>
          {isCancelled ? <Text style={styles.cancelledChip}>Cancelled</Text> : null}
          <View style={styles.calendarRow}>
            <View style={styles.calendarIcon} />
            <Text style={styles.calendarText}>{hostName} Events</Text>
          </View>
          <Text style={styles.timeText}>
            {formattedDate} • {formatSafeTime(event.startTime, 'Time unavailable')} - {formatSafeTime(event.endTime, 'Time unavailable')}
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
              onPress={handleContact}
            />
          </View>
          <View style={styles.actionFlex1}>
            <SecondaryButton
              title="More"
              icon={<MoreHorizontal color="#FFF" size={20} />}
              onPress={() => setIsMoreModalVisible(true)}
            />
          </View>
        </View>

        {isManageableByCurrentUser ? (
          <View style={styles.ownerActionsRow}>
            <TouchableOpacity style={styles.ownerActionButton} onPress={handleEditEvent} activeOpacity={0.85}>
              <Text style={styles.ownerActionText}>Edit Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ownerActionButton, isCancelled && styles.ownerActionDisabled]}
              onPress={handleCancelEvent}
              activeOpacity={0.85}
              disabled={isCancelled}
            >
              <Text style={styles.ownerActionText}>Cancel Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ownerActionButton, styles.ownerActionDelete]} onPress={handleDeleteEvent} activeOpacity={0.85}>
              <Text style={styles.ownerActionDeleteText}>Delete Event</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <SectionBlock title="Location" style={styles.sectionBlock}>
          {event.type === 'online' && !locationName ? (
            <Text style={styles.locationTitle}>Online Event</Text>
          ) : (
            <>
              <Text style={styles.locationTitle} numberOfLines={2}>
                {locationName || venue?.name || 'TBA'}
              </Text>
              {(locationAddress || venue?.address) ? (
                <Text style={styles.locationSubtitle} numberOfLines={2}>
                  {locationAddress || venue?.address}
                </Text>
              ) : null}

              {/* Map preview – opens OSM on tap */}
              {locationCoordinates ? (
                <TouchableOpacity
                  style={styles.mapMockup}
                  activeOpacity={0.85}
                  onPress={() => {
                    const { lat, lng } = locationCoordinates;
                    Linking.openURL(
                      `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
                    );
                  }}
                >
                  <Image
                    source={{ uri: buildMapTilePreviewUrl(locationCoordinates.lat, locationCoordinates.lng) }}
                    style={StyleSheet.absoluteFillObject}
                    defaultSource={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600&auto=format&fit=crop' }}
                  />
                  <View style={styles.mapPinMarker}>
                    <MapPin size={16} color="#0B0B0C" />
                  </View>
                  <View style={styles.mapOpenBadge}>
                    <Text style={styles.mapOpenText}>Open in Maps</Text>
                  </View>
                </TouchableOpacity>
              ) : (venue?.address || locationName) ? (
                <TouchableOpacity
                  style={[styles.mapMockup, styles.mapFallback]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const query = venue?.address || locationName || '';
                    if (query) Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`);
                  }}
                >
                  <Text style={styles.mapFallbackText}>Open location in Maps</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </SectionBlock>

        <SectionBlock title="Host" style={styles.sectionBlock}>
          <View style={styles.hostRow}>
            <View style={styles.hostAvatar} />
            <Text style={styles.hostName}>{hostName}</Text>
          </View>
        </SectionBlock>

        <SectionBlock title={`${goingCount} Going`} style={styles.sectionBlock}>
          <View style={styles.avatarsRow}>
            {[1, 2, 3, 4].map(i => <View key={i} style={[styles.goingAvatar, { zIndex: 5 - i, marginLeft: i === 1 ? 0 : -10 }]} />)}
            <View style={[styles.goingAvatarMore, { zIndex: 0, marginLeft: -10 }]}><Text style={styles.goingMoreText}>+950</Text></View>
          </View>
          <Text style={styles.goingNames}>Attendees who registered for this event will appear here over time.</Text>
        </SectionBlock>

        <SectionBlock title="About Event" style={styles.sectionBlock}>
          <Text style={styles.description}>{safeString(event.description, 'No description available.')}</Text>
          <View style={styles.aboutMetaRow}>
            <MapPin size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{locationName || venue?.name || 'Online / TBA'}</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <CalendarIcon size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{formattedDate}</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Clock size={16} color="#A3A3A3" />
            <Text style={styles.aboutMetaText}>{formatSafeTime(event.startTime, '11:00 AM')} – {formatSafeTime(event.endTime, '8:00 PM')}</Text>
          </View>
          
          {categoryLabel ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}># {categoryLabel}</Text>
            </View>
          ) : null}
        </SectionBlock>

        <SectionBlock title="Agenda" style={styles.sectionBlock}>
          {agendaSessions.length === 0 ? (
            <Text style={styles.agendaEmptyText}>No agenda has been added for this event yet.</Text>
          ) : (
            <View style={styles.agendaList}>
              {agendaSessions.map((session, index) => {
                const sessionTitle = safeString(session.title, 'Session');
                const hasStart = safeString(session.startTime, '').trim().length > 0;
                const hasEnd = safeString(session.endTime, '').trim().length > 0;
                const speaker = safeString(session.speakerName, '').trim() || safeString(host?.name, '').trim();
                const description = safeString(session.description, '').trim();

                return (
                  <View key={`${safeString(session.id, 'agenda')}-${index}`} style={styles.agendaCard}>
                    <Text style={styles.agendaTitle}>{sessionTitle}</Text>
                    {(hasStart || hasEnd) ? (
                      <View style={styles.agendaMetaRow}>
                        <Clock size={14} color="#A3A3A3" />
                        <Text style={styles.agendaMetaText}>
                          {hasStart && hasEnd ? `${session.startTime} - ${session.endTime}` : (session.startTime || session.endTime)}
                        </Text>
                      </View>
                    ) : null}
                    {speaker ? (
                      <View style={styles.agendaMetaRow}>
                        <Text style={styles.agendaMetaLabel}>Speaker</Text>
                        <Text style={styles.agendaMetaText}>{speaker}</Text>
                      </View>
                    ) : null}
                    {description ? <Text style={styles.agendaDescription}>{description}</Text> : null}
                  </View>
                );
              })}
            </View>
          )}
        </SectionBlock>
      </ScrollView>

      <Modal visible={isMoreModalVisible} transparent animationType="slide" onRequestClose={() => setIsMoreModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMoreModalVisible(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>More Options</Text>
            <TouchableOpacity style={styles.sheetOption} onPress={async () => { setIsMoreModalVisible(false); await handleAddToCalendar(); }}>
              <Text style={styles.sheetOptionText}>Add to Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setIsMoreModalVisible(false); const slug = publicSlug || event.publicSlug; if (slug) Linking.openURL(EventService.buildPublicEventUrl(slug)); }}>
              <Text style={styles.sheetOptionText}>Open in Browser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetOption} onPress={() => { setIsMoreModalVisible(false); handleReportEvent(); }}>
              <Text style={[styles.sheetOptionText, { color: '#FF453A' }]}>Report Event</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  cancelledChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'rgba(250,82,82,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(250,82,82,0.6)',
    color: '#FA5252',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  calendarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  calendarIcon: { width: 16, height: 16, backgroundColor: '#A3A3A3', borderRadius: 4, marginRight: 8 },
  calendarText: { color: '#A3A3A3', fontSize: 16, fontWeight: '500' },
  timeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  actionFlex1: { flex: 1 },
  ownerActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  ownerActionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  ownerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ownerActionDelete: {
    borderColor: 'rgba(250,82,82,0.75)',
    backgroundColor: 'rgba(250,82,82,0.16)',
  },
  ownerActionDeleteText: {
    color: '#FA5252',
    fontSize: 12,
    fontWeight: '700',
  },
  ownerActionDisabled: {
    opacity: 0.45,
  },
  sectionBlock: { paddingHorizontal: 20, marginBottom: 32 },
  locationTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  locationSubtitle: { color: '#A3A3A3', fontSize: 14, marginBottom: 16 },
  mapMockup: { height: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: '#333', marginTop: 12 },
  mapPinMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginTop: 56,
  },
  mapOpenBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapOpenText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  mapFallbackText: { color: '#A3A3A3', fontSize: 15, fontWeight: '500' },
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
  agendaList: { gap: 12 },
  agendaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    ...theme.shadows.sm,
  },
  agendaTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  agendaMetaLabel: {
    color: '#A3A3A3',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agendaMetaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  agendaDescription: {
    color: '#CFCFCF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  agendaEmptyText: {
    color: '#A3A3A3',
    fontSize: 14,
    lineHeight: 21,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  sheetOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  sheetOptionText: { color: '#FFFFFF', fontSize: 16 },
});
