import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  withSafeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  style?: object;
  backgroundColor?: string;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  withSafeArea = true,
  edges = ['top'],
  style,
  backgroundColor = theme.colors.background,
}) => {
  const insets = useSafeAreaInsets();
  
  if (withSafeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
