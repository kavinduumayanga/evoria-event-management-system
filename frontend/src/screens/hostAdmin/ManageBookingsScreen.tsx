import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';
import { BookingService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { X } from 'lucide-react-native';

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

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await BookingService.cancelBooking(bookingId);
            fetchBookings(); // Refresh list to get updated status
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel booking');
          }
        }
      }
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchBookings} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard 
            booking={item} 
            actions={
              item.bookingStatus === 'pending' || item.bookingStatus === 'confirmed' ? (
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleCancelBooking(item.id)}
                >
                  <X size={16} color={theme.colors.error} />
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Cancel</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Bookings Yet" message="When attendees book your events, they will appear here." />}
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
  actionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.s,
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  actionText: {
    ...theme.typography.button,
    marginLeft: theme.spacing.s,
  }
});
