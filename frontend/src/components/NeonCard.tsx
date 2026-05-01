import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';

interface NeonCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accentColor?: string;
}

export const NeonCard: React.FC<NeonCardProps> = ({ 
  children, 
  style, 
  onPress,
  accentColor = theme.colors.primary 
}) => {
  const CardContent = (
    <View style={[styles.cardContainer, style]}>
      <View style={styles.blurContainer}>
        {children}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.premium,
  },
  blurContainer: {
    padding: theme.spacing.m,
  },
});
