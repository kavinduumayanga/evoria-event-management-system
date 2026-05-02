import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Lock, Mail } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Button, Card, IconButton, Input } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { safeLower } from '../../utils/safeText';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    const normalizedEmail = safeLower(email.trim());
    if (!normalizedEmail || !password) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await AuthService.login({ email: normalizedEmail, password });
      const { token, user, data } = response;
      const resolvedUser = user || data?.user;
      if (!token || !resolvedUser) throw new Error('Invalid login response');
      await login(resolvedUser, token);
    } catch (error: any) {
      Alert.alert('Login Failed', getApiErrorMessage(error, 'Unable to sign in. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon={<ArrowLeft color={theme.colors.text} size={24} />} onPress={() => navigation.goBack()} variant="surface" size={48} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.titleZone}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Evoria account to continue your event journey.</Text>
          </View>

          <Card variant="outline" noPadding style={styles.formCard}>
            <View style={styles.formInner}>
              <Input
                label="Email Address"
                placeholder="hello@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color={theme.colors.primary} />}
              />
              <Input
                label="Password"
                placeholder="••••••••"
                isPassword
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.primary} />}
                containerStyle={styles.noMarginBottom}
              />
              <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Sign In" onPress={handleLogin} isLoading={isLoading} size="lg" />
        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>New to Evoria?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.signUpLink}> Create an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.m, paddingBottom: theme.spacing.s },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  titleZone: { marginTop: theme.spacing.xxl, marginBottom: theme.spacing.xxl },
  greeting: { ...theme.typography.display, color: theme.colors.text, marginBottom: theme.spacing.s },
  subtitle: { ...theme.typography.body, color: theme.colors.textSecondary, lineHeight: 24 },
  formCard: { backgroundColor: '#FFF', borderRadius: theme.borderRadius.xl, borderWidth: 1, borderColor: theme.colors.border },
  formInner: { padding: theme.spacing.xl },
  noMarginBottom: { marginBottom: 0 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: theme.spacing.m },
  forgotText: { ...theme.typography.label, color: theme.colors.primary },
  footer: { paddingHorizontal: theme.spacing.xl, paddingBottom: theme.spacing.xl, paddingTop: theme.spacing.l, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: theme.spacing.l },
  signUpText: { ...theme.typography.body, color: theme.colors.textSecondary },
  signUpLink: { ...theme.typography.bodyMedium, color: theme.colors.primary },
});
