import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Users, CheckCircle2, UserCheck, Ticket, DollarSign, Percent } from 'lucide-react-native';
import { AnalyticsService } from '../../../api/services';
import { ScreenContainer, LoadingState, ErrorState, StatCard } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventAnalytics } from '../../../types';

type EventAnalyticsStandaloneParamList = {
  EventAnalytics: { eventId: string };
};

type EventAnalyticsNavigationProp = NativeStackNavigationProp<EventAnalyticsStandaloneParamList, 'EventAnalytics'>;
type EventAnalyticsRouteProp = RouteProp<EventAnalyticsStandaloneParamList, 'EventAnalytics'>;

interface Props {
  navigation: EventAnalyticsNavigationProp;
  route: EventAnalyticsRouteProp;
}

export const EventAnalyticsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const response = await AnalyticsService.getEventAnalytics(eventId);
      setAnalytics(response.data);
    } catch (fetchError: any) {
      setError(fetchError.response?.data?.message || 'Failed to load event analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [eventId])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAnalytics();
  }, [eventId]);

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchAnalytics} /></ScreenContainer>;
  if (!analytics) return <ScreenContainer><ErrorState message="No analytics available" onRetry={fetchAnalytics} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={20} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Event Analytics</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Registrations"
              value={analytics.totalRegistrations}
              icon={<Users size={22} color={theme.colors.primary} />}
              style={styles.statCard}
            />
            <StatCard
              title="Approved"
              value={analytics.totalApproved}
              icon={<CheckCircle2 size={22} color={theme.colors.success} />}
              style={styles.statCard}
              accentColor={theme.colors.success}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Attended"
              value={analytics.totalAttended}
              icon={<UserCheck size={22} color={theme.colors.secondary} />}
              style={styles.statCard}
              accentColor={theme.colors.secondary}
            />
            <StatCard
              title="Tickets Sold"
              value={analytics.ticketsSold}
              icon={<Ticket size={22} color={theme.colors.accent} />}
              style={styles.statCard}
              accentColor={theme.colors.accent}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Revenue"
              value={analytics.totalRevenue.toFixed(2)}
              icon={<DollarSign size={22} color={theme.colors.success} />}
              style={styles.statCard}
              accentColor={theme.colors.success}
            />
            <StatCard
              title="Conversion %"
              value={analytics.conversionRate.toFixed(2)}
              icon={<Percent size={22} color={theme.colors.warning} />}
              style={styles.statCard}
              accentColor={theme.colors.warning}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.m,
    paddingTop: theme.spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginRight: theme.spacing.s,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  statsGrid: {
    marginBottom: theme.spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  statCard: {
    flex: 0.48,
  },
});
