import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';
import { RegistrationService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../../types/navigation';
import { QrCode } from 'lucide-react-native';

type AttendeeTabNavigationProp = BottomTabNavigationProp<AttendeeTabParamList, 'MyRegistrations'>;

export const MyBookingsScreen = () => {
  const navigation = useNavigation<AttendeeTabNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

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
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update RSVP');
    }
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchBookings} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Registrations</Text>
        <TouchableOpacity
          style={styles.waitlistNavButton}
          onPress={() =>
            navigation.navigate('HomeStack', {
              screen: 'MyWaitlist',
            })
          }
        >
          <Text style={styles.waitlistNavText}>My Waitlist</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            actions={
              <View style={styles.actionsWrapper}>
                {item.isWaitlisted ? (
                  <View style={styles.waitingBanner}>
                    <Text style={styles.waitingBannerText}>
                      Waiting in queue{item.waitlistPosition ? ` (#${item.waitlistPosition})` : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rsvpActions}>
                    <TouchableOpacity
                      style={[styles.rsvpButton, (item.rsvpStatus || 'going') === 'going' && styles.rsvpButtonActive]}
                      onPress={() => handleRsvpUpdate(item.id, 'going')}
                    >
                      <Text style={styles.rsvpButtonText}>Going</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rsvpButton, (item.rsvpStatus || 'going') === 'not_going' && styles.rsvpButtonActive]}
                      onPress={() => handleRsvpUpdate(item.id, 'not_going')}
                    >
                      <Text style={styles.rsvpButtonText}>Not Going</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.bookingStatus === 'confirmed' && !item.isWaitlisted && (
                  <TouchableOpacity
                    style={styles.qrBtn}
                    onPress={() =>
                      navigation.navigate('HomeStack', {
                        screen: 'MyTicketQR',
                        params: { bookingId: item.id },
                      })
                    }
                  >
                    <QrCode size={16} color={theme.colors.primaryLight} />
                    <Text style={styles.qrBtnText}>View QR</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Registrations" message="You have not registered for any events yet." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    padding: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  actionsWrapper: {
    width: '100%',
    gap: theme.spacing.s,
  },
  rsvpActions: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    width: '100%',
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.s,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  rsvpButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}20`,
  },
  rsvpButtonText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  qrBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.s,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  qrBtnText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  waitlistNavButton: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 6,
    backgroundColor: `${theme.colors.warning}1A`,
  },
  waitlistNavText: {
    ...theme.typography.small,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  waitingBanner: {
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: `${theme.colors.warning}1A`,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
  },
  waitingBannerText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
});
