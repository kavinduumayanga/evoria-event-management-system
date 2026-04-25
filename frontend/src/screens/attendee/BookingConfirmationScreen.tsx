import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AttendeeHomeStackParamList, AttendeeTabParamList } from '../../types/navigation';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { GradientBackground, Button, GlassCard } from '../../components';
import { theme } from '../../constants/theme';
import { CheckCircle } from 'lucide-react-native';
import apiClient from '../../api/client';
import { Booking } from '../../types';

type BookingConfirmationNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<AttendeeHomeStackParamList, 'BookingConfirmation'>,
  BottomTabNavigationProp<AttendeeTabParamList>
>;

type BookingConfirmationRouteProp = RouteProp<AttendeeHomeStackParamList, 'BookingConfirmation'>;

interface Props {
  navigation: BookingConfirmationNavigationProp;
  route: BookingConfirmationRouteProp;
}

export const BookingConfirmationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const res = await apiClient.get(`/bookings/${bookingId}`);
      setBooking(res.data.data.booking);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <CheckCircle size={80} color={theme.colors.success} style={{ alignSelf: 'center', marginBottom: 20 }} />
          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>Your tickets have been successfully booked.</Text>

          {booking && (
            <GlassCard style={styles.card}>
              <Text style={styles.label}>Booking ID</Text>
              <Text style={styles.value}>{booking.id}</Text>
              
              <Text style={styles.label}>Quantity</Text>
              <Text style={styles.value}>{booking.quantity}</Text>
              
              <Text style={styles.label}>Total Amount</Text>
              <Text style={styles.value}>${booking.totalAmount.toFixed(2)}</Text>
            </GlassCard>
          )}

          <Button 
            title="View My Bookings" 
            onPress={() => navigation.navigate('MyBookings')} 
            style={{ marginTop: 20 }}
          />
          <Button 
            title="Back to Home" 
            variant="outline"
            onPress={() => navigation.navigate('HomeStack', { screen: 'EventList' })} 
            style={{ marginTop: 10 }}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: theme.spacing.xl, justifyContent: 'center' },
  title: { ...theme.typography.h1, color: theme.colors.text, textAlign: 'center', marginBottom: 10 },
  subtitle: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 30 },
  card: { padding: theme.spacing.l },
  label: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: 5 },
  value: { ...theme.typography.h3, color: theme.colors.text, marginBottom: 15 },
});
