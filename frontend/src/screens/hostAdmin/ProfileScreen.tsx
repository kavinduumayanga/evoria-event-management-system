import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer, NeonCard, LoadingState, ErrorState, Button } from '../../components';
import { theme } from '../../constants/theme';
import { User, Mail, Shield, LogOut } from 'lucide-react-native';
import { UserService } from '../../api/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      setError(null);
      const res = await UserService.getMe();
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Logout', 
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('auth_token');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            })
          );
        }
      }
    ]);
  };

  if (isLoading) return <LoadingState />;
  if (error) return <ScreenContainer><ErrorState message={error} onRetry={fetchProfile} /></ScreenContainer>;

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <User size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <View style={styles.roleBadge}>
          <Shield size={12} color={theme.colors.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.roleText}>{user?.role?.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <NeonCard style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Mail size={20} color={theme.colors.textMuted} />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{user?.email}</Text>
          </View>
        </View>
      </NeonCard>

      <Button 
        title="Edit Profile" 
        variant="outline" 
        style={styles.editButton}
        onPress={() => Alert.alert('Coming Soon', 'Edit profile feature is under construction.')}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out</Text>
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
  avatar: {
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
  editButton: {
    marginBottom: theme.spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.m,
    backgroundColor: 'rgba(255, 59, 48, 0.1)', // error color with opacity
    borderRadius: theme.borderRadius.m,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.error,
  },
});
