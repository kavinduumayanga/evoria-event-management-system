import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({ children, style }) => {
  return (
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
