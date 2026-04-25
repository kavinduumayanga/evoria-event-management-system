import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, Button } from '../../components';
import { theme } from '../../constants/theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>EVORIA</Text>
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Discover Premium Events</Text>
            <Text style={styles.subtitle}>
              Book tickets, manage your events, and experience the neon nightlife like never before.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Sign In" 
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            />
            <Button 
              title="Create an Account" 
              variant="outline"
              onPress={() => navigation.navigate('Register')}
              style={styles.button}
            />
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neon,
  },
  logoText: {
    ...theme.typography.h2,
    color: theme.colors.primaryLight,
    letterSpacing: 4,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.m,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});
