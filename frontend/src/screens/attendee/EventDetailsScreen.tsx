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
import { Button, Card, LoadingState, ErrorState, ScreenContainer, Input, IconButton, StatusBadge, AvatarStack } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { BookingService, EventService, PublicEventDetails, ReportService } from '../../api/services';
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Share2, Mail, MoreHorizontal, CheckCircle2, Ticket, UserRound } from 'lucide-react-native';
import { useAuthStore } from '../../store/auth.store';
import { LinearGradient } from 'expo-linear-gradient';

type Nav = NativeStackNavigationProp<AttendeeHomeStackParamList, 'EventDetails'>;
type Route = RouteProp<AttendeeHomeStackParamList, 'EventDetails'>;
interface Props { navigation: Nav; route: Route; }

const parseEventDateTime = (d: string, t: string) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return new Date(y, (m || 1) - 1, day || 1, h || 0, min || 0);
};

export const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, publicSlug } = route.params;
  const currentUser = useAuthStore((s) => s.user);
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
      setIsLoading(true); setError(null);
      const [eR, sR, tR] = await Promise.all([
        apiClient.get(`/events/${eventId}`),
        apiClient.get(`/sessions/event/${eventId}`),
        apiClient.get(`/tickets/event/${eventId}`),
      ]);
      const ed = eR.data.data.event as Event;
      setEvent(ed); setSessions(sR.data.data.sessions || []); setTickets(tR.data.data.tickets || []);
      const slug = publicSlug || ed.publicSlug;
      if (slug) { try { const pR = await EventService.getPublicEventBySlug(slug); setPublicData(pR.data); } catch { setPublicData(null); } }
      else setPublicData(null);
      if (ed.venueId) { const vR = await apiClient.get(`/venues/${ed.venueId}`); setVenue(vR.data.data.venue); }
      else setVenue(null);
      const recR = await EventService.getRecommendedEvents({ eventId: ed.id, limit: 6 });
      setRecommendedEvents(recR.data.events || []);
      EventService.incrementView(eventId).catch(() => {});
    } catch (e: any) { setError(e.response?.data?.message || 'Failed to load event details'); }
    finally { setIsLoading(false); }
  }, [eventId, publicSlug]);

  useFocusEffect(useCallback(() => { fetchEventDetails(); }, [fetchEventDetails]));

  const resolveShareUrl = () => {
    const slug = publicData?.event.publicSlug || event?.publicSlug || publicSlug;
    return slug ? (publicData?.event.publicUrl || EventService.buildPublicEventUrl(slug)) : '';
  };
  const handleShareEvent = async () => {
    if (!event) return; const url = resolveShareUrl();
    if (!url) { Alert.alert('Share Unavailable'); return; }
    await Share.share({ title: event.title, message: `Check out: ${url}`, url });
  };
  const handleContactHost = async () => {
    const host = publicData?.event.host; const contact = publicData?.event.contactDetails;
    if (!host && !contact) { Alert.alert('Contact Unavailable'); return; }
    const phone = (contact?.phone || host?.phone || '').trim();
    if (phone) { const u = `tel:${phone}`; if (await Linking.canOpenURL(u)) { await Linking.openURL(u); return; } }
    const email = (contact?.email || host?.email || '').trim();
    if (email) { const u = `mailto:${email}`; if (await Linking.canOpenURL(u)) { await Linking.openURL(u); return; } }
    Alert.alert('Contact Unavailable');
  };
  const handleCalendarAction = () => {
    if (!event) return;
    Alert.alert('Add to Calendar', '', [
      { text: 'Download ICS', onPress: async () => { try { const c = await EventService.getEventCalendar(event.id, true); const u = `data:text/calendar;charset=utf-8,${encodeURIComponent(String(c))}`; if (await Linking.canOpenURL(u)) await Linking.openURL(u); else Alert.alert('ICS Ready'); } catch (e: any) { Alert.alert('Error', e.response?.data?.message || 'Failed'); } } },
      { text: 'Device Calendar', onPress: async () => { try { await Calendar.createEventInCalendarAsync({ title: event.title, startDate: parseEventDateTime(event.date, event.startTime), endDate: parseEventDateTime(event.date, event.endTime), location: venue ? `${venue.name}, ${venue.city}` : event.city, notes: event.description }); } catch { Alert.alert('Error', 'Cannot open calendar'); } } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const handleRegisterFree = async () => {
    if (!event) return;
    try { setIsRegisteringFree(true);
      const res = await BookingService.createBooking({ eventId: event.id, quantity: 1 });
      const b = res?.data?.booking;
      if (!b?.id) { Alert.alert('Registered'); fetchEventDetails(); return; }
      if (b.isWaitlisted) Alert.alert('Waitlisted', b.waitlistPosition ? `Position #${b.waitlistPosition}` : 'Added to waitlist');
      else Alert.alert('Registered', 'Confirmed');
      navigation.navigate('BookingConfirmation', { bookingId: b.id });
    } catch (e: any) { const m = e?.response?.data?.message || 'Failed'; e?.response?.status === 409 ? Alert.alert('Already Registered', m) : Alert.alert('Failed', m); }
    finally { setIsRegisteringFree(false); }
  };
  const handleSubmitReport = async () => {
    if (!event || !reportReason.trim()) { Alert.alert('Enter a reason'); return; }
    try { setIsSubmittingReport(true); await ReportService.createReport({ targetType: 'event', targetId: event.id, reason: reportReason.trim() }); setReportReason(''); setShowReportForm(false); Alert.alert('Submitted'); }
    catch (e: any) { Alert.alert('Failed', e.response?.data?.message || 'Error'); }
    finally { setIsSubmittingReport(false); }
  };

  const canManageEvent = Boolean(publicData?.event.isManageableByCurrentUser || (currentUser && (event?.ownerId === currentUser.id || (event?.adminIds || []).includes(currentUser.id))));

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchEventDetails} /></ScreenContainer>;
  if (!event) return <ScreenContainer><ErrorState message="Event not found" onRetry={() => navigation.goBack()} /></ScreenContainer>;

  const isAvailable = tickets.some((t) => t.isActive && t.quantity > t.soldCount);
  const isEventFull = event.bookingCount >= event.capacity;
  const canRegister = event.visibility === 'public';
  const isFreeEvent = (event.pricingMode || 'ticketed') === 'free';
  const hasActionableInventory = isFreeEvent || isAvailable;
  const hostName = publicData?.event.host?.name || 'Host';
  const coverImage = publicData?.event.image || event.coverImage;
  const locationLabel = publicData?.event.location.label || (venue ? `${venue.name}, ${venue.city}` : event.city || 'Venue');
  const venueAddr = venue ? `${venue.address}, ${venue.city}` : event.city || '';
  const fmtDate = new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={s.screen}>
      {/* Warm gradient bg matching reference */}
      <LinearGradient colors={['#3A2D20', '#28201A', '#181512', '#111111']} locations={[0, 0.2, 0.45, 0.75]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={s.safe} edges={['top']}>

        {/* Header — back + share, exactly like ref */}
        <View style={s.hdr}>
          <IconButton icon={<ArrowLeft color="#fff" size={20} />} onPress={() => navigation.goBack()} variant="glass" size={40} />
          <View style={{ flex: 1 }} />
          <IconButton icon={<Share2 color="#fff" size={18} />} onPress={handleShareEvent} variant="glass" size={40} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── HERO POSTER (Luma: large image in rounded container) ── */}
          <View style={s.posterWrap}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={s.poster} resizeMode="cover" />
            ) : (
              <View style={[s.poster, s.posterEmpty]}>
                <CalendarIcon size={48} color={theme.colors.textMuted} />
              </View>
            )}
          </View>

          {/* ── "Featured in City" badge (Luma style) ── */}
          {event.city ? (
            <View style={s.featuredBadge}>
              <Text style={s.featuredText}>✨ Featured in {event.city} ✨</Text>
            </View>
          ) : null}

          {/* ── TITLE ── */}
          <Text style={s.title}>{event.title}</Text>

          {/* ── Org row: icon + name + chevron (exact ref match) ── */}
          <TouchableOpacity style={s.orgRow} activeOpacity={0.7}>
            <View style={s.orgDot}>
              <Text style={s.orgDotText}>{hostName.charAt(0)}</Text>
            </View>
            <Text style={s.orgName}>{hostName}</Text>
            <Text style={s.orgChevron}>›</Text>
          </TouchableOpacity>

          {/* ── Date/time line ── */}
          <Text style={s.dateLine}>{fmtDate}, {event.startTime} – {event.endTime}</Text>

          {/* ── "You're Going" badge (if applicable) ── */}
          {event.bookingCount > 0 && (
            <View style={s.goingRow}>
              <CheckCircle2 size={16} color={theme.colors.success} />
              <Text style={s.goingText}>{event.bookingCount} Going</Text>
            </View>
          )}

          {/* ── ACTION BUTTONS ROW (Luma: 3 outlined boxes, icon top, label below) ── */}
          <View style={s.actionRow}>
            {/* Register / Book */}
            <TouchableOpacity style={[s.actionBtn, s.actionBtnFirst]} onPress={() => { if (isFreeEvent) { handleRegisterFree(); return; } navigation.navigate('TicketSelection', { eventId }); }} activeOpacity={0.7}>
              <Ticket size={20} color={theme.colors.text} />
              <Text style={s.actionLabel}>{isFreeEvent ? 'Register' : 'Book'}</Text>
            </TouchableOpacity>
            {/* Contact */}
            <TouchableOpacity style={s.actionBtn} onPress={handleContactHost} activeOpacity={0.7}>
              <Mail size={20} color={theme.colors.text} />
              <Text style={s.actionLabel}>Contact</Text>
            </TouchableOpacity>
            {/* More */}
            <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('More', '', [
              { text: 'Add to Calendar', onPress: handleCalendarAction },
              { text: 'Share Event', onPress: handleShareEvent },
              { text: 'Report Event', onPress: () => setShowReportForm(true) },
              { text: 'Cancel', style: 'cancel' },
            ])} activeOpacity={0.7}>
              <MoreHorizontal size={20} color={theme.colors.text} />
              <Text style={s.actionLabel}>More</Text>
            </TouchableOpacity>
          </View>

          {/* ── LOCATION SECTION (Luma: label + venue name + address) ── */}
          <View style={s.section}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>Location</Text>
            <Text style={s.venueName}>{venue?.name || locationLabel}</Text>
            {venueAddr ? <Text style={s.venueAddr}>{venueAddr}</Text> : null}
          </View>

          {/* ── HOST SECTION (Luma: Host / Contact labels, avatar + name) ── */}
          <View style={s.section}>
            <View style={s.sectionLine} />
            <View style={s.hostLabelRow}>
              <Text style={s.sectionLabel}>Host</Text>
              <TouchableOpacity onPress={handleContactHost}><Text style={s.sectionLabel}>Contact</Text></TouchableOpacity>
            </View>
            <View style={s.hostInfo}>
              <View style={s.hostAvatar}><Text style={s.hostInitial}>{hostName.charAt(0)}</Text></View>
              <Text style={s.hostName}>{hostName}</Text>
            </View>
          </View>

          {/* ── ATTENDEES (Luma: "X Going" + avatar stack + names) ── */}
          {event.bookingCount > 0 && (
            <View style={s.section}>
              <View style={s.sectionLine} />
              <Text style={s.attendeeCount}>{event.bookingCount} Going</Text>
              <AvatarStack count={event.bookingCount} maxVisible={4} size={40} />
            </View>
          )}

          {/* ── ABOUT EVENT (Luma: amber/muted label + body text) ── */}
          <View style={s.section}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>About Event</Text>
            <Text style={s.aboutText}>{event.description}</Text>
          </View>

          {/* ── AGENDA ── */}
          {sessions.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionLine} />
              <Text style={s.sectionLabel}>Agenda</Text>
              {sessions.map((ses) => (
                <View key={ses.id} style={s.sessionRow}>
                  <Text style={s.sessionTitle}>{ses.title}</Text>
                  <Text style={s.sessionTime}>{ses.startTime} – {ses.endTime}</Text>
                  {ses.speakerName && <Text style={s.sessionSpeaker}>Speaker: {ses.speakerName}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* ── TAGS (Luma: pill chips at bottom) ── */}
          {((event.tags && event.tags.length > 0) || event.category) && (
            <View style={s.tags}>
              {event.category && <View style={s.tagPill}><Text style={s.tagText}># {event.category}</Text></View>}
              {event.tags?.map((t, i) => <View key={i} style={s.tagPill}><Text style={s.tagText}># {t}</Text></View>)}
            </View>
          )}

          {/* ── REPORT FORM ── */}
          {showReportForm && (
            <View style={s.reportWrap}>
              <Input label="Reason" value={reportReason} onChangeText={setReportReason} placeholder="What's wrong?" multiline />
              <Button title="Submit Report" onPress={handleSubmitReport} isLoading={isSubmittingReport} variant="primary" size="md" />
            </View>
          )}

          {/* ── MANAGER ACTIONS ── */}
          {canManageEvent && (
            <View style={s.section}>
              <View style={s.sectionLine} />
              <Text style={s.sectionLabel}>Manager Actions</Text>
              <View style={s.manageGrid}>
                <Button title="Edit Event" onPress={() => navigation.navigate('EventForm', { eventId: event.id })} variant="secondary" size="sm" />
                <Button title="Guest List" onPress={() => navigation.navigate('ManageRegistrations', { eventId: event.id })} variant="secondary" size="sm" />
                <Button title="Manage Tickets" onPress={() => navigation.navigate('ManageTickets', { eventId: event.id })} variant="secondary" size="sm" />
                <Button title="Copy URL" onPress={async () => { const u = resolveShareUrl(); if (u) { await Clipboard.setStringAsync(u); Alert.alert('Copied'); } }} variant="ghost" size="sm" />
              </View>
              <View style={s.manageSection}>
                <Text style={s.manageSub}>Add Event Admin</Text>
                <Input label="Email" value={eventAdminEmail} onChangeText={setEventAdminEmail} placeholder="user@example.com" autoCapitalize="none" keyboardType="email-address" />
                <Button title="Add Admin" onPress={async () => { if (!eventAdminEmail.trim()) return; try { setIsAddingEventAdmin(true); await EventService.addEventAdmin(event.id, { email: eventAdminEmail.trim() }); setEventAdminEmail(''); Alert.alert('Added'); fetchEventDetails(); } catch (e: any) { Alert.alert('Failed', e?.response?.data?.message || 'Error'); } finally { setIsAddingEventAdmin(false); } }} isLoading={isAddingEventAdmin} variant="primary" size="md" />
              </View>
              <View style={s.manageSection}>
                <Text style={s.manageSub}>Blast Message</Text>
                <Input label="Title" value={blastTitle} onChangeText={setBlastTitle} placeholder="Update title" />
                <Input label="Message" value={blastMessage} onChangeText={setBlastMessage} placeholder="Your message" multiline />
                <Button title="Send Blast" onPress={async () => { if (!blastTitle.trim() || !blastMessage.trim()) { Alert.alert('Missing fields'); return; } try { setIsSendingBlast(true); await EventService.blastMessage(event.id, { subject: blastTitle.trim(), message: blastMessage.trim() }); setBlastTitle(''); setBlastMessage(''); Alert.alert('Sent'); } catch (e: any) { Alert.alert('Failed', e?.response?.data?.message || 'Error'); } finally { setIsSendingBlast(false); } }} isLoading={isSendingBlast} variant="primary" size="md" />
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── BOTTOM CTA ── */}
        <View style={s.footer}>
          {isEventFull && <Text style={s.waitHint}>Event full — joining adds you to the waitlist</Text>}
          <Button
            title={isEventFull ? 'Join Waitlist' : isFreeEvent ? 'Register' : isAvailable ? 'Book Tickets' : 'Sold Out'}
            disabled={!canRegister || event.status !== 'published' || (!isEventFull && !hasActionableInventory)}
            isLoading={isFreeEvent && isRegisteringFree}
            onPress={() => { if (isFreeEvent) { handleRegisterFree(); return; } navigation.navigate('TicketSelection', { eventId }); }}
            variant="primary" size="lg"
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111111' },
  safe: { flex: 1 },
  hdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  scroll: { paddingBottom: 20 },

  // Poster — matches ref: large image, rounded, horizontal padding
  posterWrap: { paddingHorizontal: 16, marginBottom: 12 },
  poster: { width: '100%', aspectRatio: 0.85, borderRadius: 16, overflow: 'hidden' },
  posterEmpty: { backgroundColor: '#1C1A17', justifyContent: 'center', alignItems: 'center' },

  // "Featured in" badge — centered, subtle
  featuredBadge: { alignItems: 'center', marginBottom: 16 },
  featuredText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },

  // Title — large bold, matches ref
  title: { fontSize: 26, fontWeight: '700', color: '#F5F5F0', paddingHorizontal: 16, marginBottom: 10, letterSpacing: -0.5 },

  // Org row — icon + name + chevron, matches ref exactly
  orgRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6, gap: 8 },
  orgDot: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(139,92,246,0.2)', justifyContent: 'center', alignItems: 'center' },
  orgDotText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  orgName: { fontSize: 15, color: theme.colors.textSecondary, flex: 1 },
  orgChevron: { fontSize: 20, color: theme.colors.textSecondary },

  // Date line
  dateLine: { fontSize: 14, color: theme.colors.textSecondary, paddingHorizontal: 16, marginBottom: 8 },

  // Going badge
  goingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  goingText: { fontSize: 14, fontWeight: '600', color: theme.colors.success },

  // Action buttons row — EXACT ref match: 3 equal outlined boxes
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 24 },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent', gap: 6,
  },
  actionBtnFirst: { borderColor: 'rgba(255,255,255,0.15)' },
  actionLabel: { fontSize: 12, fontWeight: '500', color: '#F5F5F0' },

  // Sections — line + label + content
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.sectionLabel, marginBottom: 10 },

  // Location
  venueName: { fontSize: 17, fontWeight: '600', color: '#F5F5F0', marginBottom: 4 },
  venueAddr: { fontSize: 14, color: theme.colors.textSecondary },

  // Host
  hostLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hostAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(139,92,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  hostInitial: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  hostName: { fontSize: 16, fontWeight: '600', color: '#F5F5F0' },

  // Attendees
  attendeeCount: { fontSize: 15, fontWeight: '600', color: theme.colors.primary, marginBottom: 10 },

  // About
  aboutText: { fontSize: 15, lineHeight: 24, color: '#F5F5F0' },

  // Sessions
  sessionRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  sessionTitle: { fontSize: 16, fontWeight: '600', color: '#F5F5F0' },
  sessionTime: { fontSize: 12, color: theme.colors.primary, marginTop: 4 },
  sessionSpeaker: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },

  // Tags
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 20 },
  tagPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  tagText: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary },

  // Report
  reportWrap: { paddingHorizontal: 16, marginBottom: 20, gap: 8 },

  // Manager
  manageGrid: { gap: 8 },
  manageSection: { marginTop: 16 },
  manageSub: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },

  // Footer CTA
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 36, backgroundColor: 'rgba(17,17,17,0.96)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  waitHint: { fontSize: 12, color: theme.colors.warning, marginBottom: 6 },
});
