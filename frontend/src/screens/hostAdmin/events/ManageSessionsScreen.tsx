import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import {
  ScreenContainer, Card, LoadingState, ErrorState, EmptyState,
  IconButton, StatusBadge, Button,
} from '../../../components';
import { theme } from '../../../constants/theme';
import { Plus, Edit2, Trash2, ArrowLeft, Layers, Clock, User as UserIcon } from 'lucide-react-native';
import { SessionService } from '../../../api/services';
import { Session } from '../../../types';

type ManageSessionsNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'ManageSessions'>;
type ManageSessionsRouteProp = RouteProp<HostAdminEventStackParamList, 'ManageSessions'>;

interface Props {
  navigation: ManageSessionsNavigationProp;
  route: ManageSessionsRouteProp;
}

const SESSION_STATUS: Record<string, any> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'error',
};

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
    } catch { setError('Failed to load sessions'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchSessions(); }, [eventId]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchSessions(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await SessionService.deleteSession(id);
            setSessions((prev) => prev.filter((s) => s.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete session'); }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchSessions} /></ScreenContainer>;

  return (
    <ScreenContainer>
      <FlatList
        data={sessions}
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
              <Text style={styles.pageTitle}>Agenda</Text>
            </View>
            <Button
              title="Add Session"
              onPress={() => navigation.navigate('SessionForm', { eventId })}
              variant="primary"
              size="sm"
              icon={<Plus size={15} color={theme.colors.textOnPrimary} />}
              fullWidth={false}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Layers size={48} color={theme.colors.textMuted} />}
            title="No Sessions Yet"
            message="Add sessions to build your event agenda."
            action={{ label: 'Add Session', onPress: () => navigation.navigate('SessionForm', { eventId }) }}
          />
        }
        renderItem={({ item }) => (
          <Card variant="raised" style={styles.sessionCard} noPadding>
            <View style={styles.sessionInner}>
              <View style={styles.sessionTitleRow}>
                <Layers size={16} color={theme.colors.primary} />
                <Text style={styles.sessionName} numberOfLines={1}>{item.title}</Text>
                <StatusBadge status={SESSION_STATUS[item.status] ?? 'neutral'} label={item.status} />
              </View>

              <View style={styles.sessionMeta}>
                <Clock size={12} color={theme.colors.textMuted} />
                <Text style={styles.sessionMetaText}>{item.startTime} – {item.endTime}</Text>
                {item.hallOrRoom && (
                  <>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.sessionMetaText}>{item.hallOrRoom}</Text>
                  </>
                )}
              </View>

              {item.speakerName && (
                <View style={styles.sessionMeta}>
                  <UserIcon size={12} color={theme.colors.textMuted} />
                  <Text style={styles.sessionMetaText}>{item.speakerName}</Text>
                </View>
              )}
            </View>
            <View style={styles.actions}>
              <IconButton
                icon={<Edit2 size={16} color={theme.colors.primary} />}
                onPress={() => navigation.navigate('SessionForm', { eventId, sessionId: item.id })}
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
  listContent: { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.xxl, flexGrow: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.l },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  sessionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: theme.borderRadius.l, marginBottom: theme.spacing.sm, overflow: 'hidden' },
  sessionInner: { flex: 1, padding: theme.spacing.m, gap: 4 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' },
  sessionName: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText: { ...theme.typography.caption, color: theme.colors.textMuted },
  dot: { ...theme.typography.caption, color: theme.colors.textMuted, marginHorizontal: 2 },
  actions: { flexDirection: 'column', gap: 4, paddingRight: theme.spacing.sm },
});
