import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HostAdminTabParamList } from '../types/navigation';
import { theme } from '../constants/theme';
import { LayoutDashboard, CalendarDays, Users, User, MapPin, QrCode, Megaphone, Bell } from 'lucide-react-native';

import { DashboardScreen } from '../screens/hostAdmin/DashboardScreen';
import { HostAdminEventStack } from './HostAdminEventStack';
import { HostAdminVenueStack } from './HostAdminVenueStack';
import { HostAdminProfileStack } from './HostAdminProfileStack';
import { ManageBookingsScreen } from '../screens/hostAdmin/ManageBookingsScreen';
import { CheckInScannerScreen } from '../screens/hostAdmin/CheckInScannerScreen';
import { AnnouncementScreen } from '../screens/hostAdmin/AnnouncementScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';

const Tab = createBottomTabNavigator<HostAdminTabParamList>();

export const HostAdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ 
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="EventsStack" 
        component={HostAdminEventStack} 
        options={{ 
          tabBarLabel: 'Events',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="VenuesStack" 
        component={HostAdminVenueStack} 
        options={{ 
          tabBarLabel: 'Venues',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} /> 
        }} 
      />
      <Tab.Screen 
        name="ManageBookings" 
        component={ManageBookingsScreen} 
        options={{ 
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> 
        }} 
      />
      <Tab.Screen
        name="CheckIns"
        component={CheckInScannerScreen}
        options={{
          tabBarLabel: 'Check-in',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Announcements"
        component={AnnouncementScreen}
        options={{
          tabBarLabel: 'Broadcast',
          tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />,
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
        component={HostAdminProfileStack}
        options={{ 
          tabBarIcon: ({ color, size }) => <User color={color} size={size} /> 
        }} 
      />
    </Tab.Navigator>
  );
};
