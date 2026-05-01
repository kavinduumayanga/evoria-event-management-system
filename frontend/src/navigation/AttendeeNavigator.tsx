import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../types/navigation';
import { theme } from '../constants/theme';
import { Home, Ticket, User, Bell } from 'lucide-react-native';
import { AttendeeHomeStack } from './AttendeeHomeStack';
import { AttendeeProfileStack } from './AttendeeProfileStack';
import { MyBookingsScreen } from '../screens/attendee/MyBookingsScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';

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
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="MyBookings" 
        component={MyBookingsScreen} 
        options={{ 
          tabBarLabel: 'Tickets',
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} /> 
        }} 
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
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
