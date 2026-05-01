import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native';
import { theme } from '../constants/theme';

interface LoadingStateProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  size?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  style, 
  color = theme.colors.primary,
  size = 40
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, style]}>
      <Animated.View 
        style={[
          styles.circle, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2, 
            backgroundColor: color,
            opacity: pulseAnim,
            transform: [{ scale: pulseAnim }]
          },
          theme.shadows.neonPurple
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  circle: {
    shadowColor: theme.colors.primary,
  }
});
