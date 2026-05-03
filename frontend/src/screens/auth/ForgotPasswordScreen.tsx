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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Key, Lock, Mail } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { safeLower } from '../../utils/safeText';
import { getApiErrorMessage } from '../../utils/apiError';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResetFlowStep = 'email' | 'otp' | 'reset';

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const otpRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<ResetFlowStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const normalizedEmail = safeLower(email.trim());

  const handleSendOtp = async () => {
    Keyboard.dismiss();

    if (!normalizedEmail) {
      Alert.alert('Validation', 'Please enter your email address.');
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.forgotPassword({ email: normalizedEmail });
      setInfoMessage(response?.message || 'If your account exists, an OTP was sent.');
      setStep('otp');
      setTimeout(() => otpRef.current?.focus(), 120);
    } catch (error: any) {
      Alert.alert('Request Failed', getApiErrorMessage(error, 'Unable to process forgot password request.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    Keyboard.dismiss();

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }

    if (!otp.trim()) {
      Alert.alert('Validation', 'Please enter the OTP code.');
      return;
    }

    try {
      setIsLoading(true);
      await AuthService.verifyResetOtp({ email: normalizedEmail, token: otp.trim() });
      setStep('reset');
      setInfoMessage('OTP verified. Set your new password.');
      setTimeout(() => newPasswordRef.current?.focus(), 120);
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Unable to verify OTP.');
      Alert.alert('Verification Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    if (!otp.trim()) {
      Alert.alert('Validation', 'OTP is required.');
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
      await AuthService.resetPassword({ email: normalizedEmail, token: otp.trim(), newPassword });
      Alert.alert('Success', 'Password reset complete. Please sign in with your new password.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Unable to reset password.');
      Alert.alert('Reset Failed', message);
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
                <Text style={styles.title}>Forgot password?</Text>
                <Text style={styles.subtitle}>
                  {step === 'email'
                    ? 'Enter your email address and we\'ll send you an OTP code.'
                    : step === 'otp'
                      ? 'Enter the OTP from your email to continue.'
                      : 'Set your new password to complete reset.'}
                </Text>
              </View>

              <Input
                label="Email address"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={18} color={theme.colors.textMuted} />}
                editable={step === 'email'}
                returnKeyType="done"
                blurOnSubmit
              />

              {step !== 'email' ? (
                <Input
                  ref={otpRef}
                  label="OTP code"
                  placeholder="Enter the 6-digit OTP"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={otp}
                  onChangeText={setOtp}
                  leftIcon={<Key size={18} color={theme.colors.textMuted} />}
                  returnKeyType={step === 'otp' ? 'done' : 'next'}
                  blurOnSubmit
                  onSubmitEditing={step === 'otp' ? undefined : () => newPasswordRef.current?.focus()}
                />
              ) : null}

              {step === 'reset' ? (
                <>
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
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
                    returnKeyType="done"
                    blurOnSubmit
                  />
                </>
              ) : null}

              {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.bottomZone}>
            {step === 'email' ? (
              <Button
                title="Send OTP Code"
                onPress={handleSendOtp}
                isLoading={isLoading}
                variant="primary"
                size="lg"
                style={{ marginBottom: Math.max(insets.bottom, 16) + 12 }}
              />
            ) : step === 'otp' ? (
              <View style={styles.stepActions}>
                <Button
                  title="Verify OTP"
                  onPress={handleVerifyOtp}
                  isLoading={isLoading}
                  variant="primary"
                  size="lg"
                  style={styles.stepActionButton}
                />
                <Button
                  title="Resend OTP"
                  onPress={handleSendOtp}
                  variant="ghost"
                  size="md"
                  style={{ marginBottom: Math.max(insets.bottom, 16) + 12 }}
                />
              </View>
            ) : (
              <Button
                title="Reset Password"
                onPress={handleResetPassword}
                isLoading={isLoading}
                variant="primary"
                size="lg"
                style={{ marginBottom: Math.max(insets.bottom, 16) + 12 }}
              />
            )}
          </View>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.m,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.sm,
  },
  stepActions: {
    gap: theme.spacing.s,
  },
  stepActionButton: {
    marginBottom: theme.spacing.xs,
  },
});
