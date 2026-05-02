import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState, Button, Card, Input } from '../../components';
import { theme } from '../../constants/theme';
import { EventService, RegistrationService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../../types/navigation';
import { QrCode, Eye, CalendarPlus, Star } from 'lucide-react-native';

type AttendeeTabNavigationProp = BottomTabNavigationProp<AttendeeTabParamList, 'MyRegistrations'>;

export const MyBookingsScreen = () => {
  const navigation = useNavigation<AttendeeTabNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchBookings = async () => {
    try {
      setError(null);
      const res = await RegistrationService.getMyRegistrations();
      setBookings(res.data.registrations);
    } catch (err) {
      console.error(err);
      setError('Failed to load your registrations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBookings();
  }, []);

  const handleRsvpUpdate = async (registrationId: string, rsvpStatus: 'going' | 'not_going') => {
    try {
      const response = await RegistrationService.updateRsvp(registrationId, rsvpStatus);
      const updated = response.data.registration as Booking;
      setBookings((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      await fetchBookings();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update RSVP');
    }
  };

  const isEventCompleted = (booking: Booking) => {
    const eventDate = String(booking.event?.date || '').slice(0, 10);
    const endTime = String(booking.event?.endTime || '23:59');
    if (!eventDate) return false;

    const [hoursRaw, minutesRaw] = endTime.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;

    const eventEnd = new Date(`${eventDate}T00:00:00.000Z`);
    eventEnd.setUTCMinutes((hours * 60) + minutes);
    return eventEnd.getTime() <= Date.now();
  };

  const openReviewModal = (booking: Booking) => {
    setSelectedReviewBooking(booking);
    setReviewRating(5);
    setReviewComment('');
    setIsReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalVisible(false);
    setSelectedReviewBooking(null);
  };

  const submitReview = async () => {
    if (!selectedReviewBooking?.event?.id) return;
    try {
      setIsSubmittingReview(true);
      await EventService.createEventReview(selectedReviewBooking.event.id, {
        registrationId: selectedReviewBooking.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      Alert.alert('Thank You', 'Your feedback has been submitted.');
      closeReviewModal();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 409) {
        Alert.alert('Already Submitted', 'You already submitted feedback for this registration.');
      } else {
        Alert.alert('Feedback Failed', err?.response?.data?.message || 'Unable to submit feedback right now.');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const addToCalendar = async (booking: Booking) => {
    if (!booking.event?.id) return;
    const url = EventService.getCalendarIcsUrl(booking.event.id);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Unable to open calendar link.');
      return;
    }
    await Linking.openURL(url);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchBookings} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>My Registrations</Text>
            <Button
              title="Waitlist"
              onPress={() => navigation.navigate('HomeStack', { screen: 'MyWaitlist' })}
              variant="ghost"
              size="sm"
              fullWidth={false}
            />
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            actions={
              <View style={styles.actionsWrapper}>
                {item.isWaitlisted ? (
                  <Card variant="warning" style={styles.waitingBanner} noPadding>
                    <Text style={styles.waitingBannerText}>
                      Waiting in queue{item.waitlistPosition ? ` (#${item.waitlistPosition})` : ''}
                    </Text>
                  </Card>
                ) : null}

                <View style={styles.rsvpActions}>
                  <Button
                    title="Going"
                    onPress={() => handleRsvpUpdate(item.id, 'going')}
                    variant={item.rsvpStatus === 'going' ? 'primary' : 'secondary'}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Not Going"
                    onPress={() => handleRsvpUpdate(item.id, 'not_going')}
                    variant={item.rsvpStatus === 'not_going' ? 'danger' : 'secondary'}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                </View>

                {item.event?.id ? (
                  <Button
                    title="View Event"
                    icon={<Eye size={16} color={theme.colors.text} />}
                    onPress={() =>
                      navigation.navigate('HomeStack', {
                        screen: 'EventDetails',
                        params: { eventId: item.event!.id },
                      })
                    }
                    variant="secondary"
                    size="sm"
                  />
                ) : null}

                {item.event?.id ? (
                  <Button
                    title="Add to Calendar"
                    icon={<CalendarPlus size={16} color={theme.colors.text} />}
                    onPress={() => addToCalendar(item)}
                    variant="secondary"
                    size="sm"
                  />
                ) : null}

                {item.bookingStatus === 'confirmed' && !item.isWaitlisted && (
                  <Button
                    title="View QR Ticket"
                    icon={<QrCode size={16} color={theme.colors.textOnPrimary} />}
                    onPress={() =>
                      navigation.navigate('HomeStack', {
                        screen: 'MyTicketQR',
                        params: { bookingId: item.id },
                      })
                    }
                    variant="primary"
                    size="sm"
                  />
                )}

                {item.bookingStatus === 'confirmed' && !item.isWaitlisted && isEventCompleted(item) && (
                  <Button
                    title="Leave Feedback"
                    icon={<Star size={16} color={theme.colors.textOnPrimary} />}
                    onPress={() => openReviewModal(item)}
                    variant="primary"
                    size="sm"
                  />
                )}
              </View>
            }
          />
        )}
        ListEmptyComponent={<EmptyState title="No Registrations" message="You have not registered for any events yet." />}
      />

      <Modal
        transparent
        visible={isReviewModalVisible}
        animationType="slide"
        onRequestClose={closeReviewModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeReviewModal}>
          <Pressable style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Event Feedback</Text>
            <Text style={styles.modalSubtitle}>
              {selectedReviewBooking?.event?.title || 'Share your experience'}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const isActive = reviewRating >= value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.starButton, isActive && styles.starButtonActive]}
                    onPress={() => setReviewRating(value)}
                  >
                    <Star size={16} color={isActive ? theme.colors.warning : theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Comment"
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Tell us what you liked or what could be better"
              multiline
              numberOfLines={4}
            />

            <Button
              title="Submit Feedback"
              onPress={submitReview}
              isLoading={isSubmittingReview}
              variant="primary"
              size="md"
            />
            <Button
              title="Cancel"
              onPress={closeReviewModal}
              variant="ghost"
              size="sm"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 140,
    flexGrow: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  actionsWrapper: { width: '100%', gap: theme.spacing.s },
  rsvpActions: { flexDirection: 'row', gap: theme.spacing.s, width: '100%' },
  waitingBanner: {
    width: '100%',
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    alignItems: 'center',
    borderRadius: theme.borderRadius.s,
  },
  waitingBannerText: { ...theme.typography.caption, color: theme.colors.warning, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
  starsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  starButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  starButtonActive: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSubtle,
  },
});
