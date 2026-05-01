import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard, SecondaryButton } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService, WaitlistService } from '../../../api/services';
import { Event, Booking } from '../../../types';
import { ArrowLeft, UserCheck } from 'lucide-react-native';

interface WaitlistItem extends Booking {
  attendee?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

type NavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageWaitlist'>;
type RouteProps = RouteProp<HostAdminEventStackParamList, 'ManageWaitlist'>;

interface Props {
  navigation: NavigationProp;
  route: RouteProps;
}

export const ManageWaitlistScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);

  const fetchData = async () => {
    try {
      setError(null);
      const [eventResponse, waitlistResponse] = await Promise.all([
        EventService.getEvent(eventId),
        WaitlistService.getEventWaitlist(eventId),
      ]);

      setEvent(eventResponse.data.event || null);
      setWaitlist(waitlistResponse.data.waitlist || []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Failed to load waitlist');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [eventId]),
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [eventId]);

  const handlePromote = (bookingId: string, attendeeName: string) => {
    Alert.alert('Promote Waitlist Entry', `Promote ${attendeeName} to confirmed booking?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote',
        onPress: async () => {
          try {
            await WaitlistService.promoteBooking(bookingId);
            fetchData();
          } catch (promoteError: any) {
            Alert.alert('Promotion Failed', promoteError.response?.data?.message || 'Unable to promote waitlist booking');
          }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchData} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Event Waitlist</Text>
          <Text style={styles.subtitle}>{event?.title || 'Event'}</Text>
        </View>
      </View>

      <FlatList
        data={waitlist}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.attendee?.name || 'Attendee'}</Text>
              <Text style={styles.positionText}>#{item.waitlistPosition || '-'}</Text>
            </View>
            <Text style={styles.metaText}>{item.attendee?.email || 'No email'}</Text>
            <Text style={styles.metaText}>Quantity: {item.quantity}</Text>
            <Text style={styles.metaText}>Joined: {new Date(item.createdAt).toLocaleString()}</Text>

            <View style={styles.actionRow}>
              <SecondaryButton
                title="Promote"
                icon={<UserCheck size={16} color={theme.colors.success} />}
                onPress={() => handlePromote(item.id, item.attendee?.name || 'this attendee')}
                style={styles.promoteButton}
              />
            </View>
          </GlassCard>
        )}
        ListEmptyComponent={<EmptyState title="Waitlist Empty" message="No attendees are waiting for this event right now." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  listContent: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  card: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.s,
  },
  positionText: {
    ...theme.typography.h2,
    color: theme.colors.warning,
  },
  metaText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  actionRow: {
    marginTop: theme.spacing.m,
  },
  promoteButton: {
    borderColor: theme.colors.success,
  },
});
