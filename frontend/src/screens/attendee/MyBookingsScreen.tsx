import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';
import { BookingService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../../types/navigation';
import { QrCode } from 'lucide-react-native';

type AttendeeTabNavigationProp = BottomTabNavigationProp<AttendeeTabParamList, 'MyBookings'>;

export const MyBookingsScreen = () => {
  const navigation = useNavigation<AttendeeTabNavigationProp>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchBookings = async () => {
    try {
      setError(null);
      const res = await BookingService.getMyBookings();
      setBookings(res.data.bookings);
    } catch (err) {
      console.error(err);
      setError('Failed to load your tickets');
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

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchBookings} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            actions={
              item.bookingStatus === 'confirmed' ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() =>
                    navigation.navigate('HomeStack', {
                      screen: 'MyTicketQR',
                      params: { bookingId: item.id },
                    })
                  }
                >
                  <QrCode size={16} color={theme.colors.primaryLight} />
                  <Text style={styles.actionText}>View QR</Text>
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
        ListEmptyComponent={<EmptyState title="No Tickets" message="You haven't booked any events yet." />}
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
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
});
