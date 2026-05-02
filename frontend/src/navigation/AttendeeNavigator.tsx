import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AttendeeTabParamList } from '../types/navigation';
import { Home, CalendarDays, Ticket, User } from 'lucide-react-native';
import { AttendeeHomeStack } from './AttendeeHomeStack';
import { AttendeeProfileStack } from './AttendeeProfileStack';
import { MyBookingsScreen } from '../screens/attendee/MyBookingsScreen';
import { MyEventsScreen } from '../screens/attendee/MyEventsScreen';
import { CustomTabBar } from '../components/CustomTabBar';

const Tab = createBottomTabNavigator<AttendeeTabParamList>();

export const AttendeeNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="HomeStack"
        component={AttendeeHomeStack}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyEvents"
        component={MyEventsScreen}
        options={{
          tabBarLabel: 'My Events',
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyRegistrations"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AttendeeProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
