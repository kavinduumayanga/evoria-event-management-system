import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Key, Lock } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { getApiErrorMessage } from '../../utils/apiError';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>['route'];

interface Props {
  navigation: ResetPasswordScreenNavigationProp;
  route: ResetPasswordScreenRouteProp;
}

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const prefetchedEmail = route.params?.email;
  const [email, setEmail] = useState(prefetchedEmail || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    if (!token.trim()) {
      Alert.alert('Validation', 'Please enter the OTP code.');
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
      await AuthService.resetPassword({ email: email.trim().toLowerCase(), token: token.trim(), newPassword });
      Alert.alert('Success', 'Password reset complete. Please sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('Reset Failed', getApiErrorMessage(error, 'Unable to reset password.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <IconButton
              icon={<ArrowLeft color={theme.colors.text} size={22} />}
              onPress={() => navigation.goBack()}
              variant="surface"
              size={40}
            />
          </View>

          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.titleSection}>
                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.subtitle}>
                  Enter your email, OTP code, and choose a new password.
                </Text>
              </View>

              <Input
                label="Email address"
                placeholder="name@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                returnKeyType="done"
                blurOnSubmit
              />
              <Input
                label="OTP code"
                placeholder="Enter the 6-digit OTP"
                autoCapitalize="none"
                autoCorrect={false}
                value={token}
                onChangeText={setToken}
                leftIcon={<Key size={18} color={theme.colors.textMuted} />}
                returnKeyType="next"
                blurOnSubmit
                onSubmitEditing={() => newPasswordRef.current?.focus()}
              />
              <Input
                ref={newPasswordRef}
                label="New password"
                placeholder="At least 6 characters"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                value={newPassword}
                onChangeText={setNewPassword}
                leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
                returnKeyType="next"
                blurOnSubmit
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <Input
                ref={confirmPasswordRef}
                label="Confirm new password"
                placeholder="Re-enter your new password"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
                blurOnSubmit
              />
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.bottomZone}>
            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              isLoading={isLoading}
              variant="primary"
              size="lg"
            />
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.s,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.xl,
  },
  titleSection: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  prefillText: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.s,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
  },
});
