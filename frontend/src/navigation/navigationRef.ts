import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigateToEventDetails = (eventId: string) => {
  if (!eventId || !navigationRef.isReady()) return;

  navigationRef.navigate('Attendee', {
    screen: 'HomeStack',
    params: {
      screen: 'EventDetails',
      params: { eventId },
    },
  });
};
