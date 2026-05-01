import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer, BookingCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';
import { RegistrationService } from '../../api/services';
import { Booking } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

export const MyBookingsScreen = () => {
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
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            actions={
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
});
