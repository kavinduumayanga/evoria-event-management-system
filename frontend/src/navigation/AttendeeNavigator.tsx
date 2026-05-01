import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../types/navigation';
import { theme } from '../constants/theme';
import { Home, Ticket, User, CalendarDays } from 'lucide-react-native';
import { AttendeeHomeStack } from './AttendeeHomeStack';
import { AttendeeProfileStack } from './AttendeeProfileStack';
import { MyBookingsScreen } from '../screens/attendee/MyBookingsScreen';
import { MyEventsScreen } from '../screens/attendee/MyEventsScreen';

const Tab = createBottomTabNavigator<AttendeeTabParamList>();

export const AttendeeNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="HomeStack" 
        component={AttendeeHomeStack} 
        options={{ 
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="MyEvents" 
        component={MyEventsScreen} 
        options={{ 
          tabBarLabel: 'My Events',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="MyRegistrations" 
        component={MyBookingsScreen} 
        options={{ 
          tabBarLabel: 'My Registrations',
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={AttendeeProfileStack}
        options={{ 
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} /> 
        }} 
      />
    </Tab.Navigator>
  );
};
