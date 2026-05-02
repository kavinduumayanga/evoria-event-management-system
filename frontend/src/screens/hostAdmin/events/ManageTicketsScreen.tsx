import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  ScreenContainer, Card, LoadingState, ErrorState, EmptyState,
  IconButton, StatusBadge, Button,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, ArrowLeft, Ticket as TicketIcon } from 'lucide-react-native';
import { TicketService } from '../../../api/services';
import { TicketType } from '../../../types';

type ManageTicketsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageTickets'>;
type ManageTicketsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageTickets'>;

interface Props {
  navigation: ManageTicketsNavigationProp;
  route: ManageTicketsRouteProp;
}

export const ManageTicketsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);

  const fetchTickets = async () => {
    try {
      setError(null);
      const res = await TicketService.getEventTickets(eventId);
      setTickets(res.data.tickets);
    } catch { setError('Failed to load tickets'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchTickets(); }, [eventId]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchTickets(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket type?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await TicketService.deleteTicket(id);
            setTickets((prev) => prev.filter((t) => t.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete ticket'); }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchTickets} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.headerLeft}>
              <IconButton
                icon={<ArrowLeft size={20} color={theme.colors.text} />}
                onPress={() => navigation.goBack()}
                variant="surface"
                size={36}
              />
              <Text style={styles.pageTitle}>Tickets</Text>
            </View>
            <Button
              title="New"
              onPress={() => navigation.navigate('TicketForm', { eventId })}
              variant="primary"
              size="sm"
              icon={<Plus size={15} color={theme.colors.textOnPrimary} />}
              fullWidth={false}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<TicketIcon size={48} color={theme.colors.textMuted} />}
            title="No Tickets"
            message="Add tickets so attendees can book your event."
            action={{ label: 'Add Ticket', onPress: () => navigation.navigate('TicketForm', { eventId }) }}
          />
        }
        renderItem={({ item }) => (
          <Card variant={item.isActive ? 'raised' : 'default'} style={styles.ticketCard} noPadding>
            <View style={styles.ticketInner}>
              {/* Header row */}
              <View style={styles.ticketTitleRow}>
                <TicketIcon size={16} color={theme.colors.primary} />
                <Text style={styles.ticketName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.badges}>
                  <StatusBadge status={item.isFree ? 'success' : 'info'} label={item.isFree ? 'Free' : 'Paid'} />
                  {!item.isActive && <StatusBadge status="warning" label="Hidden" />}
                </View>
              </View>

              {/* Price */}
              <Text style={styles.ticketPrice}>
                {item.isFree ? 'Free' : `${item.currency || 'LKR'} ${item.price.toFixed(2)}`}
              </Text>

              {/* Capacity row */}
              <Text style={styles.ticketDetail}>
                {item.soldCount}/{item.quantity} sold · {Math.max(0, item.quantity - item.soldCount)} left · max {item.maxPerUser}/user
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.ticketActions}>
              <IconButton
                icon={<Edit2 size={16} color={theme.colors.primary} />}
                onPress={() => navigation.navigate('TicketForm', { eventId, ticketId: item.id })}
                variant="surface"
                size={34}
              />
              <IconButton
                icon={<Trash2 size={16} color={theme.colors.error} />}
                onPress={() => handleDelete(item.id)}
                variant="surface"
                size={34}
              />
            </View>
          </Card>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  ticketInner: { flex: 1, padding: theme.spacing.m, gap: 4 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' },
  ticketName: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1 },
  badges: { flexDirection: 'row', gap: 4 },
  ticketPrice: { ...theme.typography.h3, fontSize: 15, color: theme.colors.primary },
  ticketDetail: { ...theme.typography.caption, color: theme.colors.textMuted },
  ticketActions: { flexDirection: 'column', alignItems: 'center', gap: 4, paddingRight: theme.spacing.sm },
});
