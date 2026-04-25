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
    <View style={[styles.cardContainer, style, { shadowColor: accentColor }]}>
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
    backgroundColor: 'rgba(20, 20, 30, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  blurContainer: {
    padding: theme.spacing.m,
  },
});
