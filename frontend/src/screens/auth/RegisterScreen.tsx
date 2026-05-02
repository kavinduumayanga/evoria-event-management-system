import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { safeLower } from '../../utils/safeText';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleRegister = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = safeLower(email.trim());

    if (!normalizedName || !normalizedEmail || !password) {
      Alert.alert('Validation', 'Please fill in all required fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.register({
        name: normalizedName,
        email: normalizedEmail,
        password,
      });

      const { token, user, data } = response;
      const resolvedUser = user || data?.user;

      if (!token || !resolvedUser) {
        throw new Error('Invalid registration response from server');
      }

      await login(resolvedUser, token);
    } catch (error: any) {
      Alert.alert('Registration Failed', getApiErrorMessage(error, 'Unable to create account. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#111111', '#1A1714', '#111111']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft color={theme.colors.text} size={22} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={40}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <View style={styles.titleSection}>
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Join thousands of event creators</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Full name"
                placeholder="Your name"
                autoCapitalize="words"
                autoCorrect={false}
                value={name}
                onChangeText={setName}
                leftIcon={<User size={18} color={theme.colors.textMuted} />}
              />
              <Input
                label="Email address"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={18} color={theme.colors.textMuted} />}
              />
              <Input
                label="Password"
                placeholder="At least 6 characters"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
                hint="Minimum 6 characters"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky bottom CTA */}
        <View style={styles.bottomZone}>
          <Button
            title="Create Account"
            onPress={handleRegister}
            isLoading={isLoading}
            variant="primary"
            size="lg"
          />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
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
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  form: {},
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.m,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  footerLink: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
  },
});
