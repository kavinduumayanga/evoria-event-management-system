import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Platform, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const scaleAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const activeRouteOptions = descriptors[state.routes[state.index].key]?.options;
  const flattenedTabBarStyle = StyleSheet.flatten(activeRouteOptions?.tabBarStyle) as { display?: string } | undefined;
  
  if (flattenedTabBarStyle?.display === 'none') return null;

  const handlePress = (index: number, routeName: string, isFocused: boolean) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const event = navigation.emit({ type: 'tabPress', target: routeName, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(routeName);
  };

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 16) }]}>
      <LinearGradient
        colors={['rgba(60,60,60,0.85)', 'rgba(30,30,30,0.95)']}
        style={styles.pill}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
          // The reference has Home, Discover, Chat (we'll keep dynamic icons but map colors)
          const icon = options.tabBarIcon ? options.tabBarIcon({ 
            focused: isFocused, 
            color: isFocused ? '#FFF' : '#A3A3A3', 
            size: 20 
          }) : null;

          return (
            <Animated.View key={route.key} style={[styles.tabWrap, { transform: [{ scale: scaleAnims[index] }] }]}>
              <TouchableOpacity
                style={[styles.tab, isFocused && styles.tabActive]}
                onPress={() => handlePress(index, route.name, isFocused)}
                activeOpacity={0.7}
              >
                {icon}
                <Text style={[styles.label, isFocused && styles.labelActive]}>
                  {label as string}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...theme.shadows.premium,
    width: '100%',
    maxWidth: 320,
  },
  tabWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    width: '100%',
    gap: 4,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  label: {
    ...theme.typography.small,
    fontSize: 10,
    color: '#A3A3A3',
    fontWeight: '600',
  },
  labelActive: {
    color: '#FFF',
  },
});
