import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, NeonCard, LoadingState, ErrorState, EmptyState } from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, ArrowLeft, Layers } from 'lucide-react-native';
import { SessionService } from '../../../api/services';
import { Session } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';

type ManageSessionsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageSessions'>;
type ManageSessionsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageSessions'>;

interface Props {
  navigation: ManageSessionsNavigationProp;
  route: ManageSessionsRouteProp;
}

export const ManageSessionsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    try {
      setError(null);
      const res = await SessionService.getEventSessions(eventId);
      setSessions(res.data.sessions);
    } catch (err) {
      console.error(err);
      setError('Failed to load sessions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [eventId])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchSessions();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await SessionService.deleteSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete session');
          }
        }
      }
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchSessions} /></ScreenContainer>;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Agenda</Text>
        </View>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('SessionForm', { eventId })}
        >
          <Plus size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NeonCard style={styles.sessionCard}>
            <View style={styles.sessionInfo}>
              <View style={styles.sessionTitleRow}>
                <Layers size={18} color={theme.colors.primaryLight} />
                <Text style={styles.sessionName}>{item.title}</Text>
              </View>
              <Text style={styles.sessionDetail}>{item.startTime} - {item.endTime}</Text>
              {item.speakerName && <Text style={styles.sessionSpeaker}>Speaker: {item.speakerName}</Text>}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('SessionForm', { eventId, sessionId: item.id })}>
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
        ListEmptyComponent={<EmptyState title="No Agenda Yet" message="Add sessions to build your event agenda." />}
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
  sessionCard: { marginBottom: theme.spacing.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionInfo: { flex: 1 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sessionName: { ...theme.typography.h3, color: theme.colors.text, marginLeft: theme.spacing.xs },
  sessionDetail: { ...theme.typography.caption, color: theme.colors.primaryLight, marginBottom: 2 },
  sessionSpeaker: { ...theme.typography.caption, color: theme.colors.textMuted },
  actions: { flexDirection: 'row' },
  actionBtn: { padding: theme.spacing.s, marginLeft: theme.spacing.xs, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: theme.borderRadius.m },
});
