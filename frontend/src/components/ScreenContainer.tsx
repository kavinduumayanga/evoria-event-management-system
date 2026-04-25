import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from './GradientBackground';
import { theme } from '../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({ 
  children, 
  style, 
  scrollable = false 
}) => {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {scrollable ? (
          <ScrollView 
            contentContainerStyle={[styles.container, style]}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.container, style]}>
            {children}
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: theme.spacing.m,
  },
});
