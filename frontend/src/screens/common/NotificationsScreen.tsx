import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Check, Trash2 } from 'lucide-react-native';
import { Notification } from '../../types';
import { NotificationService } from '../../api/services';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, GlassCard } from '../../components';

export const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const res = await NotificationService.getMyNotifications();
      setNotifications(res.data.notifications || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Notification', 'Do you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await NotificationService.deleteNotification(id);
            setNotifications((prev) => prev.filter((item) => item.id !== id));
          } catch {
            Alert.alert('Error', 'Failed to delete notification');
          }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchNotifications} />
      </ScreenContainer>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Bell size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Notifications</Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Notifications"
            message="You're all caught up. New updates will appear here."
          />
        }
        renderItem={({ item }) => (
          <GlassCard style={[styles.itemCard, !item.isRead && styles.unreadCard]}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <View style={styles.metaBadges}>
                <View style={[styles.statusBadge, { borderColor: theme.colors.secondary }]}>
                  <Text style={[styles.statusText, { color: theme.colors.secondary }]}>{item.status}</Text>
                </View>
                {!item.isRead && (
                  <View style={[styles.statusBadge, { borderColor: theme.colors.warning }]}>
                    <Text style={[styles.statusText, { color: theme.colors.warning }]}>unread</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.itemMessage}>{item.message}</Text>
            <Text style={styles.itemMeta}>
              {new Date(item.createdAt).toLocaleString()} - {item.channel}
            </Text>

            <View style={styles.actionsRow}>
              {!item.isRead && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleMarkAsRead(item.id)}>
                  <Check size={14} color={theme.colors.success} />
                  <Text style={[styles.actionText, { color: theme.colors.success }]}>Mark Read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                <Trash2 size={14} color={theme.colors.error} />
                <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.s,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  unreadBadge: {
    borderRadius: theme.borderRadius.round,
    minWidth: 30,
    height: 30,
    backgroundColor: `${theme.colors.warning}30`,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.s,
  },
  unreadText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    fontWeight: '700',
  },
  listContainer: {
    padding: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
    flexGrow: 1,
  },
  itemCard: {
    marginBottom: theme.spacing.m,
    padding: theme.spacing.m,
  },
  unreadCard: {
    borderColor: theme.colors.primary,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.s,
  },
  itemTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    flex: 1,
  },
  metaBadges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: 2,
  },
  statusText: {
    ...theme.typography.small,
    textTransform: 'uppercase',
  },
  itemMessage: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  itemMeta: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.s,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});
