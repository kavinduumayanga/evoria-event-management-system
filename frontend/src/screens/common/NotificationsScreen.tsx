import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, Check, Trash2, BellOff } from 'lucide-react-native';
import { Notification } from '../../types';
import { NotificationService } from '../../api/services';
import { theme } from '../../constants/theme';
import { ScreenContainer, LoadingState, ErrorState, EmptyState, Card, StatusBadge } from '../../components';

const TYPE_STATUS: Record<string, any> = {
  booking: 'success',
  reminder: 'info',
  announcement: 'warning',
  checkin: 'success',
  system: 'neutral',
};

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

  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchNotifications(); }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete', 'Remove this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await NotificationService.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
          } catch { Alert.alert('Error', 'Failed to delete notification'); }
        },
      },
    ]);
  };

  if (isLoading && !isRefreshing) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchNotifications} /></ScreenContainer>;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ScreenContainer>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View>
              <Text style={styles.pageTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Text style={styles.unreadLabel}>{unreadCount} unread</Text>
              )}
            </View>
            <View style={styles.bellWrap}>
              <Bell size={20} color={unreadCount > 0 ? theme.colors.warning : theme.colors.textMuted} />
              {unreadCount > 0 && <View style={styles.unreadDot} />}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={<BellOff size={48} color={theme.colors.textMuted} />}
            title="No Notifications"
            message="You're all caught up. New updates will appear here."
          />
        }
        renderItem={({ item }) => (
          <Card
            variant={item.isRead ? 'default' : 'primary'}
            style={styles.notifCard}
            noPadding
          >
            <View style={styles.notifInner}>
              {/* Title row */}
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                <StatusBadge status={TYPE_STATUS[item.type] ?? 'neutral'} label={item.type} />
              </View>

              {/* Message */}
              <Text style={styles.notifMessage}>{item.message}</Text>

              {/* Meta + actions */}
              <View style={styles.notifFooter}>
                <Text style={styles.notifTime}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                <View style={styles.notifActions}>
                  {!item.isRead && (
                    <TouchableOpacity
                      style={styles.actionPill}
                      onPress={() => handleMarkAsRead(item.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Check size={13} color={theme.colors.success} />
                      <Text style={[styles.actionPillText, { color: theme.colors.success }]}>Read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Trash2 size={13} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
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
    alignItems: 'flex-start',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  unreadLabel: { ...theme.typography.label, color: theme.colors.warning, marginTop: 2 },
  bellWrap: { position: 'relative', width: 44, height: 44, borderRadius: theme.borderRadius.m, backgroundColor: theme.colors.surfaceRaised, justifyContent: 'center', alignItems: 'center' },
  unreadDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.warning },
  notifCard: { marginBottom: theme.spacing.sm, borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  notifInner: { padding: theme.spacing.m },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.s, gap: theme.spacing.s },
  notifTitle: { ...theme.typography.h3, fontSize: 15, color: theme.colors.text, flex: 1 },
  notifMessage: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 22, marginBottom: theme.spacing.sm },
  notifFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTime: { ...theme.typography.caption, color: theme.colors.textMuted },
  notifActions: { flexDirection: 'row', gap: theme.spacing.s },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.borderRadius.xs, backgroundColor: theme.colors.surfaceOverlay },
  actionPillText: { ...theme.typography.caption, fontWeight: '600' },
});
