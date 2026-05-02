import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { Input, Button, IconButton } from '../../components';
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
      const response = await UserService.changePassword({ currentPassword, newPassword });
      const updatedUser = response?.data?.user;
      const token = response?.token;
      if (updatedUser && token) await login(updatedUser, token);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft color={theme.colors.text} size={22} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={40}
          />
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Current password"
              placeholder="Enter your current password"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
            />
            <Input
              label="New password"
              placeholder="At least 6 characters"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              value={newPassword}
              onChangeText={setNewPassword}
              leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
            />
            <Input
              label="Confirm new password"
              placeholder="Re-enter your new password"
              isPassword
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.bottomZone}>
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            isLoading={isLoading}
            variant="primary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.m,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.m,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
  },
});
