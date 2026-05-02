import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';
import { Button } from '../../components';
import { theme } from '../../constants/theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 460,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentY, logoScale]);

  return (
    <View style={styles.root}>
      

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.centerContent,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentY }],
            },
          ]}
        >
          <Animated.View style={[styles.logoShell, { transform: [{ scale: logoScale }] }]}>
            <Image source={require('../../../assets/icon.png')} style={styles.logo} />
          </Animated.View>

          <Text style={styles.brand}>Evoria</Text>
          <Text style={styles.slogan}>Plan. Host. Celebrate.{`\n`}Everything in one place.</Text>
        </Animated.View>

        <View style={styles.actions}>
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
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.base,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoShell: {
    width: 210,
    height: 210,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    ...theme.shadows.glow,
  },
  logo: {
    width: 158,
    height: 158,
    borderRadius: 36,
  },
  brand: {
    marginTop: theme.spacing.xl,
    ...theme.typography.display,
    color: theme.colors.text,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  slogan: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  actions: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(139,92,246,0.25)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -110,
    right: -90,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99,102,241,0.18)',
  },
});
