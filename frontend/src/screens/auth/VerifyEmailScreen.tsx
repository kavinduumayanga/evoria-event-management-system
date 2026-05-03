import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Key, Mail } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeEmail, validateAccountEmail } from '../../utils/emailValidation';
import { goBackOrFallback } from '../../utils/navigationBack';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialEmail = route.params?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValidation = validateAccountEmail(email);
  const emailError = emailTouched && !emailValidation.isValid ? emailValidation.message : undefined;

  const handleVerifyEmail = async () => {
    Keyboard.dismiss();

    const normalizedEmail = normalizeEmail(email);
    const validation = validateAccountEmail(normalizedEmail);
    if (!validation.isValid) {
      setEmailTouched(true);
      Alert.alert('Validation', validation.message || 'Please enter a valid email address.');
      return;
    }

    if (!otp.trim()) {
      Alert.alert('Validation', 'Please enter the OTP code from your email.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.verifyEmail({ email: normalizedEmail, otp: otp.trim() });
      Alert.alert('Success', response?.message || 'Email verified successfully. You can now sign in.', [
        { text: 'Go to Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', getApiErrorMessage(error, 'Unable to verify email OTP.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    Keyboard.dismiss();

    const normalizedEmail = normalizeEmail(email);
    const validation = validateAccountEmail(normalizedEmail);
    if (!validation.isValid) {
      setEmailTouched(true);
      Alert.alert('Validation', validation.message || 'Please enter a valid email address.');
      return;
    }

    try {
      setIsResending(true);
      const response = await AuthService.resendVerification({ email: normalizedEmail });
      Alert.alert('Verification OTP', response?.message || 'If your account needs verification, a new OTP has been sent.');
    } catch (error: any) {
      Alert.alert('Resend Failed', getApiErrorMessage(error, 'Unable to resend OTP right now.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft color={theme.colors.text} size={24} />}
          onPress={() => goBackOrFallback(navigation as any, { name: 'Login' })}
          variant="surface"
          size={48}
        />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.titleZone}>
            <Text style={styles.greeting}>Verify Email</Text>
            <Text style={styles.subtitle}>Enter the OTP sent to your email address to activate your account.</Text>
          </View>

          <Input
            label="Email Address"
            placeholder="hello@yourdomain.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (!emailTouched) setEmailTouched(true);
            }}
            onBlur={() => setEmailTouched(true)}
            error={emailError}
            leftIcon={<Mail size={20} color={theme.colors.primary} />}
          />

          <Input
            label="Verification OTP"
            placeholder="Enter OTP"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
            leftIcon={<Key size={20} color={theme.colors.primary} />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Verify Email" onPress={handleVerifyEmail} isLoading={isLoading} size="lg" />
        <Button
          title={isResending ? 'Resending OTP...' : 'Resend OTP'}
          onPress={handleResendOtp}
          disabled={isResending}
          variant="ghost"
          size="md"
          style={styles.resendButton}
        />
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.m, paddingBottom: theme.spacing.s },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  titleZone: { marginTop: theme.spacing.xxl, marginBottom: theme.spacing.xl },
  greeting: { ...theme.typography.display, color: theme.colors.text, marginBottom: theme.spacing.s },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 24 },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  resendButton: { marginTop: 12 },
  loginLink: { color: '#FFFFFF', textAlign: 'center', marginTop: 18, fontWeight: '600' },
});
