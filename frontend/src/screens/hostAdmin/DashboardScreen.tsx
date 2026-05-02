import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  CalendarDays, Users, DollarSign, UserCheck,
  TrendingUp, Settings,
} from 'lucide-react-native';
import {
  ScreenContainer, StatCard, EventCard,
  LoadingState, ErrorState, EmptyState, SectionHeader,
} from '../../components';
import { theme } from '../../constants/theme';
import { AnalyticsService, EventService, UserService } from '../../api/services';
import { Event, DashboardAnalytics } from '../../types';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalAttendees: 0,
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  const fetchData = async () => {
    try {
      setError(null);
      const [userRes, analyticsRes, eventsRes] = await Promise.all([
        UserService.getMe(),
        AnalyticsService.getDashboardAnalytics(),
        EventService.getEvents(),
      ]);
      setUserName(userRes.data.user.name);
      setAnalytics(analyticsRes.data);
      setRecentEvents((eventsRes.data.events || []).slice(0, 3));
    } catch {
      setError('Failed to load dashboard analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  // Get first name only
  const firstName = userName.split(' ')[0] || userName;

  return (
    <ScreenContainer scrollable refreshing={isRefreshing} onRefresh={onRefresh}>
      {/* === PAGE HEADER === */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.role}>Host Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}
        >
          <Settings size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* === STATS GRID (2×2) === */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Events"
            value={analytics.totalEvents}
            icon={<CalendarDays size={22} color={theme.colors.primary} />}
            style={styles.statCard}
            accentColor={theme.colors.primary}
          />
          <StatCard
            title="Bookings"
            value={analytics.totalBookings}
            icon={<Users size={22} color={theme.colors.primaryLight} />}
            style={styles.statCard}
            accentColor={theme.colors.primaryLight}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Revenue"
            value={`$${analytics.totalRevenue.toFixed(0)}`}
            icon={<DollarSign size={22} color={theme.colors.success} />}
            style={styles.statCard}
            accentColor={theme.colors.success}
          />
          <StatCard
            title="Attendees"
            value={analytics.totalAttendees}
            icon={<UserCheck size={22} color={theme.colors.warning} />}
            style={styles.statCard}
            accentColor={theme.colors.warning}
          />
        </View>
      </View>

      {/* === RECENT EVENTS === */}
      <SectionHeader
        title="Recent Events"
        action={{
          label: 'See All',
          onPress: () => navigation.navigate('EventsStack', { screen: 'ManageEvents' }),
        }}
        style={styles.sectionHeader}
      />

      {recentEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={40} color={theme.colors.textMuted} />}
          title="No Events Yet"
          message="Create your first event to get started."
          action={{
            label: 'Create Event',
            onPress: () => navigation.navigate('EventsStack', { screen: 'EventForm', params: {} }),
          }}
        />
      ) : (
        recentEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            variant="list"
            onPress={() => navigation.navigate('EventsStack', {
              screen: 'EventForm',
              params: { eventId: event.id },
            })}
          />
        ))
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  role: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.m,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.m,
  },
  statCard: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.base,
    marginBottom: theme.spacing.m,
  },
});
