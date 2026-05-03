type BackCapableNavigation = {
  canGoBack?: () => boolean;
  goBack: () => void;
  navigate: (name: string, params?: any) => void;
};

type FallbackRoute = {
  name: string;
  params?: Record<string, unknown>;
};

const DEFAULT_FALLBACKS: FallbackRoute[] = [
  { name: 'EventList' },
  { name: 'ManageEvents' },
  { name: 'HomeStack', params: { screen: 'EventList' } },
  { name: 'EventsStack', params: { screen: 'ManageEvents' } },
  { name: 'Dashboard' },
  { name: 'Welcome' },
];

export const goBackOrFallback = (
  navigation: BackCapableNavigation,
  fallbackRoutes?: FallbackRoute | FallbackRoute[],
) => {
  if (navigation?.canGoBack?.()) {
    navigation.goBack();
    return;
  }

  const fallbacks = Array.isArray(fallbackRoutes)
    ? fallbackRoutes
    : fallbackRoutes
      ? [fallbackRoutes]
      : DEFAULT_FALLBACKS;

  for (const fallback of fallbacks) {
    try {
      navigation.navigate(fallback.name, fallback.params);
      return;
    } catch {
      // Try the next available fallback target.
    }
  }
};
