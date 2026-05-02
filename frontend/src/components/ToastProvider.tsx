import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView } from 'react-native';
import { useToastStore, ToastMessage } from '../store/toast.store';
import { theme } from '../constants/theme';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react-native';

const ToastItem = ({ toast }: { toast: ToastMessage }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // The unmount animation isn't easily done here because the item just gets removed
    // from the store immediately. For a more advanced system, we'd add an "isLeaving" state.
    // For this pass, instant removal is fine as it fades out fast.
  }, [opacity, translateY]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={20} color={theme.colors.success} />;
      case 'error':
        return <AlertCircle size={20} color={theme.colors.error} />;
      case 'warning':
        return <AlertTriangle size={20} color={theme.colors.warning} />;
      case 'info':
      default:
        return <Info size={20} color={theme.colors.primaryLight} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
      default:
        return theme.colors.primaryLight;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity,
          transform: [{ translateY }],
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{toast.title}</Text>
        {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
      </View>
    </Animated.View>
  );
};

export const ToastProvider = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <SafeAreaView style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.inner} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  inner: {
    padding: theme.spacing.m,
    gap: theme.spacing.s,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    borderLeftWidth: 4,
    ...theme.shadows.md,
  },
  iconContainer: {
    marginRight: theme.spacing.m,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
