import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AttendeeHomeStackParamList } from '../types/navigation';

import { EventListScreen } from '../screens/attendee/EventListScreen';
import { EventDetailsScreen } from '../screens/attendee/EventDetailsScreen';
import { TicketSelectionScreen } from '../screens/attendee/TicketSelectionScreen';
import { PaymentSummaryScreen } from '../screens/attendee/PaymentSummaryScreen';
import { BookingConfirmationScreen } from '../screens/attendee/BookingConfirmationScreen';
import { MyTicketQRScreen } from '../screens/attendee/MyTicketQRScreen';
import { MyWaitlistScreen } from '../screens/attendee/MyWaitlistScreen';

const Stack = createNativeStackNavigator<AttendeeHomeStackParamList>();

export const AttendeeHomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventList" component={EventListScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="TicketSelection" component={TicketSelectionScreen} />
      <Stack.Screen name="MyWaitlist" component={MyWaitlistScreen} />
      <Stack.Screen name="PaymentSummary" component={PaymentSummaryScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="MyTicketQR" component={MyTicketQRScreen} />
    </Stack.Navigator>
  );
};
