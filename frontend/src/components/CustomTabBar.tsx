import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

// ============================================================
// FLOATING TAB BAR — Exact Luma replica
//
// Reference match:
//   - Floating pill bar pinned to bottom
//   - Active tab: purple filled pill, icon + label side by side
//   - Inactive tabs: icon only, muted color
//   - 4px internal padding
//   - Bar has subtle border + blur-like dark bg
// ============================================================

export const CustomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const handlePress = (index: number, routeName: string, isFocused: boolean) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.92,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View
      style={[
        styles.outer,
        { paddingBottom: Math.max(insets.bottom, 6) },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const icon = options.tabBarIcon
            ? options.tabBarIcon({
                focused: isFocused,
                color: isFocused ? '#FFFFFF' : theme.colors.tabBarInactive,
                size: 20,
              })
            : null;

          return (
            <Animated.View
              key={route.key}
              style={[
                styles.tabWrap,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.tab,
                  isFocused && styles.tabActive,
                ]}
                onPress={() => handlePress(index, route.name, isFocused)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={String(label)}
              >
                {icon}
                {isFocused && (
                  <Text style={styles.label} numberOfLines={1}>
                    {String(label)}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.tabBarBg,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 4,
    paddingVertical: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  tabWrap: {
    flex: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    gap: 6,
  },
  tabActive: {
    backgroundColor: theme.colors.tabBarActive,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
