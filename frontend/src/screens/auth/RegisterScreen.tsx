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
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, PrimaryButton, FormInput, GlassCard, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react-native';
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
    const normalizedEmail = email.trim().toLowerCase();

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
      
      const { token, data } = response;
      await login(data.user, token);
      
    } catch (error: any) {
      Alert.alert('Registration Failed', getApiErrorMessage(error, 'Unable to create account. Please try again.'));
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

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Evoria to start your journey</Text>

            <GlassCard style={styles.card} variant="dark" animateEntrance>
              <FormInput
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                leftIcon={<User size={20} color={theme.colors.textMuted} />}
              />

              <FormInput
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color={theme.colors.textMuted} />}
              />

              <FormInput
                label="Password"
                placeholder="Create a password"
                isPassword
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.textMuted} />}
              />

              <PrimaryButton
                title="Sign Up"
                onPress={handleRegister}
                isLoading={isLoading}
                style={styles.button}
              />
            </GlassCard>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    flexGrow: 1,
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
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.l,
  },
  button: {
    marginTop: theme.spacing.l,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  footerLink: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
