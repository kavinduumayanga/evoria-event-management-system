import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { GradientBackground, PrimaryButton, SecondaryButton } from '../../components';
import { theme } from '../../constants/theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(logoAnim, {
      toValue: 1,
      tension: 10,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [logoAnim]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Animated.View 
              style={[
                styles.logoPlaceholder,
                {
                  opacity: logoAnim,
                  transform: [{ scale: logoAnim }]
                }
              ]}
            >
              <Text style={styles.logoText}>EVORIA</Text>
            </Animated.View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>Discover Premium Events</Text>
            <Text style={styles.subtitle}>
              Book tickets, manage your events, and experience the neon nightlife like never before.
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <PrimaryButton 
              title="Sign In" 
              onPress={() => navigation.navigate('Login')}
              style={styles.button}
            />
            <SecondaryButton 
              title="Create an Account" 
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
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: theme.borderRadius.round,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neonPurple,
  },
  logoText: {
    ...theme.typography.h2,
    color: theme.colors.text,
    letterSpacing: 6,
    fontWeight: '800',
    textShadowColor: theme.colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
