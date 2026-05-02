import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
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

  const logoScale = useRef(new Animated.Value(0.85)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;

  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 9,
      }),
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [brandOpacity, logoScale]);

  const handleLogin = async () => {
    const normalizedEmail = safeLower(email.trim());

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
        colors={['#09060f', '#140f24', '#09060f']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
            <Animated.View style={[styles.brandSection, { opacity: brandOpacity }]}> 
              <Animated.View style={[styles.logoShell, { transform: [{ scale: logoScale }] }]}>
                <Image source={require('../../../assets/icon.png')} style={styles.logo} />
              </Animated.View>
              <Text style={styles.brand}>Evoria</Text>
              <Text style={styles.slogan}>Your event story starts here.</Text>
            </Animated.View>

            <Card variant="raised" style={styles.formCard} noPadding>
              <View style={styles.formInner}>
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
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>

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
    paddingBottom: theme.spacing.xl,
  },
  brandSection: {
    alignItems: 'center',
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },
  logoShell: {
    width: 130,
    height: 130,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    ...theme.shadows.glow,
  },
  logo: {
    width: 98,
    height: 98,
    borderRadius: 24,
  },
  brand: {
    marginTop: theme.spacing.m,
    ...theme.typography.h1,
    color: theme.colors.text,
    fontWeight: '800',
    letterSpacing: 1,
  },
  slogan: {
    marginTop: 4,
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  formCard: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
  },
  formInner: {
    padding: theme.spacing.m,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: theme.spacing.xs,
  },
  forgotText: {
    ...theme.typography.label,
    color: theme.colors.primary,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
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
