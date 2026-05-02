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
import { PublicEventDetailsScreen } from '../screens/attendee/PublicEventDetailsScreen';
import { EventFormScreen } from '../screens/hostAdmin/events/EventFormScreen';
import { ManageRegistrationsScreen } from '../screens/hostAdmin/events/ManageRegistrationsScreen';
import { ManageTicketsScreen } from '../screens/hostAdmin/events/ManageTicketsScreen';
import { TicketFormScreen } from '../screens/hostAdmin/events/TicketFormScreen';
import { EventDashboardScreen } from '../screens/hostAdmin/events/EventDashboardScreen';
import { EventRemindersScreen } from '../screens/hostAdmin/events/EventRemindersScreen';
import { CheckInHistoryScreen } from '../screens/hostAdmin/events/CheckInHistoryScreen';
import { CheckInScannerScreen } from '../screens/hostAdmin/CheckInScannerScreen';

const Stack = createNativeStackNavigator<AttendeeHomeStackParamList>();

export const AttendeeHomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EventList" component={EventListScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
      <Stack.Screen name="PublicEventDetails" component={PublicEventDetailsScreen} />
      <Stack.Screen name="EventForm" component={EventFormScreen as any} />
      <Stack.Screen name="ManageRegistrations" component={ManageRegistrationsScreen as any} />
      <Stack.Screen name="EventDashboard" component={EventDashboardScreen as any} />
      <Stack.Screen name="EventReminders" component={EventRemindersScreen as any} />
      <Stack.Screen name="CheckInHistory" component={CheckInHistoryScreen as any} />
      <Stack.Screen name="CheckInScanner" component={CheckInScannerScreen as any} />
      <Stack.Screen name="ManageTickets" component={ManageTicketsScreen as any} />
      <Stack.Screen name="TicketForm" component={TicketFormScreen as any} />
      <Stack.Screen name="TicketSelection" component={TicketSelectionScreen} />
      <Stack.Screen name="MyWaitlist" component={MyWaitlistScreen} />
      <Stack.Screen name="PaymentSummary" component={PaymentSummaryScreen} />
      <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
      <Stack.Screen name="MyTicketQR" component={MyTicketQRScreen} />
    </Stack.Navigator>
  );
};
