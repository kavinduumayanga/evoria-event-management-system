import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { HeaderBar, PrimaryButton, InputField, GlassCard } from '../../components';
import { AuthService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeEmail, validateAccountEmail } from '../../utils/emailValidation';
import { Mail, Lock } from 'lucide-react-native';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props { navigation: LoginScreenNavigationProp; }

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleResendVerification = async (normalizedEmail: string) => {
    try {
      const response = await AuthService.resendVerification({ email: normalizedEmail });
      Alert.alert('Verification OTP', response?.message || 'If your account needs verification, a new OTP has been sent.', [
        {
          text: 'Verify Now',
          onPress: () => navigation.navigate('VerifyEmail', { email: normalizedEmail }),
        },
        {
          text: 'Close',
          style: 'cancel',
        },
      ]);
    } catch (error: any) {
      Alert.alert('Resend Failed', getApiErrorMessage(error, 'Unable to resend verification OTP right now.'));
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    const normalized = normalizeEmail(email);
    if (!normalized || !password) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }

    const emailValidation = validateAccountEmail(normalized);
    if (!emailValidation.isValid) {
      Alert.alert('Validation', emailValidation.message || 'Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.login({ email: normalized, password });
      const { token, user, data } = response;
      const resolvedUser = user || data?.user;
      if (!token || !resolvedUser) throw new Error('Invalid login response');
      await login(resolvedUser, token);
    } catch (error: any) {
      const message = getApiErrorMessage(error, 'Unable to sign in. Please try again.');
      const loweredMessage = message.toLowerCase();

      if (loweredMessage.includes('verify your email')) {
        Alert.alert('Email Verification Required', message, [
          {
            text: 'Resend OTP',
            onPress: () => {
              handleResendVerification(normalized).catch(() => undefined);
            },
          },
          {
            text: 'Verify Now',
            onPress: () => navigation.navigate('VerifyEmail', { email: normalized }),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]);
      } else {
        Alert.alert('Login Failed', message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <HeaderBar variant="back" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.titleZone}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Evoria account to continue your event journey.</Text>
          </View>

          <GlassCard variant="dark" style={styles.formCard}>
            <InputField
              label="Email Address"
              placeholder="hello@yourdomain.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={20} color="#FFFFFF" />}
              returnKeyType="next"
            />
            <InputField
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={20} color="#FFFFFF" />}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <PrimaryButton title="Sign In" onPress={handleLogin} isLoading={isLoading} />
        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>New to Evoria?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpLink}> Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  titleZone: { marginTop: 40, marginBottom: 40 },
  greeting: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 12 },
  subtitle: { color: '#A3A3A3', fontSize: 16, lineHeight: 24 },
  formCard: { padding: 24 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8 },
  forgotText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signUpText: { color: '#A3A3A3', fontSize: 16 },
  signUpLink: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
