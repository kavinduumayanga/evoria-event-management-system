import React, { useEffect, useRef, useState } from 'react';
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
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      await initAuth();
      if (isMounted) {
        setIsAuthReady(true);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (__DEV__) {
      console.log('[RootNavigator] mounted');
    }

    return () => {
      if (__DEV__) {
        console.log('[RootNavigator] unmounted');
      }
    };
  }, []);

  const activeStack = !token ? 'Auth' : user?.role === 'host_admin' ? 'HostAdmin' : 'Attendee';

  if (__DEV__) {
    console.log('[RootNavigator] render', {
      renderCount: renderCountRef.current,
      hasUser: Boolean(user),
      hasToken: Boolean(token),
      isAuthLoading,
      isAuthReady,
      activeStack,
    });
  }

  if (!isAuthReady || isAuthLoading) {
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
