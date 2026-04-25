import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HostAdminVenueStackParamList } from '../types/navigation';
import { ManageVenuesScreen } from '../screens/hostAdmin/venues/ManageVenuesScreen';
import { VenueFormScreen } from '../screens/hostAdmin/venues/VenueFormScreen';

const Stack = createNativeStackNavigator<HostAdminVenueStackParamList>();

export const HostAdminVenueStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ManageVenues" component={ManageVenuesScreen} />
      <Stack.Screen name="VenueForm" component={VenueFormScreen} />
    </Stack.Navigator>
  );
};
