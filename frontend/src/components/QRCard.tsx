import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Text } from 'react-native';
import { GlassCard } from './GlassCard';
import QRCode from 'react-native-qrcode-svg';

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
    <GlassCard variant="dark" style={[styles.container, style]}>
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
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  label: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});
