import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Keyboard, TextInput, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HostAdminVenueStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, IconButton, Card, LocationSearchInput } from '../../../components';
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

type SearchedLocation = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  country?: string;
} | null;

const extractCityFromAddress = (addressValue: string): string => {
  const parts = addressValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return '';
  return parts[Math.max(0, parts.length - 2)] || '';
};

export const VenueFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const venueId = route.params?.venueId;
  const isEditing = !!venueId;
  const insets = useSafeAreaInsets();
  const addressRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const capacityRef = useRef<TextInput>(null);
  const contactRef = useRef<TextInput>(null);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [capacity, setCapacity] = useState('');
  const [type, setType] = useState<VenueType>('physical');
  const [contactInfo, setContactInfo] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<SearchedLocation>(null);

  useEffect(() => {
    if (isEditing) {
      void fetchVenue();
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
      setCapacity(
        Number.isFinite(Number(venue.capacity)) && Number(venue.capacity) > 0
          ? String(Number(venue.capacity))
          : '',
      );
      setType(venue.type || 'physical');
      setContactInfo(safeString(venue.contactInfo, ''));

      const lat = typeof venue.lat === 'number' && Number.isFinite(venue.lat) ? venue.lat : null;
      const lng = typeof venue.lng === 'number' && Number.isFinite(venue.lng) ? venue.lng : null;
      if (lat !== null && lng !== null) {
        setSelectedLocation({
          name: safeString(venue.name, ''),
          address: safeString(venue.address, ''),
          lat,
          lng,
          city: safeString(venue.city, ''),
        });
      } else {
        setSelectedLocation(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load venue details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const hasSelectedLocation = selectedLocation !== null;
    const hasManualLocation = Boolean(trimmedAddress && trimmedCity);

    if (!trimmedName) {
      Alert.alert('Validation', 'Venue name is required.');
      return;
    }

    if (!hasSelectedLocation && !hasManualLocation) {
      Alert.alert('Validation', 'Select a location from search or enter both address and city manually.');
      return;
    }

    const resolvedAddress = trimmedAddress || safeString(selectedLocation?.address, '').trim();
    const resolvedCity =
      trimmedCity
      || safeString(selectedLocation?.city, '').trim()
      || extractCityFromAddress(resolvedAddress);

    if (!resolvedAddress || !resolvedCity) {
      Alert.alert('Validation', 'Address and city are required.');
      return;
    }

    let parsedCapacity: number | undefined;
    if (capacity.trim()) {
      const value = Number.parseInt(capacity.trim(), 10);
      if (!Number.isFinite(value) || value <= 0) {
        Alert.alert('Validation', 'Capacity must be a valid number greater than 0.');
        return;
      }
      parsedCapacity = value;
    }

    const lat = selectedLocation && Number.isFinite(selectedLocation.lat) ? selectedLocation.lat : undefined;
    const lng = selectedLocation && Number.isFinite(selectedLocation.lng) ? selectedLocation.lng : undefined;

    try {
      setIsSaving(true);
      const venueData = {
        name: trimmedName,
        address: resolvedAddress,
        city: resolvedCity,
        ...(parsedCapacity !== undefined ? { capacity: parsedCapacity } : {}),
        type,
        contactInfo: contactInfo.trim(),
        ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
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
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={20} color={theme.colors.text} />}
          onPress={() => navigation.goBack()}
          variant="surface"
          size={36}
        />
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Venue' : 'Create Venue'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Venue name *"
          value={name}
          onChangeText={setName}
          placeholder="Main Hall"
          returnKeyType="next"
        />

        <LocationSearchInput
          label="Search Location (OpenStreetMap)"
          placeholder="Search by place name"
          initialValue={safeString(address, '')}
          onSelect={(location) => {
            setSelectedLocation(location);
            if (!location) return;
            setAddress(location.address || location.name || '');
            const autoCity = safeString(location.city, '').trim() || extractCityFromAddress(location.address || '');
            if (autoCity) {
              setCity(autoCity);
            }
          }}
        />

        <Input
          ref={addressRef}
          label="Address *"
          value={address}
          onChangeText={(value) => {
            setAddress(value);
            setSelectedLocation(null);
          }}
          placeholder="123 Event Street"
          returnKeyType="next"
          onSubmitEditing={() => cityRef.current?.focus()}
        />
        <Input
          ref={cityRef}
          label="City *"
          value={city}
          onChangeText={(value) => {
            setCity(value);
            setSelectedLocation(null);
          }}
          placeholder="Colombo"
          returnKeyType="next"
          onSubmitEditing={() => capacityRef.current?.focus()}
        />
        <Input
          ref={capacityRef}
          label="Capacity"
          value={capacity}
          onChangeText={setCapacity}
          placeholder="500"
          keyboardType="numeric"
          returnKeyType="next"
          onSubmitEditing={() => contactRef.current?.focus()}
        />
        <Input
          ref={contactRef}
          label="Contact info"
          value={contactInfo}
          onChangeText={setContactInfo}
          placeholder="contact@venue.com"
          returnKeyType="done"
          blurOnSubmit
        />

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
          style={{ ...styles.saveBtn, marginBottom: Math.max(insets.bottom, 16) + 84 }}
        />
      </ScrollView>
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
