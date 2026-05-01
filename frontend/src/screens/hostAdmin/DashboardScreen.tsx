import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CalendarDays, Users, DollarSign, UserCheck } from 'lucide-react-native';
import { ScreenContainer, StatCard, EventCard, LoadingState, ErrorState, EmptyState } from '../../components';
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
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load dashboard analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  return (
    <ScreenContainer
      scrollable
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{userName}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Total Events"
            value={analytics.totalEvents}
            icon={<CalendarDays size={24} color={theme.colors.primary} />}
            style={styles.statCard}
          />
          <StatCard
            title="Total Bookings"
            value={analytics.totalBookings}
            icon={<Users size={24} color={theme.colors.secondary} />}
            style={styles.statCard}
            accentColor={theme.colors.secondary}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title="Revenue"
            value={analytics.totalRevenue.toFixed(2)}
            icon={<DollarSign size={24} color={theme.colors.success} />}
            style={styles.statCard}
            accentColor={theme.colors.success}
          />
          <StatCard
            title="Attendees"
            value={analytics.totalAttendees}
            icon={<UserCheck size={24} color={theme.colors.accent} />}
            style={styles.statCard}
            accentColor={theme.colors.accent}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        <Text style={styles.seeAll} onPress={() => navigation.navigate('EventsStack', { screen: 'ManageEvents' })}>
          See All
        </Text>
      </View>

      {recentEvents.length === 0 ? (
        <EmptyState title="No Events Yet" message="Create your first event to get started" />
      ) : (
        recentEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
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
  container: {
    paddingTop: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  greeting: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  name: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  statsGrid: {
    marginBottom: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  statCard: {
    flex: 0.48,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  seeAll: {
    ...theme.typography.button,
    color: theme.colors.primary,
  },
});
