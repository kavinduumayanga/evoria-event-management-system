import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard, CalendarDays, QrCode, MoreHorizontal,
  MapPin, Users, Megaphone, Bell, ShieldAlert, X
} from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HostAdminTabParamList } from '../types/navigation';
import { CustomTabBar } from '../components/CustomTabBar';
import { theme } from '../constants/theme';

import { DashboardScreen } from '../screens/hostAdmin/DashboardScreen';
import { HostAdminEventStack } from './HostAdminEventStack';
import { HostAdminVenueStack } from './HostAdminVenueStack';
import { HostAdminProfileStack } from './HostAdminProfileStack';
import { ManageBookingsScreen } from '../screens/hostAdmin/ManageBookingsScreen';
import { CheckInScannerScreen } from '../screens/hostAdmin/CheckInScannerScreen';
import { AnnouncementScreen } from '../screens/hostAdmin/AnnouncementScreen';
import { NotificationsScreen } from '../screens/common/NotificationsScreen';
import { ModerationDashboardScreen } from '../screens/hostAdmin/ModerationDashboardScreen';

const Tab = createBottomTabNavigator<HostAdminTabParamList>();

// ============================================================
// MORE SHEET — Slide-up modal for secondary host nav items
// ============================================================
interface MoreSheetItem {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  items: MoreSheetItem[];
}

const MoreSheet: React.FC<MoreSheetProps> = ({ visible, onClose, items }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>More</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Items */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.sheetItem}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.sheetItemIcon}>{item.icon}</View>
                <Text style={styles.sheetItemLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ============================================================
// HOST NAVIGATOR — 4 main tabs + More sheet
// ============================================================
export const HostAdminNavigator = () => {
  const [moreVisible, setMoreVisible] = useState(false);

  // The navigator is defined at the component level to access navigation
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => {
          // Intercept "More" tab press
          const originalOnPress = props.navigation.navigate;
          return <CustomTabBar {...props} />;
        }}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="EventsStack"
          component={HostAdminEventStack}
          options={{
            tabBarLabel: 'Events',
            tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="CheckIns"
          component={CheckInScannerScreen}
          options={{
            tabBarLabel: 'Check-In',
            tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={HostAdminProfileStack}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <TouchableOpacity onPress={() => setMoreVisible(true)}>
                <MoreHorizontal color={color} size={size} />
              </TouchableOpacity>
            ),
          }}
        />
      </Tab.Navigator>

      {/* Secondary screens — still registered but accessible via MoreSheet */}
      {/* NOTE: VenuesStack, ManageBookings, Announcements, Notifications, Moderation
          are accessed via More sheet navigation using a root navigator ref or
          by embedding them as screens in the EventStack or separate modals. 
          For now, Profile tab icon opens the More sheet while the Profile screen
          remains accessible through the More sheet. */}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surfaceOverlay,
    borderTopLeftRadius: theme.borderRadius.xxl,
    borderTopRightRadius: theme.borderRadius.xxl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderStrong,
    paddingTop: 12,
    paddingHorizontal: theme.spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.borderStrong,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sheetItemIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.m,
  },
  sheetItemLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
});
