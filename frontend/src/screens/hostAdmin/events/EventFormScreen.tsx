import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { EventService, VenueService } from '../../../api/services';
import { Event, Venue, EventStatus, EventVisibility, EventType } from '../../../types';

type EventFormNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'EventForm'>;
type EventFormRouteProp = RouteProp<HostAdminEventStackParamList, 'EventForm'>;

interface Props {
  navigation: EventFormNavigationProp;
  route: EventFormRouteProp;
}

const eventTypes: EventType[] = ['online', 'physical', 'hybrid'];
const visibilityOptions: EventVisibility[] = ['public', 'private', 'unlisted'];

export const EventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<EventType>('physical');
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [coverImage, setCoverImage] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const requiresVenue = useMemo(() => type === 'physical' || type === 'hybrid', [type]);

  const fetchData = async () => {
    try {
      const venuesResponse = await VenueService.getVenues();
      setVenues(venuesResponse.data.venues);

      if (isEditing) {
        const eventResponse = await EventService.getEvent(eventId!);
        const event: Event = eventResponse.data.event;
        setTitle(event.title);
        setDescription(event.description);
        setDate(event.date);
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setCapacity(event.capacity.toString());
        setVenueId(event.venueId || '');
        setType(event.type || 'physical');
        setVisibility(event.visibility);
        setCoverImage(event.coverImage || '');
        setStatus(event.status);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load event details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const parsedCapacity = Number.parseInt(capacity, 10);

    if (!title.trim() || !description.trim() || !date.trim() || !startTime.trim() || !endTime.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      Alert.alert('Validation Error', 'Capacity must be greater than 0.');
      return;
    }

    if (requiresVenue && !venueId) {
      Alert.alert('Validation Error', 'Please select a venue for physical or hybrid events.');
      return;
    }

    try {
      setIsSaving(true);
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        capacity: parsedCapacity,
        venueId: venueId || null,
        type,
        visibility,
        coverImage: coverImage.trim() ? coverImage.trim() : undefined,
      };

      if (isEditing) {
        await EventService.updateEvent(eventId!, eventData);
      } else {
        await EventService.createEvent(eventData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;

  const saveDisabled = isSaving || (isEditing && status === 'cancelled');

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Event' : 'Create Event'}</Text>
      </View>

      <View style={styles.form}>
        {isEditing && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Current Status:</Text>
            <Text
              style={[
                styles.statusValue,
                status === 'published' && { color: theme.colors.success },
                status === 'draft' && { color: theme.colors.warning },
                status === 'cancelled' && { color: theme.colors.error },
              ]}
            >
              {status.toUpperCase()}
            </Text>
          </View>
        )}

        {isEditing && status === 'cancelled' && (
          <Text style={styles.warningText}>Cancelled events cannot be edited.</Text>
        )}

        <Input label="Event Title *" value={title} onChangeText={setTitle} placeholder="Annual Tech Meetup" />
        <Input
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event"
          multiline
        />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Input label="Date (ISO) *" value={date} onChangeText={setDate} placeholder="2026-10-15" />
          </View>
          <View style={styles.flexHalf}>
            <Input label="Capacity *" value={capacity} onChangeText={setCapacity} placeholder="100" keyboardType="numeric" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Input label="Start Time *" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          </View>
          <View style={styles.flexHalf}>
            <Input label="End Time *" value={endTime} onChangeText={setEndTime} placeholder="17:00" />
          </View>
        </View>

        <Text style={styles.label}>Event Type *</Text>
        <View style={styles.selectorContainer}>
          {eventTypes.map((eventType) => (
            <TouchableOpacity
              key={eventType}
              style={[styles.chip, type === eventType && styles.chipSelected]}
              onPress={() => {
                setType(eventType);
                if (eventType === 'online') setVenueId('');
              }}
            >
              <Text style={[styles.chipText, type === eventType && styles.chipTextSelected]}>
                {eventType.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>{requiresVenue ? 'Select Venue *' : 'Select Venue (Optional)'}</Text>
        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {!requiresVenue && (
              <TouchableOpacity
                style={[styles.chip, !venueId && styles.chipSelected]}
                onPress={() => setVenueId('')}
              >
                <Text style={[styles.chipText, !venueId && styles.chipTextSelected]}>NO VENUE</Text>
              </TouchableOpacity>
            )}

            {venues.map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={[styles.chip, venueId === venue.id && styles.chipSelected]}
                onPress={() => setVenueId(venue.id)}
              >
                <Text style={[styles.chipText, venueId === venue.id && styles.chipTextSelected]}>{venue.name}</Text>
              </TouchableOpacity>
            ))}

            {venues.length === 0 && (
              <Text style={styles.noVenueText}>No venues available. Create a venue first.</Text>
            )}
          </ScrollView>
        </View>

        <Text style={styles.label}>Visibility *</Text>
        <View style={styles.selectorContainer}>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.chip, visibility === option && styles.chipSelected]}
              onPress={() => setVisibility(option)}
            >
              <Text style={[styles.chipText, visibility === option && styles.chipTextSelected]}>
                {option.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Cover Image URL (Optional)"
          value={coverImage}
          onChangeText={setCoverImage}
          placeholder="https://example.com/image.jpg"
        />

        <Button
          title={isEditing ? 'Save Changes' : 'Create Event'}
          onPress={handleSave}
          isLoading={isSaving}
          disabled={saveDisabled}
          style={styles.saveButton}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { padding: theme.spacing.m },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: theme.spacing.xl, marginBottom: theme.spacing.xl },
  backButton: { marginRight: theme.spacing.m },
  title: { ...theme.typography.h1, color: theme.colors.text },
  form: { flex: 1 },
  row: { flexDirection: 'row', gap: theme.spacing.m },
  flexHalf: { flex: 1 },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
    marginTop: theme.spacing.s,
  },
  selectorContainer: { flexDirection: 'row', marginBottom: theme.spacing.m, gap: theme.spacing.s },
  chip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.s,
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.m },
  statusLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginRight: theme.spacing.s },
  statusValue: { ...theme.typography.caption, fontWeight: 'bold' },
  warningText: { ...theme.typography.caption, color: theme.colors.error, marginBottom: theme.spacing.m },
  noVenueText: { color: theme.colors.textMuted, alignSelf: 'center', marginVertical: theme.spacing.s },
});
