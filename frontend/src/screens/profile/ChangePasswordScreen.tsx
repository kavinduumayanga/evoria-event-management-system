import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { ScreenContainer, FormInput, PrimaryButton, GlassCard, IconButton } from '../../components';
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
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <IconButton 
            icon={<ArrowLeft color={theme.colors.text} size={24} />} 
            onPress={() => navigation.goBack()} 
            variant="solid" 
          />
          <Text style={styles.title}>Change Password</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.card} variant="dark" animateEntrance>
            <FormInput
              label="Current Password"
              placeholder="Enter current password"
              isPassword
              value={currentPassword}
              onChangeText={setCurrentPassword}
              leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
            />

            <FormInput
              label="New Password"
              placeholder="Enter new password"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
              leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
            />

            <FormInput
              label="Confirm New Password"
              placeholder="Re-enter new password"
              isPassword
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
            />

            <PrimaryButton
              title="Update Password"
              onPress={handleChangePassword}
              isLoading={isLoading}
              style={styles.updateButton}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
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
