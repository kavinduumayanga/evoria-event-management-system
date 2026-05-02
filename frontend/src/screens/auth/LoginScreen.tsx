import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
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
  const logoScale = useRef(new Animated.Value(0.84)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 15,
        bounciness: 8,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale]);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert('Validation', 'Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await AuthService.login({
        email: normalizedEmail,
        password,
      });

      const { token, user, data } = response;
      const resolvedUser = user || data?.user;

      if (!token || !resolvedUser) {
        throw new Error('Invalid login response from server');
      }

      await login(resolvedUser, token);
    } catch (error: any) {
      Alert.alert('Login Failed', getApiErrorMessage(error, 'Unable to sign in. Please try again.'));
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
              <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image source={require('../../../assets/icon.png')} style={styles.logo} />
              </Animated.View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
                placeholder="Enter your password"
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={18} color={theme.colors.textMuted} />}
              />
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky bottom CTA */}
        <View style={styles.bottomZone}>
          <Button
            title="Sign In"
            onPress={handleLogin}
            isLoading={isLoading}
            variant="primary"
            size="lg"
          />
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign up</Text>
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
  logoWrap: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
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
  form: {
    // No wrapper card — inputs float on the background
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.s,
  },
  forgotText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
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
