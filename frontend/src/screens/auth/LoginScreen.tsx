import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, Button, Input, GlassCard } from '../../components';
import { theme } from '../../constants/theme';
import apiClient from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { ArrowLeft } from 'lucide-react-native';

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
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user, data } = response.data;
      const resolvedUser = user || data?.user;

      if (!token || !resolvedUser) {
        throw new Error('Invalid login response from server');
      }

      await login(resolvedUser, token);
      
      // Navigation will be handled by RootNavigator automatically 
      // based on the updated auth state.
    } catch (error: any) {
      console.error('[AUTH][LOGIN] Request failed:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        request: {
          baseURL: error?.config?.baseURL,
          url: error?.config?.url,
          method: error?.config?.method,
        },
      });

      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'An error occurred';

      Alert.alert('Login Failed', backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access your account</Text>

            <GlassCard style={styles.card}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              
              <Input
                label="Password"
                placeholder="Enter your password"
                isPassword
                value={password}
                onChangeText={setPassword}
              />
              
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button 
                title="Sign In" 
                onPress={handleLogin} 
                isLoading={isLoading}
                style={styles.button}
              />
            </GlassCard>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.l,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xl,
  },
  forgotPasswordText: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
  },
  button: {
    marginTop: theme.spacing.s,
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
    color: theme.colors.primaryLight,
    fontWeight: 'bold',
  },
});
