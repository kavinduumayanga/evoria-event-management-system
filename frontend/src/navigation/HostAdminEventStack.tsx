import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../types/navigation';
import { ManageEventsScreen } from '../screens/hostAdmin/events/ManageEventsScreen';
import { EventFormScreen } from '../screens/hostAdmin/events/EventFormScreen';
import { ManageTicketsScreen } from '../screens/hostAdmin/events/ManageTicketsScreen';
import { TicketFormScreen } from '../screens/hostAdmin/events/TicketFormScreen';
import { ManageSessionsScreen } from '../screens/hostAdmin/events/ManageSessionsScreen';
import { SessionFormScreen } from '../screens/hostAdmin/events/SessionFormScreen';
import { ManageRegistrationsScreen } from '../screens/hostAdmin/events/ManageRegistrationsScreen';
import { ManageWaitlistScreen } from '../screens/hostAdmin/events/ManageWaitlistScreen';
import { EventDashboardScreen } from '../screens/hostAdmin/events/EventDashboardScreen';
import { EventRemindersScreen } from '../screens/hostAdmin/events/EventRemindersScreen';
import { CheckInHistoryScreen } from '../screens/hostAdmin/events/CheckInHistoryScreen';
import { CheckInScannerScreen } from '../screens/hostAdmin/CheckInScannerScreen';

const Stack = createNativeStackNavigator<HostAdminEventStackParamList>();

export const HostAdminEventStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
      <Stack.Screen name="EventForm" component={EventFormScreen} />
      <Stack.Screen name="EventDashboard" component={EventDashboardScreen as any} />
      <Stack.Screen name="EventReminders" component={EventRemindersScreen as any} />
      <Stack.Screen name="CheckInHistory" component={CheckInHistoryScreen as any} />
      <Stack.Screen name="CheckInScanner" component={CheckInScannerScreen as any} />
      <Stack.Screen name="ManageTickets" component={ManageTicketsScreen} />
      <Stack.Screen name="TicketForm" component={TicketFormScreen} />
      <Stack.Screen name="ManageRegistrations" component={ManageRegistrationsScreen} />
      <Stack.Screen name="ManageWaitlist" component={ManageWaitlistScreen} />
      <Stack.Screen name="ManageSessions" component={ManageSessionsScreen} />
      <Stack.Screen name="SessionForm" component={SessionFormScreen} />
    </Stack.Navigator>
  );
};
