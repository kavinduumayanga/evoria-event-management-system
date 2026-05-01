import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import { GlassCard } from './GlassCard';
import QRCode from 'react-native-qrcode-svg';
import { theme } from '../constants/theme';

interface QRCardProps {
  value: string;
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const QRCard: React.FC<QRCardProps> = ({ 
  value, 
  size = 200, 
  label = 'Scan at entrance',
  style 
}) => {
  return (
    <GlassCard style={[styles.container, style]} variant="neonCyan" animateEntrance>
      <View style={styles.qrWrapper}>
        <View style={styles.qrContainer}>
          <QRCode
            value={value}
            size={size}
            color="#000000"
            backgroundColor="#FFFFFF"
          />
        </View>
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  qrWrapper: {
    padding: theme.spacing.m,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.l,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  qrContainer: {
    padding: theme.spacing.m,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.m,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.secondary,
    marginTop: theme.spacing.l,
    fontWeight: '600',
    letterSpacing: 1,
  }
});
