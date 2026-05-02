import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState, Button } from '../../components';
import { theme } from '../../constants/theme';
import { BookingService, CheckInService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { X, UserCheck } from 'lucide-react-native';

export const ManageBookingsScreen = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchBookings = async () => {
    try {
      setError(null);
      const res = await BookingService.getBookings();
      setBookings(res.data.bookings);
    } catch (err) {
      console.error(err);
      setError('Failed to load bookings');
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

  const handleRefundBooking = (bookingId: string) => {
    Alert.alert('Refund Booking', 'Are you sure you want to refund and cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Refund',
        style: 'destructive',
        onPress: async () => {
          try {
            await BookingService.refundBooking(bookingId);
            fetchBookings();
          } catch (error) {
            Alert.alert('Error', 'Failed to refund booking');
          }
        }
      }
    ]);
  };

  const handleManualCheckIn = (bookingId: string) => {
    Alert.alert('Manual Check-in', 'Mark this attendee as checked in?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await CheckInService.manualCheckIn(bookingId);
            fetchBookings();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to check in attendee');
          }
        },
      },
    ]);
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
            <Text style={styles.pageTitle}>Manage Bookings</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            actions={
              <>
                {(item.bookingStatus === 'pending' || item.bookingStatus === 'confirmed') && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleRefundBooking(item.id)}
                  >
                    <X size={16} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Refund</Text>
                  </TouchableOpacity>
                )}
                {item.bookingStatus === 'confirmed' && item.checkInStatus !== 'checked_in' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.checkInBtn]}
                    onPress={() => handleManualCheckIn(item.id)}
                  >
                    <UserCheck size={16} color={theme.colors.success} />
                    <Text style={[styles.actionText, { color: theme.colors.success }]}>Manual Check-in</Text>
                  </TouchableOpacity>
                )}
              </>
            }
          />
        )}
        ListEmptyComponent={<EmptyState title="No Bookings Yet" message="When attendees book your events, they will appear here." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 100,
    flexGrow: 1,
  },
  pageHeader: {
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.errorSubtle,
  },
  actionText: { ...theme.typography.button, marginLeft: theme.spacing.s },
  checkInBtn: { borderColor: theme.colors.success, backgroundColor: theme.colors.successSubtle },
});
