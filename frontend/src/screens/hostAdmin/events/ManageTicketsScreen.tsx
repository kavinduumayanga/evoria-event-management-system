import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, GlassCard, LoadingState, ErrorState, EmptyState, IconButton } from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, ArrowLeft, Ticket as TicketIcon } from 'lucide-react-native';
import { TicketService } from '../../../api/services';
import { TicketType } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';

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
    } catch (err) {
      console.error(err);
      setError('Failed to load tickets');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [eventId])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTickets();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket type?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await TicketService.deleteTicket(id);
            setTickets(prev => prev.filter(t => t.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete ticket');
          }
        }
      }
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchTickets} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Tickets</Text>
        </View>
        <IconButton
          icon={<Plus size={20} color={theme.colors.text} />}
          onPress={() => navigation.navigate('TicketForm', { eventId })}
          variant="solid"
        />
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GlassCard style={styles.ticketCard} variant={item.isActive ? 'dark' : 'primary'}>
            <View style={styles.ticketInfo}>
              <View style={styles.ticketTitleRow}>
                <TicketIcon size={18} color={theme.colors.secondary} />
                <Text style={styles.ticketName}>{item.name}</Text>
                <View style={[styles.ticketBadge, { backgroundColor: item.isFree ? `${theme.colors.success}20` : `${theme.colors.secondary}20` }]}>
                  <Text style={[styles.ticketBadgeText, { color: item.isFree ? theme.colors.success : theme.colors.secondary }]}>
                    {item.isFree ? 'FREE' : 'PAID'}
                  </Text>
                </View>
                {!item.isActive && (
                  <View style={[styles.ticketBadge, { backgroundColor: `${theme.colors.warning}20`, marginLeft: 4 }]}>
                    <Text style={[styles.ticketBadgeText, { color: theme.colors.warning }]}>HIDDEN</Text>
                  </View>
                )}
              </View>
              <Text style={styles.ticketPrice}>
                {item.isFree ? 'Free' : `${item.currency || 'LKR'} ${item.price.toFixed(2)}`}
              </Text>
              <Text style={styles.ticketDetail}>
                Capacity: {item.quantity} • Sold: {item.soldCount} • Remaining: {Math.max(0, item.quantity - item.soldCount)}
              </Text>
              <Text style={styles.ticketDetail}>Max per user: {item.maxPerUser}</Text>
            </View>
            <View style={styles.actions}>
              <IconButton
                icon={<Edit2 size={16} color={theme.colors.text} />}
                onPress={() => navigation.navigate('TicketForm', { eventId, ticketId: item.id })}
                variant="outline"
                style={{ marginRight: 8 }}
              />
              <IconButton
                icon={<Trash2 size={16} color={theme.colors.error} />}
                onPress={() => handleDelete(item.id)}
                variant="outline"
              />
            </View>
          </GlassCard>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Tickets" message="Add tickets so attendees can book your event." />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.m, paddingTop: theme.spacing.xl },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: theme.spacing.m },
  title: { ...theme.typography.h1, color: theme.colors.text },
  listContainer: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl, flexGrow: 1 },
  ticketCard: { marginBottom: theme.spacing.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketInfo: { flex: 1 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  ticketName: { ...theme.typography.h3, color: theme.colors.text, marginLeft: theme.spacing.xs },
  ticketBadge: {
    marginLeft: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
  },
  ticketBadgeText: {
    ...theme.typography.small,
    fontWeight: '700',
  },
  ticketPrice: { ...theme.typography.body, color: theme.colors.primaryLight, marginBottom: 2, fontWeight: 'bold' },
  ticketDetail: { ...theme.typography.caption, color: theme.colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
