import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import {
  ScreenContainer, Card, LoadingState, ErrorState, EmptyState,
  IconButton, StatusBadge, Button,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, MapPin, Building2 } from 'lucide-react-native';
import { VenueService } from '../../../api/services';
import { Venue } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';

type ManageVenuesNavigationProp = NativeStackNavigationProp<HostAdminVenueStackParamList, 'ManageVenues'>;
interface Props { navigation: ManageVenuesNavigationProp; }

const VENUE_STATUS: Record<string, any> = {
  physical: 'info',
  online: 'success',
  hybrid: 'warning',
};

export const ManageVenuesScreen: React.FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);

  const fetchVenues = async () => {
    try {
      setError(null);
      const res = await VenueService.getVenues();
      setVenues(res.data.venues);
    } catch { setError('Failed to load venues'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchVenues(); }, []));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchVenues(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Venue', 'Are you sure you want to delete this venue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await VenueService.deleteVenue(id);
            setVenues((prev) => prev.filter((v) => v.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete venue'); }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchVenues} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Venues</Text>
            <Button
              title="New"
              onPress={() => navigation.navigate('VenueForm', {})}
              variant="primary"
              size="sm"
              icon={<Plus size={15} color={theme.colors.textOnPrimary} />}
              fullWidth={false}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Building2 size={48} color={theme.colors.textMuted} />}
            title="No Venues Yet"
            message="Create your first venue to host events."
            action={{ label: 'Add Venue', onPress: () => navigation.navigate('VenueForm', {}) }}
          />
        }
        renderItem={({ item }) => (
          <Card variant="raised" style={styles.venueCard} noPadding>
            <View style={styles.iconWrap}>
              <MapPin size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.venueInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.venueName} numberOfLines={1}>{item.name}</Text>
                <StatusBadge status={VENUE_STATUS[item.type] ?? 'neutral'} label={item.type} />
              </View>
              <Text style={styles.venueDetail} numberOfLines={1}>{item.address}, {item.city}</Text>
              <Text style={styles.venueCapacity}>Capacity: {item.capacity.toLocaleString()}</Text>
            </View>
            <View style={styles.venueActions}>
              <IconButton
                icon={<Edit2 size={16} color={theme.colors.primary} />}
                onPress={() => navigation.navigate('VenueForm', { venueId: item.id })}
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
  listContent: { paddingHorizontal: theme.spacing.base, paddingBottom: 100, flexGrow: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.l },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  venueCard: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  iconWrap: { width: 56, justifyContent: 'center', alignItems: 'center', paddingVertical: theme.spacing.m, backgroundColor: theme.colors.primarySubtle },
  venueInfo: { flex: 1, paddingVertical: theme.spacing.m, paddingHorizontal: theme.spacing.sm, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.s },
  venueName: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1 },
  venueDetail: { ...theme.typography.caption, color: theme.colors.textMuted },
  venueCapacity: { ...theme.typography.caption, color: theme.colors.primary, fontWeight: '600' },
  venueActions: { flexDirection: 'column', gap: 4, paddingRight: theme.spacing.sm },
});
