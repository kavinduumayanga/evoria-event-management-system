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
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Input, Button, IconButton, Card } from '../../components';
import { theme } from '../../constants/theme';
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
    } catch (error: any) {
      Alert.alert('Request Failed', getApiErrorMessage(error, 'Unable to process forgot password request.'));
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

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll generate a reset token for you.
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
            />

            {message && (
              <Text style={styles.infoText}>{message}</Text>
            )}

            {devResetToken && (
              <Card variant="primary" style={styles.tokenCard} animateEntrance>
                <Text style={styles.tokenLabel}>Development Reset Token</Text>
                <Text style={styles.tokenValue} selectable>{devResetToken}</Text>
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom CTAs */}
        <View style={styles.bottomZone}>
          <Button
            title="Generate Reset Token"
            onPress={handleForgotPassword}
            isLoading={isLoading}
            variant="primary"
            size="lg"
          />
          <Button
            title="Go to Reset Password"
            onPress={() => navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() || undefined })}
            variant="ghost"
            size="md"
          />
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
  tokenCard: {
    marginTop: theme.spacing.m,
  },
  tokenLabel: {
    ...theme.typography.label,
    color: theme.colors.primaryLight,
    fontWeight: '600',
    marginBottom: theme.spacing.s,
  },
  tokenValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
    gap: theme.spacing.sm,
  },
});
