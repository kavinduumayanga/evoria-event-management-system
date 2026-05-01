import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import { ScreenContainer, FormInput, PrimaryButton, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { VenueService } from '../../../api/services';
import { Venue, VenueType } from '../../../types';

type VenueFormNavigationProp = NativeStackNavigationProp<HostAdminVenueStackParamList, 'VenueForm'>;
type VenueFormRouteProp = RouteProp<HostAdminVenueStackParamList, 'VenueForm'>;

interface Props {
  navigation: VenueFormNavigationProp;
  route: VenueFormRouteProp;
}

export const VenueFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const venueId = route.params?.venueId;
  const isEditing = !!venueId;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState('');
  const [type, setType] = useState<VenueType>('physical');
  const [contactInfo, setContactInfo] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchVenue();
    }
  }, [venueId]);

  const fetchVenue = async () => {
    try {
      const res = await VenueService.getVenue(venueId!);
      const venue: Venue = res.data.venue;
      setName(venue.name);
      setAddress(venue.address);
      setCity(venue.city);
      setCapacity(venue.capacity.toString());
      setType(venue.type);
      setContactInfo(venue.contactInfo || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load venue details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !address || !city || !capacity) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const venueData = {
        name,
        address,
        city,
        capacity: parseInt(capacity, 10),
        type,
        contactInfo
      };

      if (isEditing) {
        await VenueService.updateVenue(venueId!, venueData);
      } else {
        await VenueService.createVenue(venueData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save venue');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Venue' : 'Create Venue'}</Text>
      </View>

      <View style={styles.form}>
        <FormInput label="Venue Name *" value={name} onChangeText={setName} placeholder="Main Hall" />
        <FormInput label="Address *" value={address} onChangeText={setAddress} placeholder="123 Event Street" />
        <FormInput label="City *" value={city} onChangeText={setCity} placeholder="New York" />
        <FormInput label="Capacity *" value={capacity} onChangeText={setCapacity} placeholder="500" keyboardType="numeric" />
        <FormInput label="Contact Info" value={contactInfo} onChangeText={setContactInfo} placeholder="contact@venue.com" />

        <Text style={styles.label}>Venue Type</Text>
        <View style={styles.typeSelector}>
          {(['physical', 'online', 'hybrid'] as VenueType[]).map((t) => (
            <TouchableOpacity 
              key={t}
              style={[styles.typeOption, type === t && styles.typeOptionSelected]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextSelected]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton title={isEditing ? 'Save Changes' : 'Create Venue'} onPress={handleSave} isLoading={isSaving} style={styles.saveButton} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  form: {
    flex: 1,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.surfaceLight,
    padding: 4,
    borderRadius: theme.borderRadius.m,
    gap: theme.spacing.xs,
  },
  typeOption: {
    flex: 1,
    paddingVertical: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  typeOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  typeText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  typeTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.xxl,
  },
});
