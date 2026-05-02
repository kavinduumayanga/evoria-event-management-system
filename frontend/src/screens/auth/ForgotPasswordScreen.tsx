import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, PrimaryButton, SecondaryButton, FormInput, GlassCard, IconButton } from '../../components';
import { theme } from '../../constants/theme';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthService } from '../../api/services';
import { getApiErrorMessage } from '../../utils/apiError';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();

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
      setDevResetToken(null);

      const response = await AuthService.forgotPassword({ email: normalizedEmail });
      const resetToken = response?.data?.resetToken as string | undefined;

      setMessage(response?.message || 'If your account exists, you can now reset your password.');
      if (resetToken) {
        setDevResetToken(resetToken);
      }

      Alert.alert('Success', 'Password reset request processed.');
    } catch (error: any) {
      Alert.alert('Request Failed', getApiErrorMessage(error, 'Unable to process forgot password request.'));
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
            variant="ghost" 
          />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Enter your email to generate a reset token.</Text>

            <GlassCard style={styles.card} variant="dark" animateEntrance>
              <FormInput
                label="Email Address"
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color={theme.colors.textMuted} />}
              />

              <PrimaryButton
                title="Generate Reset Token"
                onPress={handleForgotPassword}
                isLoading={isLoading}
                style={styles.button}
              />

              <SecondaryButton
                title="Go to Reset Password"
                onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() || undefined })}
                style={styles.secondaryButton}
              />
            </GlassCard>

            {message ? <Text style={styles.infoText}>{message}</Text> : null}

            {devResetToken ? (
              <GlassCard style={styles.tokenCard} variant="primary" animateEntrance>
                <Text style={styles.tokenLabel}>Development Reset Token</Text>
                <Text style={styles.tokenValue}>{devResetToken}</Text>
              </GlassCard>
            ) : null}
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
  content: {
    flexGrow: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xxxl,
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
    padding: theme.spacing.xl,
  },
  button: {
    marginTop: theme.spacing.s,
  },
  secondaryButton: {
    marginTop: theme.spacing.m,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.l,
    textAlign: 'center',
  },
  tokenCard: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
  },
  tokenLabel: {
    ...theme.typography.caption,
    color: theme.colors.primaryLight,
    fontWeight: '600',
    marginBottom: theme.spacing.s,
  },
  tokenValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
});
