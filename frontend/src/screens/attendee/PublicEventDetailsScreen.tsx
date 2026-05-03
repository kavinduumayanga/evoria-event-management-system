import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Keyboard, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Share2, Link as LinkIcon, Phone, Mail, Ticket as TicketIcon, Star, CalendarPlus } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Button, Card, ErrorState, IconButton, Input, LoadingState, ScreenContainer, StatusBadge } from '../../components';
import { EventService, PublicEventDetails, RegistrationService } from '../../api/services';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';
import { safeArray } from '../../utils/safeData';
import { formatSafeDate, formatSafeTime, logDevMissing, safeInitials, safeLower, safeStatus, safeString, safeTitle, safeUpper } from '../../utils/safeText';
import { resolveImageUrl } from '../../utils/imageUrl';

type PublicEventNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;
type PublicEventRouteProp = RouteProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;
interface Props { navigation: PublicEventNavigationProp; route: PublicEventRouteProp; }

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const CHOICE_TYPES = new Set(['choice', 'dropdown', 'radio', 'checkbox', 'multiple_choice']);

const normalizeHexColor = (value: unknown, fallback: string) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_REGEX.test(normalized) ? normalized : fallback;
};

const normalizeQuestionOptions = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const item of raw) {
    const value = typeof item === 'string' ? item.trim() : String(item || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(value);
  }
  return options;
};

export const PublicEventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const slug = route.params?.slug;
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
  const [reviewSummary, setReviewSummary] = useState<{ averageRating: number; totalReviews: number } | null>(null);
  const [hasHostImageError, setHasHostImageError] = useState(false);

  const fetchPublicEvent = async () => {
    if (!slug) return;
    try {
      setError(null);
      const res = await EventService.getPublicEventBySlug(slug);
      setPublicData(res.data);
      setHasHostImageError(false);
      try {
        const summaryRes = await EventService.getEventReviewSummary(res.data.event.id);
        setReviewSummary(summaryRes.data);
      } catch {
        setReviewSummary(null);
      }
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
  const sessions = safeArray(publicData?.agenda?.sessions);
  const tickets = safeArray(publicData?.tickets);
  const registrationQuestions = safeArray(publicData?.registrationFields?.customQuestions);
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
    const host = typeof event.host === 'object' && event.host ? event.host : null;
    const phone = safeString(event.contactDetails?.phone || host?.phone, '').trim();
    if (phone) {
      const url = `tel:${phone}`;
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    }
    const em = safeString(event.contactDetails?.email || host?.email, '').trim();
    if (em) {
      const url = `mailto:${em}`;
      if (await Linking.canOpenURL(url)) { await Linking.openURL(url); return; }
    }
    Alert.alert('Contact unavailable', 'No valid host contact method found.');
  };

  const handleAddToCalendar = async () => {
    if (!event?.id) return;
    const url = EventService.getCalendarIcsUrl(event.id);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Unable to open calendar link.');
      return;
    }
    await Linking.openURL(url);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Invalid email address';
    if (!mobile.trim()) errors.mobile = 'Mobile is required';
    if (!nic.trim()) errors.nic = 'NIC is required';
    for (const q of registrationQuestions) {
      const answer = (customAnswerMap[q.id] || '').trim();
      const options = normalizeQuestionOptions((q as any).options);
      const isChoiceQuestion = CHOICE_TYPES.has(safeLower(q.type));
      if (requiredQuestionIds.has(q.id) && !answer) {
        errors[`q_${q.id}`] = 'This field is required';
        continue;
      }
      if (isChoiceQuestion && answer) {
        const normalizedOptionSet = new Set(options.map((option) => option.toLowerCase()));
        if (safeLower(q.type) === 'checkbox' || safeLower(q.type) === 'multiple_choice') {
          const selectedValues = answer.split(',').map((item) => item.trim()).filter(Boolean).map((item) => item.toLowerCase());
          if (!selectedValues.length || selectedValues.some((item) => !normalizedOptionSet.has(item))) {
            errors[`q_${q.id}`] = 'Please select a valid option.';
          }
        } else if (!normalizedOptionSet.has(answer.toLowerCase())) {
          errors[`q_${q.id}`] = 'Please select a valid option.';
        }
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRegistration = async () => {
    if (!event) return;
    Keyboard.dismiss();
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
      Alert.alert('Registration Submitted', `Your registration status is ${safeUpper(safeStatus(status, 'unknown'), 'UNKNOWN')}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to submit registration';
      Alert.alert(err?.response?.status === 409 ? 'Already Registered' : 'Registration Failed', msg);
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  if (!slug) {
    logDevMissing('public-event-missing-slug', 'PublicEventDetailsScreen missing slug route param.');
    return (
      <ScreenContainer>
        <ErrorState message="Missing event details." onRetry={() => navigation.goBack()} actionLabel="Go Back" />
      </ScreenContainer>
    );
  }

  if (isLoading) return <LoadingState />;
  if (error || !event) {
    return <ScreenContainer><ErrorState message={error || 'Event not found'} onRetry={fetchPublicEvent} /></ScreenContainer>;
  }

  const eventType = safeLower(event.type, 'physical');
  const host = typeof event.host === 'object' && event.host ? event.host : null;
  const hostName = safeTitle(host?.name, 'Evoria Host');
  const hostImage = resolveImageUrl(safeString(host?.profileImage, ''));
  const hostInitials = safeInitials(hostName, 'EH');
  const brandPrimary = normalizeHexColor(event.branding?.primaryColor, theme.colors.primary);
  const brandAccent = normalizeHexColor(event.branding?.accentColor, theme.colors.secondary);
  const brandButtonTextColor = '#FFFFFF';

  const locationName = safeString(
    event.location?.name || event.location?.label,
    eventType === 'online' ? 'Online' : 'Location not specified',
  );
  const locationAddress = safeString(event.location?.address, '');
  const toFiniteCoordinate = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const locationLat = toFiniteCoordinate(event.location?.lat);
  const locationLng = toFiniteCoordinate(event.location?.lng);
  const hasLocationCoordinates = locationLat !== null && locationLng !== null && (locationLat !== 0 || locationLng !== 0);
  const dateLabel = formatSafeDate(event.date, 'Date unavailable');
  const startTimeLabel = formatSafeTime(event.startTime, 'Time unavailable');
  const endTimeLabel = formatSafeTime(event.endTime, 'Time unavailable');
  const titleLabel = safeTitle(event.title, 'Untitled Event');
  const topicLabel = safeString(event.topic, '');
  const aboutLabel = safeString(event.about, '');
  const isSoldOut = tickets.every((t) => (Number.isFinite(Number(t.remaining)) ? Number(t.remaining) : 0) <= 0);
  const isTicketedEvent = safeString(event.pricingMode, 'ticketed') === 'ticketed';
  const buildMapTilePreviewUrl = (lat: number, lng: number) => {
    const zoom = 14;
    const clampedLat = Math.max(Math.min(lat, 85.0511), -85.0511);
    const xTile = Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
    const yTile = Math.floor(
      ((1 - Math.log(Math.tan((clampedLat * Math.PI) / 180) + (1 / Math.cos((clampedLat * Math.PI) / 180))) / Math.PI) / 2) * Math.pow(2, zoom)
    );
    return `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;
  };

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
          <Image source={{ uri: resolveImageUrl(event.image) || event.image }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <TicketIcon size={40} color={theme.colors.textMuted} />
          </View>
        )}

        <View style={styles.content}>
          {/* Title + topic */}
          <Text style={[styles.eventTitle, { color: brandPrimary }]}>{titleLabel}</Text>
          {topicLabel ? <Text style={styles.topic}>{topicLabel}</Text> : null}

          {/* Meta card */}
          <Card variant="raised" style={styles.metaCard} noPadding>
            <View style={styles.metaCardInner}>
              <View style={styles.metaRow}>
                <CalendarIcon size={14} color={brandPrimary} />
                <Text style={styles.metaText}>{dateLabel}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={14} color={brandAccent} />
                <Text style={styles.metaText}>{startTimeLabel} – {endTimeLabel}</Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={14} color={brandAccent} />
                <Text style={styles.metaText}>{locationName}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaTagRow}>
                <StatusBadge status="info" label={safeString(event.type, 'unknown')} />
                <StatusBadge status={event.visibility === 'public' ? 'success' : 'warning'} label={safeString(event.visibility, 'unknown')} />
              </View>
              <View style={styles.hostRow}>
                {hostImage && !hasHostImageError ? (
                  <Image source={{ uri: hostImage }} style={styles.hostAvatar} onError={() => setHasHostImageError(true)} />
                ) : (
                  <View style={[styles.hostAvatar, { backgroundColor: brandAccent }]}>
                    <Text style={styles.hostInitials}>{hostInitials}</Text>
                  </View>
                )}
                <Text style={styles.hostText}>{hostName}</Text>
              </View>
            </View>
          </Card>

          {eventType !== 'online' && hasLocationCoordinates ? (
            <Card variant="raised" style={styles.locationCard} noPadding>
              <View style={styles.locationCardInner}>
                <Text style={styles.locationTitle}>{locationName}</Text>
                {locationAddress ? <Text style={styles.locationAddress}>{locationAddress}</Text> : null}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.mapPreview}
                  onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${locationLat}&mlon=${locationLng}#map=16/${locationLat}/${locationLng}`)}
                >
                  <Image
                    source={{ uri: buildMapTilePreviewUrl(locationLat, locationLng) }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.mapPinMarker}>
                    <MapPin size={16} color={theme.colors.primary} />
                  </View>
                </TouchableOpacity>
              </View>
            </Card>
          ) : eventType !== 'online' && locationName ? (
            <Card variant="raised" style={styles.locationCard} noPadding>
              <View style={styles.locationCardInner}>
                <Text style={styles.locationTitle}>{locationName}</Text>
                {locationAddress ? <Text style={styles.locationAddress}>{locationAddress}</Text> : null}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.mapPreview, styles.mapPreviewFallback]}
                  onPress={() => Linking.openURL(`https://www.openstreetmap.org/search?query=${encodeURIComponent(locationAddress || locationName)}`)}
                >
                  <Text style={styles.mapPreviewFallbackText}>Open location in maps</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : null}

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
            <TouchableOpacity style={styles.actionChip} onPress={handleAddToCalendar}>
              <CalendarPlus size={14} color={theme.colors.text} />
              <Text style={styles.actionChipText}>Add Calendar</Text>
            </TouchableOpacity>
          </View>

          {reviewSummary && reviewSummary.totalReviews > 0 ? (
            <Card variant="raised" style={styles.metaCard} noPadding>
              <View style={styles.metaCardInner}>
                <View style={styles.metaRow}>
                  <Star size={14} color={theme.colors.warning} />
                  <Text style={styles.metaText}>
                    {reviewSummary.averageRating.toFixed(1)} rating from {reviewSummary.totalReviews} review(s)
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}

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
            <Text style={styles.sectionText}>{aboutLabel}</Text>
          </View>

          {/* Agenda */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agenda</Text>
            {sessions.length === 0 ? (
              <Text style={styles.sectionText}>No agenda has been added for this event yet.</Text>
            ) : (
              sessions.map((session, index) => {
                const sessionTitle = safeString(session.title, 'Session');
                const hasStart = safeString(session.startTime, '').trim().length > 0;
                const hasEnd = safeString(session.endTime, '').trim().length > 0;
                const speaker = safeString(session.speakerName, '').trim() || safeString(host?.name, '').trim();
                const description = safeString(session.description, '').trim();

                return (
                  <Card key={`${safeString(session.id, 'session')}-${index}`} variant="raised" style={styles.sessionCard} noPadding>
                    <View style={styles.sessionInner}>
                      <Text style={styles.sessionTitle}>{sessionTitle}</Text>
                      {safeString(session.sessionDate, '').trim() ? (
                        <Text style={styles.sessionMeta}>
                          {formatSafeDate(session.sessionDate, 'Date unavailable', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      ) : null}
                      {(hasStart || hasEnd) ? (
                        <Text style={styles.sessionMeta}>
                          {hasStart && hasEnd ? `${session.startTime} - ${session.endTime}` : (session.startTime || session.endTime)}
                        </Text>
                      ) : null}
                      {speaker ? <Text style={styles.sessionMeta}>Speaker: {speaker}</Text> : null}
                      {description ? <Text style={styles.sessionDescription}>{description}</Text> : null}
                    </View>
                  </Card>
                );
              })
            )}
          </View>

          {/* Tickets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets</Text>
            {tickets.length > 0 ? tickets.map((ticket, index) => (
              <Card key={safeString(ticket.id, `ticket-${index}`)} variant="raised" style={styles.ticketCard} noPadding>
                <View style={styles.ticketInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text style={styles.ticketPrice}>
                        {ticket.isFree ? 'Free' : `${safeString(ticket.currency, 'LKR')} ${Number(ticket.price || 0).toFixed(2)}`}
                    </Text>
                  </View>
                  <StatusBadge
                      status={(Number(ticket.remaining || 0) > 0) ? 'success' : 'error'}
                      label={(Number(ticket.remaining || 0) > 0) ? `${Number(ticket.remaining || 0)} left` : 'Sold out'}
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

                  {registrationQuestions.map((q, index) => {
                    const questionType = safeLower(q.type);
                    const isChoiceQuestion = CHOICE_TYPES.has(questionType);
                    const options = normalizeQuestionOptions((q as any).options);
                    const value = customAnswerMap[q.id] || '';

                    if (isChoiceQuestion && options.length > 0) {
                      const selectedValues = value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean);
                      const isMultiSelect = questionType === 'checkbox' || questionType === 'multiple_choice';

                      return (
                        <View key={safeString(q.id, `question-${index}`)} style={styles.choiceQuestionBlock}>
                          <Text style={styles.choiceQuestionLabel}>{q.question}{q.required ? ' *' : ''}</Text>
                          <View style={styles.choiceOptionsRow}>
                            {options.map((option, optionIndex) => {
                              const isSelected = isMultiSelect
                                ? selectedValues.some((selected) => selected.toLowerCase() === option.toLowerCase())
                                : value.trim().toLowerCase() === option.toLowerCase();
                              return (
                                <TouchableOpacity
                                  key={`${q.id}-${optionIndex}`}
                                  style={[styles.choiceOptionChip, isSelected && styles.choiceOptionChipSelected]}
                                  onPress={() => {
                                    if (isMultiSelect) {
                                      const nextValues = isSelected
                                        ? selectedValues.filter((selected) => selected.toLowerCase() !== option.toLowerCase())
                                        : [...selectedValues, option];
                                      setCustomAnswerMap((previous) => ({ ...previous, [q.id]: nextValues.join(', ') }));
                                    } else {
                                      setCustomAnswerMap((previous) => ({ ...previous, [q.id]: option }));
                                    }
                                    setFormErrors((previous) => ({ ...previous, [`q_${q.id}`]: '' }));
                                  }}
                                >
                                  <Text style={[styles.choiceOptionChipText, isSelected && styles.choiceOptionChipTextSelected]}>
                                    {option}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {formErrors[`q_${q.id}`] ? <Text style={styles.choiceErrorText}>{formErrors[`q_${q.id}`]}</Text> : null}
                        </View>
                      );
                    }

                    return (
                      <Input
                        key={safeString(q.id, `question-${index}`)}
                        label={`${q.question}${q.required ? ' *' : ''}`}
                        value={value}
                        onChangeText={(v) => {
                          setCustomAnswerMap((p) => ({ ...p, [q.id]: v }));
                          setFormErrors((p) => ({ ...p, [`q_${q.id}`]: '' }));
                        }}
                        placeholder={q.type === 'number' ? 'Enter a number' : 'Your answer'}
                        keyboardType={q.type === 'number' ? 'numeric' : 'default'}
                        error={formErrors[`q_${q.id}`]}
                      />
                    );
                  })}

                  {registrationStatus && (
                    <View style={styles.statusBanner}>
                      <Text style={styles.statusLabel}>Registration Status</Text>
                      <StatusBadge
                        status={registrationStatus === 'approved' ? 'success' : registrationStatus === 'pending' ? 'warning' : 'error'}
                        label={safeStatus(registrationStatus, 'unknown')}
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
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 72 }]}>
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
          style={{ backgroundColor: brandAccent, borderColor: brandAccent }}
          textStyle={{ color: brandButtonTextColor }}
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
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s },
  hostAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hostInitials: { ...theme.typography.caption, color: '#FFFFFF', fontWeight: '700' },
  hostText: { ...theme.typography.caption, color: theme.colors.textMuted },
  locationCard: { marginTop: theme.spacing.m, borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  locationCardInner: { padding: theme.spacing.m },
  locationTitle: { ...theme.typography.bodyMedium, color: theme.colors.text },
  locationAddress: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  mapPreview: {
    height: 150,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    marginTop: theme.spacing.s,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPreviewFallback: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  mapPreviewFallbackText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  mapPinMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
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
  sessionDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 18,
  },
  ticketCard: { borderRadius: theme.borderRadius.m, overflow: 'hidden', marginBottom: theme.spacing.sm },
  ticketInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.m },
  ticketName: { ...theme.typography.bodyMedium, color: theme.colors.text },
  ticketPrice: { ...theme.typography.caption, color: theme.colors.primary, marginTop: 2, fontWeight: '600' },
  registrationCard: { borderRadius: theme.borderRadius.l, overflow: 'hidden', marginTop: theme.spacing.s },
  registrationInner: { padding: theme.spacing.m },
  choiceQuestionBlock: { marginBottom: theme.spacing.m },
  choiceQuestionLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs, marginLeft: 4 },
  choiceOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s },
  choiceOptionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.round,
  },
  choiceOptionChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  choiceOptionChipText: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600' },
  choiceOptionChipTextSelected: { color: theme.colors.primaryLight },
  choiceErrorText: { ...theme.typography.caption, color: theme.colors.error, marginTop: 6, marginLeft: 4 },
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
