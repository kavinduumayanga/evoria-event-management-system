import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore, initAuth } from '../store/auth.store';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { AttendeeNavigator } from './AttendeeNavigator';
import { HostAdminNavigator } from './HostAdminNavigator';
import { theme } from '../constants/theme';
import { EventService } from '../api/services';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isStackResolving, setIsStackResolving] = useState(false);
  const [activeStack, setActiveStack] = useState<'Auth' | 'HostAdmin' | 'Attendee'>('Auth');
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

  useEffect(() => {
    let isMounted = true;

    const resolveActiveStack = async () => {
      if (!token) {
        if (isMounted) {
          setActiveStack('Auth');
          setIsStackResolving(false);
        }
        return;
      }

      if (!user?.id) {
        if (isMounted) {
          setActiveStack('Attendee');
          setIsStackResolving(false);
        }
        return;
      }

      if (isMounted) {
        setIsStackResolving(true);
      }

      try {
        const response = await EventService.getHostEvents(user.id);
        const managedEvents = response?.data?.events;
        const hasManagedEvents = Array.isArray(managedEvents) && managedEvents.length > 0;
        const fallbackLegacyStack = user.role === 'host_admin' ? 'HostAdmin' : 'Attendee';

        if (isMounted) {
          setActiveStack(hasManagedEvents ? 'HostAdmin' : fallbackLegacyStack);
        }
      } catch (error) {
        if (isMounted) {
          setActiveStack(user.role === 'host_admin' ? 'HostAdmin' : 'Attendee');
        }
      } finally {
        if (isMounted) {
          setIsStackResolving(false);
        }
      }
    };

    resolveActiveStack();

    return () => {
      isMounted = false;
    };
  }, [token, user?.id, user?.role]);

  if (__DEV__) {
    console.log('[RootNavigator] render', {
      renderCount: renderCountRef.current,
      hasUser: Boolean(user),
      hasToken: Boolean(token),
      isAuthLoading,
      isStackResolving,
      isAuthReady,
      activeStack,
    });
  }

  if (!isAuthReady || isAuthLoading || isStackResolving) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {activeStack === 'Auth' ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : activeStack === 'HostAdmin' ? (
        <Stack.Screen name="HostAdmin" component={HostAdminNavigator} />
      ) : (
        <Stack.Screen name="Attendee" component={AttendeeNavigator} />
      )}
    </Stack.Navigator>
  );
};
