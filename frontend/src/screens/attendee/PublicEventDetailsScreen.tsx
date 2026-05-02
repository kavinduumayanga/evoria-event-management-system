import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Share2, Link as LinkIcon, Phone, Mail, Ticket as TicketIcon } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Button, Card, ErrorState, IconButton, Input, LoadingState, ScreenContainer, StatusBadge } from '../../components';
import { EventService, PublicEventDetails, RegistrationService } from '../../api/services';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';

type PublicEventNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;
type PublicEventRouteProp = RouteProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;
interface Props { navigation: PublicEventNavigationProp; route: PublicEventRouteProp; }

export const PublicEventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { slug } = route.params;
  const currentUser = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicData, setPublicData] = useState<PublicEventDetails | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [nic, setNic] = useState('');
  const [customAnswerMap, setCustomAnswerMap] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);

  const fetchPublicEvent = async () => {
    try {
      setError(null);
      const res = await EventService.getPublicEventBySlug(slug);
      setPublicData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { setIsLoading(true); fetchPublicEvent(); }, [slug]));

  useEffect(() => {
    if (!currentUser) return;
    setName((p) => p || currentUser.name || '');
    setEmail((p) => p || currentUser.email || '');
    setMobile((p) => p || currentUser.phone || '');
  }, [currentUser]);

  const event = publicData?.event;
  const sessions = publicData?.agenda.sessions || [];
  const tickets = publicData?.tickets || [];
  const registrationQuestions = publicData?.registrationFields?.customQuestions || [];
  const isLoggedIn = Boolean(currentUser?.id);

  const requiredQuestionIds = useMemo(
    () => new Set(registrationQuestions.filter((q) => q.required).map((q) => q.id)),
    [registrationQuestions],
  );

  const handleShare = async () => {
    if (!event?.publicUrl) return;
    await Share.share({ title: event.title, message: `Check out this event: ${event.publicUrl}`, url: event.publicUrl });
  };

  const handleCopyLink = async () => {
    if (!event?.publicUrl) return;
    await Clipboard.setStringAsync(event.publicUrl);
    Alert.alert('Copied', 'Event URL copied to clipboard.');
  };

  const handleContact = async () => {
    if (!event) return;
    const phone = (event.contactDetails?.phone || event.host?.phone || '').trim();
    if (phone) {
      const url = `tel:${phone}`;
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    }
    const em = (event.contactDetails?.email || event.host?.email || '').trim();
    if (em) {
      const url = `mailto:${em}`;
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    }
    Alert.alert('Contact unavailable', 'No valid host contact method found.');
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Invalid email address';
    if (!mobile.trim()) errors.mobile = 'Mobile is required';
    if (!nic.trim()) errors.nic = 'NIC is required';
    for (const q of registrationQuestions) {
      if (!requiredQuestionIds.has(q.id)) continue;
      if (!(customAnswerMap[q.id] || '').trim()) errors[`q_${q.id}`] = 'This field is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRegistration = async () => {
    if (!event) return;
    if (!validateForm()) return;
    try {
      setIsSubmittingRegistration(true);
      const customAnswers = registrationQuestions
        .map((q) => ({ questionId: q.id, answer: (customAnswerMap[q.id] || '').trim() }))
        .filter((a) => a.answer.length > 0);
      const res = await RegistrationService.submitPublicRegistration(event.publicSlug, {
        name: name.trim(), email: email.trim(), mobile: mobile.trim(), nic: nic.trim(), customAnswers,
      });
      const status = res.data.registration.status;
      setRegistrationStatus(status);
      await fetchPublicEvent();
      Alert.alert('Registration Submitted', `Your registration status is ${status.toUpperCase()}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to submit registration';
      Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Registration Failed', msg);
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error || !event) {
    return <ScreenContainer><ErrorState message={error || 'Event not found'} onRetry={fetchPublicEvent} /></ScreenContainer>;
  }

  const isSoldOut = tickets.every((t) => t.remaining <= 0);
  const isTicketedEvent = event.pricingMode === 'ticketed';

  return (
    <ScreenContainer style={styles.screen}>
      {/* Floating back button */}
      <View style={styles.headerOverlay}>
        <IconButton
          icon={<ArrowLeft color={theme.colors.text} size={20} />}
          onPress={() => navigation.goBack()}
          variant="surface"
          size={36}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover image */}
        {event.image ? (
          <Image source={{ uri: event.image }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <TicketIcon size={40} color={theme.colors.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          {/* Title + topic */}
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.topic && <Text style={styles.topic}>{event.topic}</Text>}

          {/* Meta card */}
          <Card variant="raised" style={styles.metaCard} noPadding>
            <View style={styles.metaCardInner}>
              <View style={styles.metaRow}>
                <CalendarIcon size={14} color={theme.colors.primary} />
                <Text style={styles.metaText}>{event.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={14} color={theme.colors.secondary} />
                <Text style={styles.metaText}>{event.startTime} – {event.endTime}</Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={14} color={theme.colors.accent} />
                <Text style={styles.metaText}>{event.location.label}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaTagRow}>
                <StatusBadge status="info" label={event.type.toUpperCase()} />
                <StatusBadge status={event.visibility === 'public' ? 'success' : 'warning'} label={event.visibility.toUpperCase()} />
              </View>
              {event.host && <Text style={styles.hostText}>Hosted by {event.host.name}</Text>}
            </View>
          </Card>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionChip} onPress={handleShare}>
              <Share2 size={14} color={theme.colors.text} />
              <Text style={styles.actionChipText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip} onPress={handleCopyLink}>
              <LinkIcon size={14} color={theme.colors.text} />
              <Text style={styles.actionChipText}>Copy URL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionChip} onPress={handleContact}>
              <Phone size={14} color={theme.colors.text} />
              <Text style={styles.actionChipText}>Contact</Text>
            </TouchableOpacity>
          </View>

          {event.isManageableByCurrentUser && (
            <Button
              title="Open Manage View"
              onPress={() => navigation.navigate('EventDetails', { eventId: event.id, publicSlug: event.publicSlug })}
              variant="secondary"
              size="sm"
              style={styles.manageBtn}
            />
          )}

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>{event.about}</Text>
          </View>

          {/* Agenda */}
          {sessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Agenda</Text>
              {sessions.map((session) => (
                <Card key={session.id} variant="raised" style={styles.sessionCard} noPadding>
                  <View style={styles.sessionInner}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionMeta}>{session.sessionDate} · {session.startTime} – {session.endTime}</Text>
                    {session.speakerName && <Text style={styles.sessionMeta}>Speaker: {session.speakerName}</Text>}
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Tickets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            {tickets.length > 0 ? tickets.map((ticket) => (
              <Card key={ticket.id} variant="raised" style={styles.ticketCard} noPadding>
                <View style={styles.ticketInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text style={styles.ticketPrice}>
                      {ticket.isFree ? 'Free' : `${ticket.currency} ${ticket.price.toFixed(2)}`}
                    </Text>
                  </View>
                  <StatusBadge
                    status={ticket.remaining > 0 ? 'success' : 'error'}
                    label={ticket.remaining > 0 ? `${ticket.remaining} left` : 'Sold out'}
                  />
                </View>
              </Card>
            )) : (
              <Text style={styles.sectionText}>No active tickets available.</Text>
            )}
          </View>

          {/* Registration form (non-ticketed only) */}
          {!isTicketedEvent && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Register</Text>
              <Card variant="raised" style={styles.registrationCard} noPadding>
                <View style={styles.registrationInner}>
                  <Input label="Name *" value={name} onChangeText={setName} placeholder="Your full name" error={formErrors.name} />
                  <Input
                    label="Email *"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={formErrors.email}
                  />
                  <Input label="Mobile *" value={mobile} onChangeText={setMobile} placeholder="+94 77 123 4567" error={formErrors.mobile} />
                  <Input label="NIC *" value={nic} onChangeText={setNic} placeholder="200012345678" error={formErrors.nic} />

                  {registrationQuestions.map((q) => (
                    <Input
                      key={q.id}
                      label={`${q.question}${q.required ? ' *' : ''}`}
                      value={customAnswerMap[q.id] || ''}
                      onChangeText={(v) => {
                        setCustomAnswerMap((p) => ({ ...p, [q.id]: v }));
                        setFormErrors((p) => ({ ...p, [`q_${q.id}`]: '' }));
                      }}
                      placeholder={q.type === 'number' ? 'Enter a number' : 'Your answer'}
                      keyboardType={q.type === 'number' ? 'numeric' : 'default'}
                      error={formErrors[`q_${q.id}`]}
                    />
                  ))}

                  {registrationStatus && (
                    <View style={styles.statusBanner}>
                      <Text style={styles.statusLabel}>Registration Status</Text>
                      <StatusBadge
                        status={registrationStatus === 'approved' ? 'success' : registrationStatus === 'pending' ? 'warning' : 'error'}
                        label={registrationStatus.toUpperCase()}
                      />
                    </View>
                  )}
                </View>
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky footer CTA */}
      <View style={styles.footer}>
        <Button
          title={
            isTicketedEvent
              ? (isLoggedIn ? (isSoldOut ? 'Sold Out' : 'Book Tickets') : 'Login to Book')
              : 'Submit Registration'
          }
          disabled={isTicketedEvent ? (isSoldOut || !isLoggedIn) : isSubmittingRegistration}
          onPress={() => {
            if (isTicketedEvent) { navigation.navigate('TicketSelection', { eventId: event.id }); return; }
            handleSubmitRegistration();
          }}
          isLoading={isSubmittingRegistration}
          variant="primary"
          size="lg"
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: { padding: 0 },
  headerOverlay: { position: 'absolute', top: 52, left: theme.spacing.base, zIndex: 20 },
  scrollContent: { paddingBottom: 110 },
  coverImage: { width: '100%', height: 240 },
  coverPlaceholder: {
    width: '100%', height: 240, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  content: { padding: theme.spacing.base },
  eventTitle: { ...theme.typography.h1, color: theme.colors.text, marginTop: theme.spacing.m },
  topic: { ...theme.typography.body, color: theme.colors.textSecondary, marginTop: 4 },
  metaCard: { marginTop: theme.spacing.m, borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  metaCardInner: { padding: theme.spacing.m, gap: theme.spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s },
  metaText: { ...theme.typography.body, color: theme.colors.textSecondary },
  metaDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xs },
  metaTagRow: { flexDirection: 'row', gap: theme.spacing.s, flexWrap: 'wrap' },
  hostText: { ...theme.typography.caption, color: theme.colors.textMuted },
  actionRow: { flexDirection: 'row', gap: theme.spacing.s, marginTop: theme.spacing.m, flexWrap: 'wrap' },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.round, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  actionChipText: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '600' },
  manageBtn: { marginTop: theme.spacing.m },
  section: { marginTop: theme.spacing.xl },
  sectionTitle: { ...theme.typography.h2, color: theme.colors.text, marginBottom: theme.spacing.m },
  sectionText: { ...theme.typography.body, color: theme.colors.textSecondary },
  sessionCard: { borderRadius: theme.borderRadius.m, overflow: 'hidden', marginBottom: theme.spacing.sm },
  sessionInner: { padding: theme.spacing.m },
  sessionTitle: { ...theme.typography.bodyMedium, color: theme.colors.text },
  sessionMeta: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  ticketCard: { borderRadius: theme.borderRadius.m, overflow: 'hidden', marginBottom: theme.spacing.sm },
  ticketInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.m },
  ticketName: { ...theme.typography.bodyMedium, color: theme.colors.text },
  ticketPrice: { ...theme.typography.caption, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
  registrationCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden', marginTop: theme.spacing.s },
  registrationInner: { padding: theme.spacing.m },
  statusBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: theme.spacing.m, backgroundColor: theme.colors.successSubtle,
    borderRadius: theme.borderRadius.m, marginTop: theme.spacing.m,
  },
  statusLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
  footer: {
    paddingHorizontal: theme.spacing.base, paddingVertical: theme.spacing.l,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
