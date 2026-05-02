import React from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  withSafeArea?: boolean;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  style?: object;
  backgroundColor?: string;
  scrollable?: boolean;
  contentContainerStyle?: object;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  withSafeArea = true,
  edges = ['top'],
  style,
  backgroundColor = theme.colors.background,
  scrollable = false,
  contentContainerStyle,
  refreshing,
  onRefresh,
}) => {
  const insets = useSafeAreaInsets();
  
  if (withSafeArea) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
        {children}
      </SafeAreaView>
    );
  }

  const Container = scrollable ? require('react-native').ScrollView : View;
  
  const refreshControl = scrollable && onRefresh ? (
    <RefreshControl refreshing={refreshing || false} onRefresh={onRefresh} />
  ) : undefined;

  return (
    <Container 
      style={[styles.container, { backgroundColor, paddingTop: insets.top }, style]}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
    >
      {children}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
