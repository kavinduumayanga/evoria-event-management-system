import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { ScreenContainer, Input, Button, NeonCard, LoadingState } from '../../components';
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
      } catch (error) {
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
      if (updatedUser) {
        await updateAuthUser(updatedUser);
      }

      Alert.alert('Success', 'Profile updated successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', getApiErrorMessage(error, 'Unable to update profile.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return <LoadingState />;
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <NeonCard style={styles.card}>
        <Input label="Full Name" placeholder="Enter your full name" value={name} onChangeText={setName} />

        <Input
          label="Phone"
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Input
          label="Profile Image URL or Upload Path"
          placeholder="/uploads/your-image.jpg"
          autoCapitalize="none"
          value={profileImage}
          onChangeText={setProfileImage}
        />

        <Text style={styles.helperText}>
          Use the existing upload endpoint first, then paste the returned path here.
        </Text>

        <Button title="Save Changes" onPress={handleSave} isLoading={isLoading} style={styles.saveButton} />
      </NeonCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  card: {
    padding: theme.spacing.l,
  },
  helperText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.s,
  },
  saveButton: {
    marginTop: theme.spacing.l,
  },
});
