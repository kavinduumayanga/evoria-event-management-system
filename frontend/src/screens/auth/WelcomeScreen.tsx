import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components';
import { theme } from '../../constants/theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Ambient orb pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(orb2Anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#111111', '#1A1714', '#111111']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient orbs */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            opacity: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] }),
            transform: [{ scale: orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            opacity: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
            transform: [{ scale: orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }],
          },
        ]}
      />

      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Hero Zone */}
        <Animated.View
          style={[
            styles.heroZone,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Wordmark */}
          <View style={styles.wordmarkContainer}>
            <Text style={styles.wordmark}>EVORIA</Text>
            <View style={styles.wordmarkBar} />
          </View>

          {/* Tagline */}
          <Text style={styles.tagline}>The platform for experiences{'\n'}worth remembering.</Text>
        </Animated.View>

        {/* Social Proof */}
        <Animated.View style={[styles.proofZone, { opacity: fadeAnim }]}>
          <Text style={styles.proof}>Trusted by event creators worldwide</Text>
        </Animated.View>

        {/* Action Zone */}
        <Animated.View
          style={[
            styles.actionZone,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            variant="primary"
            size="lg"
          />
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="ghost"
            size="lg"
            style={styles.signInBtn}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: theme.colors.primary,
    top: height * 0.05,
    left: -width * 0.2,
    opacity: 0.4,
  },
  orb2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: theme.colors.accent,
    bottom: height * 0.1,
    right: -width * 0.2,
    opacity: 0.2,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
    justifyContent: 'space-between',
  },

  // Hero
  heroZone: {
    flex: 3,
    justifyContent: 'center',
    paddingTop: theme.spacing.xxl,
  },
  wordmarkContainer: {
    marginBottom: theme.spacing.l,
  },
  wordmark: {
    ...theme.typography.display,
    color: theme.colors.text,
    letterSpacing: 6,
    fontWeight: '800',
  },
  wordmarkBar: {
    marginTop: 8,
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  tagline: {
    ...theme.typography.h2,
    color: theme.colors.textSecondary,
    lineHeight: 34,
  },

  // Proof
  proofZone: {
    flex: 1,
    justifyContent: 'center',
  },
  proof: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },

  // Actions
  actionZone: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  signInBtn: {
    marginTop: 4,
  },
});
