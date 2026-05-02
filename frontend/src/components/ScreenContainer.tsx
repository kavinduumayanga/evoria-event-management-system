import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

// ============================================================
// SCREEN CONTAINER — Base layout wrapper for all screens
//
// Provides:
//   - Safe area (top + bottom)
//   - Background color
//   - Optional scrollable mode
//   - Consistent horizontal inset (20dp)
//   - RefreshControl support
//
// Usage:
//   <ScreenContainer>...</ScreenContainer>
//   <ScreenContainer scrollable inset>...</ScreenContainer>
//   <ScreenContainer scrollable refreshing={...} onRefresh={...}>
// ============================================================

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  inset?: boolean;         // Apply standard 20dp horizontal inset
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollRef?: React.RefObject<ScrollView>;
  // Legacy props
  refreshControl?: React.ReactElement;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  inset = false,
  refreshing,
  onRefresh,
  scrollRef,
  refreshControl,
}) => {
  const inner = inset ? [styles.inset] : [];

  if (scrollable) {
    const refreshCtrl = refreshControl
      ?? (onRefresh
        ? <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        : undefined);

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, ...inner, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshCtrl}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top']}>
      <View style={[styles.flex, ...inner]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  inset: {
    paddingHorizontal: theme.spacing.base,
  },
});
