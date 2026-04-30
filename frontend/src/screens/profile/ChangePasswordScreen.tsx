import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenContainer, Input, Button, NeonCard } from '../../components';
import { theme } from '../../constants/theme';
import { UserService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';

export const ChangePasswordScreen = () => {
  const navigation = useNavigation<any>();
  const login = useAuthStore((state) => state.login);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation', 'Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Password confirmation does not match.');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Validation', 'New password must be different from current password.');
      return;
    }

    try {
      setIsLoading(true);

      const response = await UserService.changePassword({
        currentPassword,
        newPassword,
      });

      const updatedUser = response?.data?.user;
      const token = response?.token;

      if (updatedUser && token) {
        await login(updatedUser, token);
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Success', 'Password updated successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Change Password</Text>
      </View>

      <NeonCard style={styles.card}>
        <Input
          label="Current Password"
          placeholder="Enter current password"
          isPassword
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />

        <Input
          label="New Password"
          placeholder="Enter new password"
          isPassword
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <Input
          label="Confirm New Password"
          placeholder="Re-enter new password"
          isPassword
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Button
          title="Update Password"
          onPress={handleChangePassword}
          isLoading={isLoading}
          style={styles.updateButton}
        />
      </NeonCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  card: {
    padding: theme.spacing.l,
  },
  updateButton: {
    marginTop: theme.spacing.l,
  },
});
