import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { PushService } from '../api/services';
import { useAuthStore } from '../store/auth.store';
import { navigateToEventDetails } from '../navigation/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const resolveProjectId = () => {
  const fromEasConfig = (Constants as any)?.easConfig?.projectId;
  const fromExpoConfig = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
  return String(fromEasConfig || fromExpoConfig || '').trim();
};

const registerForPushToken = async () => {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }

  const projectId = resolveProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  return tokenResponse.data;
};

export const usePushNotifications = () => {
  const user = useAuthStore((state) => state.user);
  const authToken = useAuthStore((state) => state.token);
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !authToken) return;

    let isMounted = true;
    let receivedSubscription: Notifications.EventSubscription | null = null;
    let responseSubscription: Notifications.EventSubscription | null = null;

    const setup = async () => {
      try {
        const expoPushToken = await registerForPushToken();
        if (!expoPushToken || !isMounted) return;

        registeredTokenRef.current = expoPushToken;

        await PushService.registerToken({
          expoPushToken,
          deviceInfo: {
            platform: Platform.OS,
            deviceName: Device.deviceName || Device.modelName || '',
            osVersion: Device.osVersion || '',
            appVersion: String((Constants as any)?.expoConfig?.version || ''),
          },
        });

        receivedSubscription = Notifications.addNotificationReceivedListener(() => {
          // Foreground notification display is handled by setNotificationHandler.
        });

        responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data || {};
          const eventId = String((data as any).eventId || '').trim();
          if (eventId) {
            navigateToEventDetails(eventId);
          }
        });
      } catch (error) {
        console.warn('Push notification setup failed', error);
      }
    };

    setup();

    return () => {
      isMounted = false;
      if (receivedSubscription) receivedSubscription.remove();
      if (responseSubscription) responseSubscription.remove();
    };
  }, [user?.id, authToken]);

  useEffect(() => {
    if (authToken) return;

    const token = registeredTokenRef.current;
    if (!token) return;

    PushService.deleteToken(token).catch(() => undefined);
    registeredTokenRef.current = null;
  }, [authToken]);
};
