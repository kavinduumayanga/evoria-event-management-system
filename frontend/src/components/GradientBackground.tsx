import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
