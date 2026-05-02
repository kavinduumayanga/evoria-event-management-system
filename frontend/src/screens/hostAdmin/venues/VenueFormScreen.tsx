import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, IconButton } from '../../../components';
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
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={20} color={theme.colors.text} />}
          onPress={() => navigation.goBack()}
          variant="surface"
          size={36}
        />
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Venue' : 'Create Venue'}</Text>
      </View>

      <View style={styles.form}>
        <Input label="Venue name *" value={name} onChangeText={setName} placeholder="Main Hall" />
        <Input label="Address *" value={address} onChangeText={setAddress} placeholder="123 Event Street" />
        <Input label="City *" value={city} onChangeText={setCity} placeholder="Colombo" />
        <Input label="Capacity *" value={capacity} onChangeText={setCapacity} placeholder="500" keyboardType="numeric" />
        <Input label="Contact info" value={contactInfo} onChangeText={setContactInfo} placeholder="contact@venue.com" />

        <Text style={styles.fieldLabel}>Venue type</Text>
        <View style={styles.chipGroup}>
          {(['physical', 'online', 'hybrid'] as VenueType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, type === t && styles.chipActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={isEditing ? 'Save Changes' : 'Create Venue'}
          onPress={handleSave}
          isLoading={isSaving}
          variant="primary"
          size="lg"
          style={styles.saveBtn}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m, paddingHorizontal: theme.spacing.base, paddingTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  headerTitle: { ...theme.typography.h1, color: theme.colors.text },
  form: { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.xxl },
  fieldLabel: { ...theme.typography.label, color: theme.colors.textMuted, marginBottom: theme.spacing.s, marginTop: theme.spacing.xs },
  chipGroup: { flexDirection: 'row', gap: theme.spacing.s, marginBottom: theme.spacing.xl },
  chip: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.m, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySubtle },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  saveBtn: { marginTop: theme.spacing.m },
});
