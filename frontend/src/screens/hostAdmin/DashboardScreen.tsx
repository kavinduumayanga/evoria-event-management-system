import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { ScreenContainer, StatCard, EventCard, LoadingState, ErrorState, EmptyState } from '../../components';
import { theme } from '../../constants/theme';
import { CalendarDays, Users, MapPin, Layers } from 'lucide-react-native';
import { EventService, BookingService, VenueService, SessionService, UserService } from '../../api/services';
import { Event } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ events: 0, bookings: 0, venues: 0, sessions: 0 });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  const fetchData = async () => {
    try {
      setError(null);
      
      const userRes = await UserService.getMe();
      setUserName(userRes.data.user.name);
      
      // Fetch all required data to compute stats
      // Note: Ideally the backend should provide a /stats endpoint to prevent over-fetching
      const [eventsRes, bookingsRes, venuesRes, sessionsRes] = await Promise.all([
        EventService.getEvents(),
        BookingService.getBookings(),
        VenueService.getVenues(),
        SessionService.getSessions()
      ]);

      const myEvents = eventsRes.data.events.filter((e: any) => e.hostAdminId === userRes.data.user.id);
      
      setStats({
        events: myEvents.length,
        bookings: bookingsRes.data.bookings.length, // assuming getBookings returns host's bookings as per backend logic
        venues: venuesRes.data.venues.length,
        sessions: sessionsRes.data.sessions.length,
      });

      // Just take top 3 events for dashboard
      setRecentEvents(myEvents.slice(0, 3));
      
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  return (
    <ScreenContainer scrollable style={styles.container}>
      <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
      
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{userName}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard 
            title="Total Events" 
            value={stats.events} 
            icon={<CalendarDays size={24} color={theme.colors.primary} />} 
            style={styles.statCard} 
          />
          <StatCard 
            title="Total Bookings" 
            value={stats.bookings} 
            icon={<Users size={24} color={theme.colors.secondary} />} 
            style={styles.statCard} 
            accentColor={theme.colors.secondary}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard 
            title="Venues" 
            value={stats.venues} 
            icon={<MapPin size={24} color={theme.colors.accent} />} 
            style={styles.statCard} 
            accentColor={theme.colors.accent}
          />
          <StatCard 
            title="Sessions" 
            value={stats.sessions} 
            icon={<Layers size={24} color={theme.colors.success} />} 
            style={styles.statCard} 
            accentColor={theme.colors.success}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Events</Text>
        <Text style={styles.seeAll} onPress={() => navigation.navigate('ManageEvents')}>See All</Text>
      </View>

      {recentEvents.length === 0 ? (
        <EmptyState title="No Events Yet" message="Create your first event to get started" />
      ) : (
        recentEvents.map(event => (
          <EventCard key={event.id} event={event} />
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
