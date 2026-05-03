import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { User, Mail, Phone, Shield, LogOut, ChevronRight, KeyRound } from 'lucide-react-native';
import { ScreenContainer, Card, LoadingState, ErrorState, Button } from '../../components';
import { theme } from '../../constants/theme';
import { UserService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';
import { resolveImageUrl } from '../../utils/imageUrl';
import { safeInitials } from '../../utils/safeText';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const resolvedProfileImage = resolveImageUrl(user?.profileImage);

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const response = await UserService.getMe();
      const currentUser = response?.data?.user;
      setUser(currentUser);
      if (currentUser) await updateAuthUser(currentUser);
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, [updateAuthUser]);

  useFocusEffect(useCallback(() => { setIsLoading(true); fetchProfile(); }, [fetchProfile]));

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to log out?');
      if (confirmed) {
        void logout();
      }
      return;
    }

    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  const handleDeactivateAccount = () => {
    Alert.alert('Deactivate Account', 'This will deactivate your account and sign you out. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            await UserService.deactivateAccount();
            await logout();
          } catch (err: any) {
            Alert.alert('Failed', getApiErrorMessage(err, 'Unable to deactivate account.'));
          }
        },
      },
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchProfile} /></ScreenContainer>;

  const initials = safeInitials(user?.name, 'H');

  return (
    <ScreenContainer scrollable>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        {resolvedProfileImage ? (
          <Image source={{ uri: resolvedProfileImage }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.userName}>{user?.name}</Text>
        <View style={styles.rolePill}>
          <Shield size={11} color={theme.colors.primaryLight} />
          <Text style={styles.roleText}>HOST ADMIN</Text>
        </View>
      </View>

      {/* Info */}
      <Card variant="raised" style={styles.infoCard} noPadding>
        <View style={infoStyles.row}>
          <View style={infoStyles.iconWrap}><Mail size={18} color={theme.colors.textMuted} /></View>
          <View>
            <Text style={infoStyles.label}>Email</Text>
            <Text style={infoStyles.value}>{user?.email || '—'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={infoStyles.row}>
          <View style={infoStyles.iconWrap}><Phone size={18} color={theme.colors.textMuted} /></View>
          <View>
            <Text style={infoStyles.label}>Phone</Text>
            <Text style={infoStyles.value}>{user?.phone || 'Not set'}</Text>
          </View>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {[
          { label: 'Edit Profile', icon: <User size={18} color={theme.colors.primary} />, onPress: () => navigation.navigate('EditProfile') },
          { label: 'Change Password', icon: <KeyRound size={18} color={theme.colors.primary} />, onPress: () => navigation.navigate('ChangePassword') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={actionStyles.row} onPress={item.onPress} activeOpacity={0.7}>
            <View style={actionStyles.iconWrap}>{item.icon}</View>
            <Text style={actionStyles.label}>{item.label}</Text>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Danger */}
      <View style={styles.dangerSection}>
        <Button title="Log Out" onPress={handleLogout} variant="secondary" size="md" style={styles.logoutBtn} />
        <TouchableOpacity onPress={handleDeactivateAccount} style={styles.deactivateBtn}>
          <Text style={styles.deactivateText}>Deactivate Account</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
};

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.m },
  iconWrap: { width: 40, height: 40, borderRadius: theme.borderRadius.m, backgroundColor: theme.colors.surfaceOverlay, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.m },
  label: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: 2 },
  value: { ...theme.typography.bodyMedium, color: theme.colors.text },
});

const actionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.m, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  iconWrap: { width: 36, height: 36, borderRadius: theme.borderRadius.m, backgroundColor: theme.colors.primarySubtle, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.m },
  label: { ...theme.typography.bodyMedium, color: theme.colors.text, flex: 1 },
});

const styles = StyleSheet.create({
  pageHeader: { paddingHorizontal: theme.spacing.base, paddingTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  pageTitle: { ...theme.typography.h1, color: theme.colors.text },
  avatarSection: { alignItems: 'center', marginBottom: theme.spacing.xl, paddingHorizontal: theme.spacing.base },
  avatarImage: { width: 96, height: 96, borderRadius: 48, marginBottom: theme.spacing.m, borderWidth: 2, borderColor: theme.colors.primary },
  avatarFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.colors.primarySubtle, borderWidth: 2, borderColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.m },
  avatarInitials: { ...theme.typography.h2, color: theme.colors.primary, fontWeight: '700' },
  userName: { ...theme.typography.h2, color: theme.colors.text, marginBottom: theme.spacing.s },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.primarySubtle, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.round },
  roleText: { ...theme.typography.overline, color: theme.colors.primaryLight },
  infoCard: { marginHorizontal: theme.spacing.base, marginBottom: theme.spacing.l, borderRadius: theme.borderRadius.l, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: theme.colors.border, marginHorizontal: theme.spacing.m },
  actionsSection: { marginHorizontal: theme.spacing.base, marginBottom: theme.spacing.xl },
  dangerSection: { marginHorizontal: theme.spacing.base, marginBottom: theme.spacing.xxl },
  logoutBtn: { marginBottom: theme.spacing.m },
  deactivateBtn: { alignItems: 'center', paddingVertical: theme.spacing.s },
  deactivateText: { ...theme.typography.caption, color: theme.colors.error },
});
