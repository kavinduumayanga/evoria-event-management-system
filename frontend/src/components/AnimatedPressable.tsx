import React, { useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import { theme } from '../constants/theme';

// ============================================================
// ANIMATED PRESSABLE — Scale-on-press wrapper
// ============================================================

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  scaleTo = 0.97,
  style,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: scaleTo,
      duration: 70,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 140,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================
// ICON BUTTON — Luma-style circular translucent icon button
// ============================================================
type IconButtonVariant = 'ghost' | 'surface' | 'primary' | 'glass';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  variant = 'ghost',
  size = 40,
  style,
  disabled = false,
}) => {
  const bgMap: Record<IconButtonVariant, string> = {
    ghost: 'transparent',
    surface: 'rgba(30,27,24,0.75)',
    primary: theme.colors.primarySubtle,
    glass: 'rgba(30,27,24,0.60)',
  };

  const borderMap: Record<IconButtonVariant, string> = {
    ghost: 'transparent',
    surface: 'rgba(255,255,255,0.10)',
    primary: 'rgba(201,168,76,0.20)',
    glass: 'rgba(255,255,255,0.12)',
  };

  return (
    <AnimatedPressable onPress={onPress} disabled={disabled} scaleTo={0.90} style={style}>
      <TouchableOpacity
        style={[
          styles.iconBtn,
          {
            width: size,
            height: size,
            backgroundColor: bgMap[variant],
            borderColor: borderMap[variant],
            borderWidth: variant !== 'ghost' ? 1 : 0,
          },
        ]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {icon}
      </TouchableOpacity>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  iconBtn: {
    borderRadius: theme.borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
