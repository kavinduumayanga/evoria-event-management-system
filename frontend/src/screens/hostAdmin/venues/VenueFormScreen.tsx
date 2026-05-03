import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, IconButton, Card } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { VenueService } from '../../../api/services';
import { Venue, VenueType } from '../../../types';
import { safeString, safeUpper } from '../../../utils/safeText';

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
      const venue = (res?.data?.venue as Venue | undefined) || null;
      if (!venue?.id) {
        throw new Error('Invalid venue payload');
      }

      setName(safeString(venue.name, ''));
      setAddress(safeString(venue.address, ''));
      setCity(safeString(venue.city, ''));
      setCapacity(String(Number.isFinite(Number(venue.capacity)) ? Number(venue.capacity) : ''));
      setType(venue.type || 'physical');
      setContactInfo(safeString(venue.contactInfo, ''));
    } catch (error) {
      Alert.alert('Error', 'Failed to load venue details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const parsedCapacity = Number.parseInt(capacity, 10);
    if (!name.trim() || !address.trim() || !city.trim() || !Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const venueData = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        capacity: parsedCapacity,
        type,
        contactInfo: contactInfo.trim(),
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

        <View style={styles.segmentedControlSection}>
          <Text style={styles.fieldLabel}>Venue Type</Text>
          <Card variant="raised" style={styles.segmentedControlContainer} noPadding>
            <View style={styles.segmentedInner}>
              {(['physical', 'online', 'hybrid'] as VenueType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.segmentButton, type === t && styles.segmentButtonSelected]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.segmentButtonText, type === t && styles.segmentButtonTextSelected]}>
                    {safeUpper(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
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
  form: { paddingHorizontal: theme.spacing.base, paddingBottom: 100 },
  fieldLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs, marginLeft: 4 },
  segmentedControlSection: { marginBottom: theme.spacing.xl },
  segmentedControlContainer: { borderRadius: theme.borderRadius.m, overflow: 'hidden' },
  segmentedInner: { flexDirection: 'row', padding: 4 },
  segmentButton: { flex: 1, paddingVertical: theme.spacing.s, alignItems: 'center', borderRadius: theme.borderRadius.s },
  segmentButtonSelected: { backgroundColor: theme.colors.glass },
  segmentButtonText: { ...theme.typography.caption, color: theme.colors.textMuted, fontWeight: '600' },
  segmentButtonTextSelected: { color: theme.colors.primaryLight },
  saveBtn: { marginTop: theme.spacing.m },
});
