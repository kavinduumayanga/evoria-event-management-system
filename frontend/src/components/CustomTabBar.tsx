import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const activeRouteOptions = descriptors[state.routes[state.index].key]?.options;
  const flattenedTabBarStyle = StyleSheet.flatten(activeRouteOptions?.tabBarStyle) as { display?: string } | undefined;
  
  if (flattenedTabBarStyle?.display === 'none') return null;

  const handlePress = (index: number, routeName: string, isFocused: boolean) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const event = navigation.emit({ type: 'tabPress', target: routeName, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          const icon = options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color: isFocused ? theme.colors.primary : theme.colors.tabBarInactive, size: 24 }) : null;

          return (
            <Animated.View key={route.key} style={[styles.tabWrap, { transform: [{ scale: scaleAnims[index] }] }]}>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handlePress(index, route.name, isFocused)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                  {icon}
                </View>
                {isFocused && <View style={styles.activeDot} />}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.tabBarBg,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...theme.shadows.lg,
  },
  bar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  tabWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconWrap: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primarySubtle,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: -2,
  },
});
