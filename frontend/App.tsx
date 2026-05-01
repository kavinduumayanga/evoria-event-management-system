import React, { useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const renderCountRef = useRef(0);
  const previousRouteNameRef = useRef<string | undefined>(undefined);
  renderCountRef.current += 1;

  if (__DEV__) {
    console.log(`[App] render #${renderCountRef.current}`);
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          const route = navigationRef.getCurrentRoute();
          previousRouteNameRef.current = route?.name;
          if (__DEV__) {
            console.log('[Navigation] ready', {
              routeName: route?.name,
              routeKey: route?.key,
            });
          }
        }}
        onStateChange={() => {
          const route = navigationRef.getCurrentRoute();
          const previousRouteName = previousRouteNameRef.current;
          const nextRouteName = route?.name;
          previousRouteNameRef.current = nextRouteName;

          if (__DEV__) {
            console.log('[Navigation] state change', {
              from: previousRouteName,
              to: nextRouteName,
              routeKey: route?.key,
            });
          }
        }}
      >
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
