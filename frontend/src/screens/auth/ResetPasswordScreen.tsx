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
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, PrimaryButton, FormInput, GlassCard, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { ArrowLeft, Key, Lock } from 'lucide-react-native';
import { AuthService } from '../../api/services';
import { getApiErrorMessage } from '../../utils/apiError';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>['route'];

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
}

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const prefetchedEmail = route.params?.email;

  const handleResetPassword = async () => {
    if (!token.trim()) {
      Alert.alert('Validation', 'Please enter the reset token.');
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

    try {
      setIsLoading(true);

      await AuthService.resetPassword({
        token: token.trim(),
        newPassword,
      });

      Alert.alert('Success', 'Password reset complete. Please sign in with your new password.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Reset Failed', getApiErrorMessage(error, 'Unable to reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton 
            icon={<ArrowLeft color={theme.colors.text} size={24} />} 
            onPress={() => navigation.goBack()} 
            variant="solid" 
          />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Use your reset token to set a new password.</Text>

            {prefetchedEmail ? <Text style={styles.prefillText}>Email: {prefetchedEmail}</Text> : null}

            <GlassCard style={styles.card} variant="dark" animateEntrance>
              <FormInput
                label="Reset Token"
                placeholder="Paste the reset token"
                autoCapitalize="none"
                value={token}
                onChangeText={setToken}
                leftIcon={<Key size={20} color={theme.colors.textMuted} />}
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
                title="Reset Password"
                onPress={handleResetPassword}
                isLoading={isLoading}
                style={styles.button}
              />
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    alignItems: 'flex-start',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.m,
  },
  prefillText: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.l,
  },
  card: {
    padding: theme.spacing.l,
  },
  button: {
    marginTop: theme.spacing.s,
  },
});
