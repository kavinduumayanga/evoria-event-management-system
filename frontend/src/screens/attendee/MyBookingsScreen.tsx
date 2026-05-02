import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState, Button, Card } from '../../components';
import { theme } from '../../constants/theme';
import { RegistrationService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../../types/navigation';
import { QrCode, Eye } from 'lucide-react-native';

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
              </View>
            }
          />
        )}
        ListEmptyComponent={<EmptyState title="No Registrations" message="You have not registered for any events yet." />}
      />
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
});
