import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../types/navigation';
import { ManageEventsScreen } from '../screens/hostAdmin/events/ManageEventsScreen';
import { EventFormScreen } from '../screens/hostAdmin/events/EventFormScreen';
import { ManageTicketsScreen } from '../screens/hostAdmin/events/ManageTicketsScreen';
import { TicketFormScreen } from '../screens/hostAdmin/events/TicketFormScreen';
import { ManageSessionsScreen } from '../screens/hostAdmin/events/ManageSessionsScreen';
import { SessionFormScreen } from '../screens/hostAdmin/events/SessionFormScreen';

const Stack = createNativeStackNavigator<HostAdminEventStackParamList>();

export const HostAdminEventStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManageEvents" component={ManageEventsScreen} />
      <Stack.Screen name="EventForm" component={EventFormScreen} />
      <Stack.Screen name="ManageTickets" component={ManageTicketsScreen} />
      <Stack.Screen name="TicketForm" component={TicketFormScreen} />
      <Stack.Screen name="ManageSessions" component={ManageSessionsScreen} />
      <Stack.Screen name="SessionForm" component={SessionFormScreen} />
    </Stack.Navigator>
  );
};
