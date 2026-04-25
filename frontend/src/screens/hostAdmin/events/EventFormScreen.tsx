import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { EventService, VenueService } from '../../../api/services';
import { Event, Venue, EventStatus, EventVisibility } from '../../../types';

type EventFormNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'EventForm'>;
type EventFormRouteProp = RouteProp<HostAdminEventStackParamList, 'EventForm'>;

interface Props {
  navigation: EventFormNavigationProp;
  route: EventFormRouteProp;
}

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
  const [status, setStatus] = useState<EventStatus>('draft');
  const [visibility, setVisibility] = useState<EventVisibility>('public');

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    try {
      const vRes = await VenueService.getVenues();
      setVenues(vRes.data.venues);

      if (isEditing) {
        const res = await EventService.getEvent(eventId!);
        const event: Event = res.data.event;
        setTitle(event.title);
        setDescription(event.description);
        setDate(event.date);
        setStartTime(event.startTime);
        setEndTime(event.endTime);
        setCapacity(event.capacity.toString());
        setVenueId(event.venueId);
        setStatus(event.status);
        setVisibility(event.visibility);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !date || !startTime || !endTime || !capacity || !venueId) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const eventData = {
        title,
        description,
        date,
        startTime,
        endTime,
        capacity: parseInt(capacity, 10),
        venueId,
        status,
        visibility
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

  return (
    <ScreenContainer scrollable style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Event' : 'Create Event'}</Text>
      </View>

      <View style={styles.form}>
        <Input label="Event Title *" value={title} onChangeText={setTitle} placeholder="Annual Tech Meetup" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Description here..." />
        
        <View style={styles.row}>
          <View style={styles.flexHalf}><Input label="Date (YYYY-MM-DD) *" value={date} onChangeText={setDate} placeholder="2026-10-15" /></View>
          <View style={styles.flexHalf}><Input label="Capacity *" value={capacity} onChangeText={setCapacity} placeholder="100" keyboardType="numeric" /></View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}><Input label="Start Time *" value={startTime} onChangeText={setStartTime} placeholder="09:00 AM" /></View>
          <View style={styles.flexHalf}><Input label="End Time *" value={endTime} onChangeText={setEndTime} placeholder="05:00 PM" /></View>
        </View>

        <Text style={styles.label}>Select Venue *</Text>
        <View style={styles.selectorContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {venues.map(v => (
              <TouchableOpacity 
                key={v.id}
                style={[styles.chip, venueId === v.id && styles.chipSelected]}
                onPress={() => setVenueId(v.id)}
              >
                <Text style={[styles.chipText, venueId === v.id && styles.chipTextSelected]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
            {venues.length === 0 && <Text style={{color: theme.colors.textMuted}}>No venues available. Please create one first.</Text>}
          </ScrollView>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.selectorContainer}>
          {(['draft', 'published', 'cancelled'] as EventStatus[]).map(s => (
            <TouchableOpacity 
              key={s}
              style={[styles.chip, status === s && styles.chipSelected]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextSelected]}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Visibility</Text>
        <View style={styles.selectorContainer}>
          {(['public', 'private'] as EventVisibility[]).map(v => (
            <TouchableOpacity 
              key={v}
              style={[styles.chip, visibility === v && styles.chipSelected]}
              onPress={() => setVisibility(v)}
            >
              <Text style={[styles.chipText, visibility === v && styles.chipTextSelected]}>{v.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title={isEditing ? 'Save Changes' : 'Create Event'} onPress={handleSave} isLoading={isSaving} style={styles.saveButton} />
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
  label: { ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs, marginLeft: 4, marginTop: theme.spacing.s },
  selectorContainer: { flexDirection: 'row', marginBottom: theme.spacing.m, gap: theme.spacing.s },
  chip: { paddingHorizontal: theme.spacing.m, paddingVertical: theme.spacing.s, borderRadius: theme.borderRadius.m, borderWidth: 1, borderColor: theme.colors.border },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
});
