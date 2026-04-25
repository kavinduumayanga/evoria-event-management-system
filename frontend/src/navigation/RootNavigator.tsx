import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore, initAuth } from '../store/auth.store';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { AttendeeNavigator } from './AttendeeNavigator';
import { HostAdminNavigator } from './HostAdminNavigator';
import { theme } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const { user, token, isLoading } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : user?.role === 'host_admin' ? (
        <Stack.Screen name="HostAdmin" component={HostAdminNavigator} />
      ) : (
        <Stack.Screen name="Attendee" component={AttendeeNavigator} />
      )}
    </Stack.Navigator>
  );
};
