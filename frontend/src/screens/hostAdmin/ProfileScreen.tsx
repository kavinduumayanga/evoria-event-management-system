import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenContainer, NeonCard, LoadingState, ErrorState, Button } from '../../components';
import { theme } from '../../constants/theme';
import { User, Mail, Phone, Shield, LogOut } from 'lucide-react-native';
import { UserService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';
import { resolveImageUrl } from '../../utils/imageUrl';

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

      if (currentUser) {
        await updateAuthUser(currentUser);
      }
    } catch (err: any) {
      setError(getApiErrorMessage(err, 'Failed to load profile'));
    } finally {
      setIsLoading(false);
    }
  }, [updateAuthUser]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchProfile();
    }, [fetchProfile])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      'Deactivate Account',
      'This will deactivate your account and sign you out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserService.deactivateAccount();
              await logout();
            } catch (err: any) {
              Alert.alert('Deactivation Failed', getApiErrorMessage(err, 'Unable to deactivate account.'));
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} onRetry={fetchProfile} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        {resolvedProfileImage ? (
          <Image source={{ uri: resolvedProfileImage }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <User size={40} color={theme.colors.primary} />
          </View>
        )}

        <Text style={styles.name}>{user?.name}</Text>

        <View style={styles.roleBadge}>
          <Shield size={12} color={theme.colors.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.roleText}>{(user?.role || 'host_admin').replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <NeonCard style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Mail size={20} color={theme.colors.textMuted} />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email || '-'}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Phone size={20} color={theme.colors.textMuted} />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{user?.phone || 'Not set'}</Text>
          </View>
        </View>
      </NeonCard>

      <Button
        title="Edit Profile"
        variant="outline"
        style={styles.actionButton}
        onPress={() => navigation.navigate('EditProfile')}
      />

      <Button
        title="Change Password"
        variant="outline"
        style={styles.actionButton}
        onPress={() => navigation.navigate('ChangePassword')}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={18} color={theme.colors.error} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deactivateButton} onPress={handleDeactivateAccount}>
        <Text style={styles.deactivateText}>Deactivate Account</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.m,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  roleText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    fontWeight: 'bold',
  },
  detailsCard: {
    marginBottom: theme.spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.m,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginTop: 2,
  },
  actionButton: {
    marginBottom: theme.spacing.m,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.error,
  },
  deactivateButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
  },
  deactivateText: {
    ...theme.typography.caption,
    color: theme.colors.error,
  },
});
