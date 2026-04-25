import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, NeonCard, LoadingState, ErrorState, EmptyState } from '../../../components';
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
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('TicketForm', { eventId })}
        >
          <Plus size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NeonCard style={styles.ticketCard}>
            <View style={styles.ticketInfo}>
              <View style={styles.ticketTitleRow}>
                <TicketIcon size={18} color={theme.colors.secondary} />
                <Text style={styles.ticketName}>{item.name}</Text>
              </View>
              <Text style={styles.ticketPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.ticketDetail}>Capacity: {item.quantity} • Sold: {item.soldCount}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TicketForm', { eventId, ticketId: item.id })}>
                <Edit2 size={18} color={theme.colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Trash2 size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </NeonCard>
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
  createButton: { backgroundColor: theme.colors.primary, padding: theme.spacing.s, borderRadius: theme.borderRadius.round },
  listContainer: { padding: theme.spacing.m, paddingBottom: theme.spacing.xxl, flexGrow: 1 },
  ticketCard: { marginBottom: theme.spacing.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketInfo: { flex: 1 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ticketName: { ...theme.typography.h3, color: theme.colors.text, marginLeft: theme.spacing.xs },
  ticketPrice: { ...theme.typography.body, color: theme.colors.primaryLight, marginBottom: 2, fontWeight: 'bold' },
  ticketDetail: { ...theme.typography.caption, color: theme.colors.textMuted },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: theme.spacing.s, marginLeft: theme.spacing.xs, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: theme.borderRadius.m },
});
