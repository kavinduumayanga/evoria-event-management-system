import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState, SecondaryButton, GlassCard } from '../../components';
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
      await fetchBookings();
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
        <SecondaryButton
          title="My Waitlist"
          onPress={() =>
            navigation.navigate('HomeStack', {
              screen: 'MyWaitlist',
            })
          }
        />
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
                  <GlassCard style={styles.waitingBanner} variant="dark">
                    <Text style={styles.waitingBannerText}>
                      Waiting in queue{item.waitlistPosition ? ` (#${item.waitlistPosition})` : ''}
                    </Text>
                  </GlassCard>
                ) : (
                  <View style={styles.rsvpActions}>
                    <SecondaryButton
                      title="Going"
                      onPress={() => handleRsvpUpdate(item.id, 'going')}
                      style={{ flex: 1, ...(item.rsvpStatus === 'going' ? { backgroundColor: theme.colors.primary } : {}) }}
                    />
                    <SecondaryButton
                      title="Not Going"
                      onPress={() => handleRsvpUpdate(item.id, 'not_going')}
                      style={{ flex: 1, ...(item.rsvpStatus === 'not_going' ? { backgroundColor: theme.colors.error } : {}) }}
                    />
                  </View>
                )}

                {item.bookingStatus === 'confirmed' && !item.isWaitlisted && (
                  <SecondaryButton
                    title="View QR"
                    icon={<QrCode size={16} color={theme.colors.text} />}
                    onPress={() =>
                      navigation.navigate('HomeStack', {
                        screen: 'MyTicketQR',
                        params: { bookingId: item.id },
                      })
                    }
                  />
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
  waitingBanner: {
    width: '100%',
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
    borderColor: theme.colors.warning,
    borderWidth: 1,
  },
  waitingBannerText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
});
