import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps, StyleProp } from 'react-native';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  variant?: 'dark' | 'light';
  animateEntrance?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ style, children, variant = 'dark', ...rest }) => {
  const isDark = variant === 'dark';
  
  return (
    <View style={[styles.container, style]} {...rest}>
      <LinearGradient
        colors={isDark ? ['rgba(60,60,60,0.6)', 'rgba(30,30,30,0.8)'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
        style={styles.gradient}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
