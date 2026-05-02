import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, User, Phone, Image as ImageIcon } from 'lucide-react-native';
import { Input, Button, IconButton, LoadingState } from '../../components';
import { theme } from '../../constants/theme';
import { UserService } from '../../api/services';
import { useAuthStore } from '../../store/auth.store';
import { getApiErrorMessage } from '../../utils/apiError';

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

export const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const authUser = useAuthStore((state) => state.user);
  const updateAuthUser = useAuthStore((state) => state.updateUser);

  const [name, setName] = useState(authUser?.name || '');
  const [phone, setPhone] = useState(authUser?.phone || '');
  const [profileImage, setProfileImage] = useState(authUser?.profileImage || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await UserService.getMe();
        const user = response?.data?.user;
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setProfileImage(user.profileImage || '');
        }
      } catch {
        // Keep local auth state values as fallback.
      } finally {
        setIsBootstrapping(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    const normalizedProfileImage = profileImage.trim();

    if (!normalizedName) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }
    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      Alert.alert('Validation', 'Please enter a valid phone number.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await UserService.updateProfile({
        name: normalizedName,
        phone: normalizedPhone || undefined,
        profileImage: normalizedProfileImage || undefined,
      });
      const updatedUser = response?.data?.user;
      if (updatedUser) await updateAuthUser(updatedUser);
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update profile.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) return <LoadingState />;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A0A0F', '#0F0D1A', '#0A0A0F']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft color={theme.colors.text} size={22} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={40}
          />
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Input
              label="Full name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              leftIcon={<User size={18} color={theme.colors.textMuted} />}
            />
            <Input
              label="Phone number"
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              leftIcon={<Phone size={18} color={theme.colors.textMuted} />}
            />
            <Input
              label="Profile image URL"
              placeholder="/uploads/your-image.jpg"
              autoCapitalize="none"
              autoCorrect={false}
              value={profileImage}
              onChangeText={setProfileImage}
              leftIcon={<ImageIcon size={18} color={theme.colors.textMuted} />}
              hint="Use the upload endpoint first, then paste the returned path here."
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.bottomZone}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            isLoading={isLoading}
            variant="primary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.m,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  bottomZone: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: theme.spacing.l,
    paddingTop: theme.spacing.m,
  },
});
