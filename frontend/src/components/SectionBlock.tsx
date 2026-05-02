import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface SectionBlockProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  rightAction?: React.ReactNode;
  noPadding?: boolean;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
  title,
  children,
  style,
  rightAction,
  noPadding = false,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, noPadding ? {} : styles.paddingHorizontal]}>
        <Text style={styles.title}>{title}</Text>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
      <View style={noPadding ? {} : styles.paddingHorizontal}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paddingHorizontal: {
    paddingHorizontal: 20,
  },
});
