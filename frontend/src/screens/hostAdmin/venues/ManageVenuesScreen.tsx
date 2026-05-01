import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import { ScreenContainer, GlassCard, LoadingState, ErrorState, EmptyState } from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react-native';
import { VenueService } from '../../../api/services';
import { Venue } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';

type ManageVenuesNavigationProp = NativeStackNavigationProp<HostAdminVenueStackParamList, 'ManageVenues'>;

interface Props {
  navigation: ManageVenuesNavigationProp;
}

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
    } catch (err) {
      console.error(err);
      setError('Failed to load venues');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVenues();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchVenues();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Venue', 'Are you sure you want to delete this venue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await VenueService.deleteVenue(id);
            setVenues(prev => prev.filter(v => v.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete venue');
          }
        }
      }
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchVenues} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Venues</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('VenueForm', {})}
        >
          <Plus size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GlassCard style={styles.venueCard}>
            <View style={styles.venueInfo}>
              <View style={styles.venueTitleRow}>
                <MapPin size={20} color={theme.colors.primary} />
                <Text style={styles.venueName}>{item.name}</Text>
              </View>
              <Text style={styles.venueDetail}>{item.city} • Capacity: {item.capacity}</Text>
              <Text style={styles.venueType}>Type: {item.type.toUpperCase()}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('VenueForm', { venueId: item.id })}>
                <Edit2 size={18} color={theme.colors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Trash2 size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={<EmptyState title="No Venues Found" message="Create your first venue to host events." />}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
    paddingTop: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.round,
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  venueCard: {
    marginBottom: theme.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
  },
  venueInfo: {
    flex: 1,
  },
  venueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  venueName: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  venueDetail: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  venueType: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    padding: theme.spacing.s,
    marginLeft: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.borderRadius.m,
  },
});
