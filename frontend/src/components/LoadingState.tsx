import React from 'react';
import { View, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface LoadingStateProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  style, 
  color = theme.colors.primary 
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={color} />
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
});
