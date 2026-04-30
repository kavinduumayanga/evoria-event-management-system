import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HostAdminProfileStackParamList } from '../types/navigation';
import { ProfileScreen } from '../screens/hostAdmin/ProfileScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';

const Stack = createNativeStackNavigator<HostAdminProfileStackParamList>();

export const HostAdminProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
};
