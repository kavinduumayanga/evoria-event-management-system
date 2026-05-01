import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Link as LinkIcon, Mail, MapPin, Phone, Share2 } from 'lucide-react-native';
import { AttendeeHomeStackParamList } from '../../types/navigation';
import { Button, ErrorState, GlassCard, Input, LoadingState, ScreenContainer } from '../../components';
import { EventService, PublicEventDetails, RegistrationService } from '../../api/services';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../store/auth.store';

type PublicEventNavigationProp = NativeStackNavigationProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;
type PublicEventRouteProp = RouteProp<AttendeeHomeStackParamList, 'PublicEventDetails'>;

interface Props {
  navigation: PublicEventNavigationProp;
  route: PublicEventRouteProp;
}

export const PublicEventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { slug } = route.params;
  const currentUser = useAuthStore((state) => state.user);
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
      const response = await EventService.getPublicEventBySlug(slug);
      setPublicData(response.data);
    } catch (fetchError: any) {
      setError(fetchError?.response?.data?.message || 'Failed to load public event details');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchPublicEvent();
    }, [slug])
  );

  const event = publicData?.event;
  const sessions = publicData?.agenda.sessions || [];
  const tickets = publicData?.tickets || [];
  const registrationQuestions = publicData?.registrationFields?.customQuestions || [];
  const isLoggedIn = Boolean(currentUser?.id);

  useEffect(() => {
    if (!currentUser) return;

    setName((previous) => previous || currentUser.name || '');
    setEmail((previous) => previous || currentUser.email || '');
    setMobile((previous) => previous || currentUser.phone || '');
  }, [currentUser]);

  const requiredQuestionIds = useMemo(
    () => new Set(registrationQuestions.filter((question) => question.required).map((question) => question.id)),
    [registrationQuestions],
  );

  const handleShare = async () => {
    if (!event?.publicUrl) return;
    await Share.share({
      title: event.title,
      message: `Check out this event: ${event.publicUrl}`,
      url: event.publicUrl,
    });
  };

  const handleCopyLink = async () => {
    if (!event?.publicUrl) return;
    await Clipboard.setStringAsync(event.publicUrl);
    Alert.alert('Copied', 'Public event URL copied to clipboard.');
  };

  const handleContact = async () => {
    if (!event) return;

    const phone = (event.contactDetails?.phone || event.host?.phone || '').trim();
    if (phone) {
      const telUrl = `tel:${phone}`;
      const canDial = await Linking.canOpenURL(telUrl);
      if (canDial) {
        await Linking.openURL(telUrl);
        return;
      }
    }

    const email = (event.contactDetails?.email || event.host?.email || '').trim();
    if (email) {
      const mailUrl = `mailto:${email}`;
      const canEmail = await Linking.canOpenURL(mailUrl);
      if (canEmail) {
        await Linking.openURL(mailUrl);
        return;
      }
    }

    Alert.alert('Contact unavailable', 'No valid host contact method is available.');
  };

  const validateRegistrationForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = 'Name is required';
    if (!email.trim()) nextErrors.email = 'Email is required';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address';
    }
    if (!mobile.trim()) nextErrors.mobile = 'Mobile is required';
    if (!nic.trim()) nextErrors.nic = 'NIC is required';

    for (const question of registrationQuestions) {
      if (!requiredQuestionIds.has(question.id)) continue;
      const answer = customAnswerMap[question.id] || '';
      if (!answer.trim()) {
        nextErrors[`q_${question.id}`] = 'This question is required';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitRegistration = async () => {
    if (!event) return;
    if (!validateRegistrationForm()) return;

    try {
      setIsSubmittingRegistration(true);

      const customAnswers = registrationQuestions
        .map((question) => ({
          questionId: question.id,
          answer: (customAnswerMap[question.id] || '').trim(),
        }))
        .filter((answer) => answer.answer.length > 0);

      const response = await RegistrationService.submitPublicRegistration(event.publicSlug, {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        nic: nic.trim(),
        customAnswers,
      });

      const status = response.data.registration.status;
      setRegistrationStatus(status);
      Alert.alert('Registration Submitted', `Your registration status is ${status.toUpperCase()}.`);
    } catch (submitError: any) {
      Alert.alert('Registration Failed', submitError?.response?.data?.message || 'Unable to submit registration');
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (error || !event) {
    return (
      <ScreenContainer>
        <ErrorState message={error || 'Public event not found'} onRetry={fetchPublicEvent} />
      </ScreenContainer>
    );
  }

  const isSoldOut = tickets.every((ticket) => ticket.remaining <= 0);
  const isTicketedEvent = event.pricingMode === 'ticketed';

  return (
    <ScreenContainer style={styles.screen}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {event.image ? (
            <Image source={{ uri: event.image }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>No Event Image</Text>
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.title}>{event.title}</Text>
            {event.topic ? <Text style={styles.topic}>Topic: {event.topic}</Text> : null}

            <View style={styles.metaBlock}>
              <View style={styles.metaRow}>
                <CalendarIcon size={16} color={theme.colors.primaryLight} />
                <Text style={styles.metaText}>{event.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={16} color={theme.colors.secondary} />
                <Text style={styles.metaText}>{event.startTime} - {event.endTime}</Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={16} color={theme.colors.accent} />
                <Text style={styles.metaText}>{event.location.label}</Text>
              </View>
              <Text style={styles.metaLabel}>Capacity: {event.capacity}</Text>
              <Text style={styles.metaLabel}>Type: {event.type.toUpperCase()}</Text>
              <Text style={styles.metaLabel}>Visibility: {event.visibility.toUpperCase()}</Text>
              {event.host ? <Text style={styles.metaLabel}>Host: {event.host.name}</Text> : null}
            </View>

            <View style={styles.buttonGrid}>
              <Button title="Share" icon={<Share2 size={16} color={theme.colors.text} />} onPress={handleShare} />
              <Button title="Copy URL" variant="outline" icon={<LinkIcon size={16} color={theme.colors.primary} />} onPress={handleCopyLink} />
              <Button
                title="Contact Host"
                variant="outline"
                icon={event.contactDetails?.phone || event.host?.phone ? <Phone size={16} color={theme.colors.primary} /> : <Mail size={16} color={theme.colors.primary} />}
                onPress={handleContact}
              />
            </View>

            {event.isManageableByCurrentUser ? (
              <Button
                title="Open Manage View"
                variant="secondary"
                onPress={() => navigation.navigate('EventDetails', { eventId: event.id, publicSlug: event.publicSlug })}
                style={styles.manageButton}
              />
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.sectionText}>{event.about}</Text>
            </View>

            {sessions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Agenda</Text>
                {sessions.map((session) => (
                  <GlassCard key={session.id} style={styles.sessionCard}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionMeta}>{session.sessionDate} • {session.startTime} - {session.endTime}</Text>
                    {session.speakerName ? <Text style={styles.sessionMeta}>Speaker: {session.speakerName}</Text> : null}
                  </GlassCard>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tickets / Registration</Text>
              {tickets.length > 0 ? tickets.map((ticket) => (
                <GlassCard key={ticket.id} style={styles.ticketCard} variant="light">
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{ticket.name}</Text>
                    <Text style={styles.ticketPrice}>
                      {ticket.isFree ? 'Free Registration' : `${ticket.currency} ${ticket.price.toFixed(2)}`}
                    </Text>
                  </View>
                  <Text style={styles.ticketMeta}>{ticket.remaining} left</Text>
                </GlassCard>
              )) : (
                <Text style={styles.sectionText}>No active tickets available.</Text>
              )}
            </View>

            {!isTicketedEvent ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Event Registration</Text>
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

                {registrationQuestions.map((question) => (
                  <Input
                    key={question.id}
                    label={`${question.question}${question.required ? ' *' : ''}`}
                    value={customAnswerMap[question.id] || ''}
                    onChangeText={(value) => {
                      setCustomAnswerMap((previous) => ({ ...previous, [question.id]: value }));
                      setFormErrors((previous) => ({ ...previous, [`q_${question.id}`]: '' }));
                    }}
                    placeholder={question.type === 'number' ? 'Enter a number' : 'Your answer'}
                    keyboardType={question.type === 'number' ? 'numeric' : 'default'}
                    error={formErrors[`q_${question.id}`]}
                  />
                ))}

                {registrationStatus ? (
                  <GlassCard style={styles.statusCard}>
                    <Text style={styles.statusTitle}>Registration Status</Text>
                    <Text style={styles.statusText}>{registrationStatus.toUpperCase()}</Text>
                  </GlassCard>
                ) : null}

                <Button
                  title="Submit Registration"
                  onPress={handleSubmitRegistration}
                  isLoading={isSubmittingRegistration}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={
              isTicketedEvent
                ? (isLoggedIn ? (isSoldOut ? 'Sold Out' : 'Book Tickets') : 'Login To Book Tickets')
                : 'Register'
            }
            disabled={isTicketedEvent ? (isSoldOut || !isLoggedIn) : isSubmittingRegistration}
            onPress={() => {
              if (isTicketedEvent) {
                navigation.navigate('TicketSelection', { eventId: event.id });
                return;
              }
              handleSubmitRegistration();
            }}
            isLoading={isSubmittingRegistration}
          />
        </View>
      </SafeAreaView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 12,
    left: 12,
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
  coverImage: {
    width: '100%',
    height: 230,
  },
  coverPlaceholder: {
    width: '100%',
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  coverPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  content: {
    padding: theme.spacing.l,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  topic: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.s,
  },
  metaBlock: {
    marginTop: theme.spacing.m,
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
  metaLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  buttonGrid: {
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  manageButton: {
    marginTop: theme.spacing.s,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  sectionText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  sessionCard: {
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  sessionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sessionMeta: {
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
  ticketName: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  ticketPrice: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    marginTop: 4,
  },
  ticketMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing.l,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: 'rgba(9, 9, 11, 0.92)',
  },
  statusCard: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  statusTitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  statusText: {
    ...theme.typography.h3,
    color: theme.colors.success,
  },
});
