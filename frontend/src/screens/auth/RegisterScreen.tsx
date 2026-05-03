import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Keyboard, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, User, Mail, Lock } from 'lucide-react-native';
import { AuthStackParamList } from '../../types/navigation';
import { Button, Card, IconButton, Input } from '../../components';
import { theme } from '../../constants/theme';
import { AuthService } from '../../api/services';
import { safeLower } from '../../utils/safeText';
import { useAuthStore } from '../../store/auth.store';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;
interface Props { navigation: RegisterScreenNavigationProp; }

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const strictEmailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  const handleRegister = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedEmail = safeLower(email.trim());
    if (!trimmedName || !trimmedEmail || !password) return Alert.alert('Validation', 'Please fill all fields.');
    if (!strictEmailRegex.test(trimmedEmail)) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    try {
      setIsLoading(true);
      const res = await AuthService.register({ name: trimmedName, email: trimmedEmail, password });
      if (res.token && (res.user || res.data?.user)) {
        await login(res.user || res.data?.user, res.token);
      }
    } catch (e: any) {
      Alert.alert('Registration Failed', e.response?.data?.message || 'Error occurred.');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.titleZone}>
            <Text style={styles.greeting}>Create Account</Text>
            <Text style={styles.subtitle}>Join Evoria to discover and manage premium events.</Text>
          </View>
          <Card variant="outline" noPadding style={styles.formCard}>
            <View style={styles.formInner}>
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                leftIcon={<User size={20} color={theme.colors.primary} />}
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Input
                ref={emailRef}
                label="Email Address"
                placeholder="hello@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                leftIcon={<Mail size={20} color={theme.colors.primary} />}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <Input
                ref={passwordRef}
                label="Password"
                placeholder="Create a strong password"
                isPassword
                value={password}
                onChangeText={setPassword}
                leftIcon={<Lock size={20} color={theme.colors.primary} />}
                containerStyle={styles.noMarginBottom}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Button title="Create Account" onPress={handleRegister} isLoading={isLoading} size="lg" />
        <View style={styles.signUpRow}>
          <Text style={styles.signUpText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signUpLink}> Sign in</Text>
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
  formCard: {},
  formInner: { padding: 24 },
  noMarginBottom: { marginBottom: 0 },
  footer: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signUpText: { color: '#A3A3A3', fontSize: 16 },
  signUpLink: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
