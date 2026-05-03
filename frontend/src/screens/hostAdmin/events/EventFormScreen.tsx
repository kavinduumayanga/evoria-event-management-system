import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Platform, Modal, Keyboard } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Plus, X, Upload, HelpCircle, Edit2 } from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, Card, IconButton, LocationSearchInput } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService, UploadService, SessionService } from '../../../api/services';
import { Event, EventStatus, EventVisibility, EventType, EventCustomQuestion, CustomQuestionType, EventPricingMode } from '../../../types';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { useAuthStore } from '../../../store/auth.store';
import { safeUpper } from '../../../utils/safeText';

type EventFormNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'EventForm'>;
type EventFormRouteProp = RouteProp<HostAdminEventStackParamList, 'EventForm'>;

interface Props {
  navigation: EventFormNavigationProp;
  route: EventFormRouteProp;
}

const eventTypes: EventType[] = ['online', 'physical', 'hybrid'];
const pricingModes: EventPricingMode[] = ['free', 'ticketed'];
const visibilityOptions: EventVisibility[] = ['public', 'private', 'unlisted'];
const customQuestionTypes: CustomQuestionType[] = ['text', 'number', 'choice'];
const themeColors = ['#8B5CF6', '#22C55E', '#F97316', '#0EA5E9', '#EC4899', '#14B8A6', '#EAB308', '#EF4444'];

const toDateString = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeString = (value: Date) => {
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
};

const toTimeDate = (time: string) => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map((part) => Number(part));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return now;
  now.setHours(hours, minutes, 0, 0);
  return now;
};

const parseTimeToMinutes = (timeValue: string): number | null => {
  const cleaned = timeValue.trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
};

interface AgendaItem {
  id?: string;
  startTime: string;
  endTime: string;
  title: string;
  speakerName: string;
  description: string;
}

type PickerType = 'date' | 'startTime' | 'endTime';

export const EventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;
  const authUser = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState<{name: string, address: string, lat?: number, lng?: number} | null>(null);
  const [locationInputResetKey, setLocationInputResetKey] = useState(0);
  const [tagsInput, setTagsInput] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [venueId, setVenueId] = useState('');
  const [type, setType] = useState<EventType>('physical');
  const [pricingMode, setPricingMode] = useState<EventPricingMode>('ticketed');
  const [visibility, setVisibility] = useState<EventVisibility>('public');
  const [coverImage, setCoverImage] = useState('');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState(themeColors[0]);
  const [brandingAccentColor, setBrandingAccentColor] = useState(themeColors[3]);
  const [status, setStatus] = useState<EventStatus>('draft');
  const [requiresApproval, setRequiresApproval] = useState(false);

  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>([]);
  const [questionDraft, setQuestionDraft] = useState('');
  const [questionType, setQuestionType] = useState<CustomQuestionType>('text');
  const [questionRequired, setQuestionRequired] = useState(false);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [isAgendaModalVisible, setIsAgendaModalVisible] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState<AgendaItem>({
    startTime: '',
    endTime: '',
    title: '',
    speakerName: '',
    description: '',
  });
  const [editingAgendaIndex, setEditingAgendaIndex] = useState<number | null>(null);

  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const requiresLocation = type === 'physical' || type === 'hybrid';

  const fetchData = async () => {
    try {
      if (isEditing) {
        const [eventResponse, sessionsResponse] = await Promise.all([
          EventService.getEvent(eventId!),
          SessionService.getEventSessions(eventId!),
        ]);
        const event: Event = eventResponse.data.event;

        setTitle(event.title || '');
        setDescription(event.description || '');
        setDate((event.date || '').slice(0, 10));
        setStartTime(event.startTime || '');
        setEndTime(event.endTime || '');
        setCapacity(String(event.capacity || ''));
        setCategory(event.category || '');
        const rawLocation = (event as any).location;
        if (rawLocation && typeof rawLocation === 'object') {
          const locationName = String(rawLocation.name || rawLocation.label || '').trim();
          const locationAddress = String(rawLocation.address || '').trim();
          const locationLat = typeof rawLocation.lat === 'number' && Number.isFinite(rawLocation.lat)
            ? rawLocation.lat
            : undefined;
          const locationLng = typeof rawLocation.lng === 'number' && Number.isFinite(rawLocation.lng)
            ? rawLocation.lng
            : undefined;

          if (locationName || locationAddress || (locationLat !== undefined && locationLng !== undefined)) {
            setLocation({
              name: locationName || locationAddress || String(event.city || '').trim(),
              address: locationAddress,
              ...(locationLat !== undefined ? { lat: locationLat } : {}),
              ...(locationLng !== undefined ? { lng: locationLng } : {}),
            });
          } else if (event.city) {
            setLocation({ name: event.city, address: '' });
          } else {
            setLocation(null);
          }
        } else if (typeof rawLocation === 'string' && rawLocation.trim()) {
          setLocation({ name: rawLocation.trim(), address: '' });
        } else if (event.city) {
          setLocation({ name: event.city, address: '' });
        } else {
          setLocation(null);
        }
        setTagsInput((event.tags || []).join(', '));
        setMeetingLink(event.meetingLink || '');
        setVenueId(event.venueId || '');
        setType(event.type || 'physical');
        setPricingMode(event.pricingMode || 'ticketed');
        setVisibility(event.visibility || 'public');
        setCoverImage(event.coverImage || '');
        setBrandingPrimaryColor(event.branding?.primaryColor || themeColors[0]);
        setBrandingAccentColor(event.branding?.accentColor || themeColors[3]);
        setStatus(event.status || 'draft');
        setRequiresApproval(Boolean(event.requiresApproval));
        setCustomQuestions(event.customQuestions || event.registrationFields?.customQuestions || []);
        const sessions = sessionsResponse.data?.sessions || [];
        setAgendaItems(
          sessions.map((session: any) => ({
            id: session.id,
            startTime: session.startTime || '',
            endTime: session.endTime || session.startTime || '',
            title: session.title || '',
            speakerName: session.speakerName || '',
            description: session.description || '',
          }))
        );
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(toDateString(tomorrow));
        setStartTime('09:00');
        setEndTime('11:00');
        setAgendaItems([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load event details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const openPicker = (type: PickerType) => {
    Keyboard.dismiss();
    if (type === 'date') {
      setPickerValue(date ? new Date(`${date}T00:00:00`) : new Date());
    } else if (type === 'startTime') {
      setPickerValue(toTimeDate(startTime || '09:00'));
    } else {
      setPickerValue(toTimeDate(endTime || startTime || '10:00'));
    }
    setActivePicker(type);
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const confirmPickerSelection = () => {
    if (!activePicker) return;
    if (activePicker === 'date') {
      setDate(toDateString(pickerValue));
    } else if (activePicker === 'startTime') {
      setStartTime(toTimeString(pickerValue));
    } else if (activePicker === 'endTime') {
      setEndTime(toTimeString(pickerValue));
    }
    closePicker();
  };

  const handleUploadEventImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Media library permission is required to upload an event image.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.75,
      });

      if (pickerResult.canceled || !pickerResult.assets.length) return;
      const selectedImage = pickerResult.assets[0];
      if (!selectedImage?.uri) return;

      setIsUploadingImage(true);
      const response = await UploadService.uploadEventImage(selectedImage.uri);
      const uploadedPath = response.data.url;
      const resolvedUrl = resolveImageUrl(uploadedPath) || uploadedPath;
      setCoverImage(resolvedUrl);
    } catch (uploadError: any) {
      Alert.alert('Upload Failed', uploadError?.response?.data?.message || 'Unable to upload event image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const addCustomQuestion = () => {
    if (!questionDraft.trim()) {
      Alert.alert('Validation Error', 'Custom question text cannot be empty.');
      return;
    }

    const newQuestion: EventCustomQuestion = {
      id: `q_${Date.now()}`,
      question: questionDraft.trim(),
      type: questionType,
      required: questionRequired,
    };

    setCustomQuestions((previous) => [...previous, newQuestion]);
    setQuestionDraft('');
    setQuestionType('text');
    setQuestionRequired(false);
  };

  const syncAgendaItems = async (targetEventId: string, sessionDate: string) => {
    const normalizedAgendaItems = agendaItems.map((item) => ({
      id: item.id,
      startTime: item.startTime.trim(),
      endTime: item.endTime.trim(),
      title: item.title.trim(),
      speakerName: item.speakerName.trim(),
      description: item.description.trim(),
    }));

    const existingRes = await SessionService.getEventSessions(targetEventId);
    const existingSessions = existingRes.data?.sessions || [];
    const existingById = new Map<string, any>(existingSessions.map((session: any) => [session.id, session]));
    const desiredSessionIds = new Set<string>();

    const updateRequests: Promise<any>[] = [];
    const createRequests: Promise<any>[] = [];

    for (const item of normalizedAgendaItems) {
      if (item.id && existingById.has(item.id)) {
        desiredSessionIds.add(item.id);
        const existing = existingById.get(item.id);
        const shouldUpdate =
          existing.title !== item.title
          || (existing.description || '') !== item.description
          || (existing.speakerName || '') !== item.speakerName
          || existing.startTime !== item.startTime
          || existing.endTime !== item.endTime
          || existing.sessionDate !== sessionDate;

        if (shouldUpdate) {
          updateRequests.push(
            SessionService.updateSession(item.id, {
              title: item.title,
              description: item.description,
              speakerName: item.speakerName,
              startTime: item.startTime,
              endTime: item.endTime,
              sessionDate,
              status: existing.status || 'scheduled',
            })
          );
        }
      } else {
        createRequests.push(
          SessionService.createSession({
            eventId: targetEventId,
            title: item.title,
            description: item.description,
            speakerName: item.speakerName,
            startTime: item.startTime,
            endTime: item.endTime,
            sessionDate,
            status: 'scheduled',
          })
        );
      }
    }

    const deleteRequests = existingSessions
      .filter((session: any) => !desiredSessionIds.has(session.id))
      .map((session: any) => SessionService.deleteSession(session.id));

    await Promise.all([...updateRequests, ...createRequests, ...deleteRequests]);
  };

  const handleSave = async () => {
    const parsedCapacity = Number.parseInt(capacity, 10);
    const trimmedDate = date.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();
    const trimmedMeetingLink = meetingLink.trim();

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Event title is required.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Event description is required.');
      return;
    }
    if (!trimmedDate || !trimmedStart || !trimmedEnd) {
      Alert.alert('Validation Error', 'Date, start time, and end time are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate) || Number.isNaN(new Date(trimmedDate).getTime())) {
      Alert.alert('Validation Error', 'Please pick a valid date.');
      return;
    }

    const startMinutes = parseTimeToMinutes(trimmedStart);
    const endMinutes = parseTimeToMinutes(trimmedEnd);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      Alert.alert('Validation Error', 'End time must be after start time.');
      return;
    }

    if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
      Alert.alert('Validation Error', 'Capacity must be greater than 0.');
      return;
    }

    if (requiresLocation && !location?.name?.trim()) {
      Alert.alert('Validation Error', 'Please select a location for physical/hybrid events.');
      return;
    }

    if ((type === 'online' || type === 'hybrid') && !trimmedMeetingLink) {
      Alert.alert('Validation Error', 'Meeting link is required for online and hybrid events.');
      return;
    }

    for (let index = 0; index < agendaItems.length; index += 1) {
      const item = agendaItems[index];
      const itemLabel = `Agenda item #${index + 1}`;
      if (!item.title.trim() || !item.startTime.trim() || !item.endTime.trim()) {
        Alert.alert('Validation Error', `${itemLabel} requires topic, start time, and end time.`);
        return;
      }
      const agendaStart = parseTimeToMinutes(item.startTime.trim());
      const agendaEnd = parseTimeToMinutes(item.endTime.trim());
      if (agendaStart === null || agendaEnd === null || agendaEnd <= agendaStart) {
        Alert.alert('Validation Error', `${itemLabel} must have an end time after start time.`);
        return;
      }
    }

    if (trimmedMeetingLink) {
      try {
        // eslint-disable-next-line no-new
        new URL(trimmedMeetingLink);
      } catch {
        Alert.alert('Validation Error', 'Meeting link must be a valid URL.');
        return;
      }
    }

    try {
      setIsSaving(true);

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: trimmedDate,
        startTime: trimmedStart,
        endTime: trimmedEnd,
        capacity: parsedCapacity,
        category: category.trim(),
        city: location?.name || '',
        location: (location && location.name) ? {
          name: location.name,
          address: location.address || '',
          ...(typeof location.lat === 'number' && Number.isFinite(location.lat) ? { lat: location.lat } : {}),
          ...(typeof location.lng === 'number' && Number.isFinite(location.lng) ? { lng: location.lng } : {}),
        } : undefined,
        tags: tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        meetingLink: trimmedMeetingLink || undefined,
        venueId: venueId || null,
        type,
        pricingMode,
        visibility,
        coverImage: coverImage.trim() ? coverImage.trim() : undefined,
        requiresApproval,
        customQuestions,
        branding: {
          primaryColor: brandingPrimaryColor,
          accentColor: brandingAccentColor,
        },
      };

      let targetEventId = eventId!;

      if (isEditing) {
        await EventService.updateEvent(eventId!, eventData);
      } else {
        const response = await EventService.createEvent(eventData);
        const newEventId = response.data?.event?.id;
        targetEventId = newEventId || '';
      }

      if (targetEventId) {
        await syncAgendaItems(targetEventId, trimmedDate);
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
  const hasSelectedLocation = Boolean(location?.name?.trim());

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <IconButton
            icon={<ArrowLeft size={20} color={theme.colors.text} />}
            onPress={() => navigation.goBack()}
            variant="surface"
            size={36}
          />
          <Text style={styles.title}>{isEditing ? 'Edit Event' : 'Create Event'}</Text>
        </View>

        {isEditing ? (
          <Card variant="raised" style={styles.statusCard}>
            <Text style={styles.statusLabel}>Status: {safeUpper(status)}</Text>
            {status === 'cancelled' ? <Text style={styles.warningText}>Cancelled events cannot be edited.</Text> : null}
          </Card>
        ) : null}

        <Card variant="raised" style={styles.hostCard}>
          <Text style={styles.sectionTitle}>Host Details</Text>
          <Text style={styles.hostValue}>{authUser?.name || 'Host Name'}</Text>
          <Text style={styles.hostSub}>{authUser?.email || 'No host email available'}</Text>
          <Text style={styles.hostSub}>{authUser?.phone || 'No host phone available'}</Text>
        </Card>

        <Input label="Event Title *" value={title} onChangeText={setTitle} placeholder="Annual Tech Meetup" />
        <Input
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your event"
          multiline
          numberOfLines={4}
        />

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('date')}>
              <Text style={styles.pickerValue}>{date || 'Pick a date'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flexHalf}>
            <Input
              label="Capacity *"
              value={capacity}
              onChangeText={setCapacity}
              placeholder="100"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}>
            <Text style={styles.label}>Start Time *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('startTime')}>
              <Text style={styles.pickerValue}>{startTime || 'Pick start time'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flexHalf}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('endTime')}>
              <Text style={styles.pickerValue}>{endTime || 'Pick end time'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input label="Category" value={category} onChangeText={setCategory} placeholder="Technology" />
        <LocationSearchInput
          key={`location-search-${locationInputResetKey}`}
          label="Location"
          placeholder="Search location (e.g. SLIIT Malabe)..."
          initialValue={location?.name || ''}
          onSelect={(loc) => {
            setLocation(loc);
          }}
        />
        {location && hasSelectedLocation && (
          <View style={styles.locationPreview}>
            <View style={styles.locationPreviewTop}>
              <View style={styles.locationPreviewTextWrap}>
                <Text style={styles.locationPreviewName} numberOfLines={2}>{location.name}</Text>
                {location.address ? <Text style={styles.locationPreviewAddr} numberOfLines={2}>{location.address}</Text> : null}
              </View>
            </View>
            <View style={styles.locationPreviewActionsRow}>
              <TouchableOpacity style={styles.locationActionButton} onPress={() => setLocation(null)}>
                <Text style={styles.locationActionText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationActionButton, styles.locationRemoveButton]}
                onPress={() => {
                  setLocation(null);
                  setLocationInputResetKey((previous) => previous + 1);
                }}
              >
                <Text style={[styles.locationActionText, styles.locationRemoveText]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.label}>Event Type *</Text>
        <View style={styles.segmentRow}>
          {eventTypes.map((eventType) => (
            <TouchableOpacity
              key={eventType}
              style={[styles.segment, type === eventType && styles.segmentSelected]}
              onPress={() => {
                setType(eventType);
                if (eventType === 'online') setVenueId('');
              }}
            >
              <Text style={[styles.segmentText, type === eventType && styles.segmentTextSelected]}>{safeUpper(eventType)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Pricing *</Text>
        <View style={styles.segmentRow}>
          {pricingModes.map((modeOption) => (
            <TouchableOpacity
              key={modeOption}
              style={[styles.segment, pricingMode === modeOption && styles.segmentSelected]}
              onPress={() => setPricingMode(modeOption)}
            >
              <Text style={[styles.segmentText, pricingMode === modeOption && styles.segmentTextSelected]}>{safeUpper(modeOption)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Visibility *</Text>
        <View style={styles.segmentRow}>
          {visibilityOptions.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.segment, visibility === option && styles.segmentSelected]}
              onPress={() => setVisibility(option)}
            >
              <Text style={[styles.segmentText, visibility === option && styles.segmentTextSelected]}>{safeUpper(option)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Requires Approval *</Text>
        <View style={styles.segmentRow}>
          {[true, false].map((option) => (
            <TouchableOpacity
              key={option ? 'requires-approval' : 'no-approval'}
              style={[styles.segment, requiresApproval === option && styles.segmentSelected]}
              onPress={() => setRequiresApproval(option)}
            >
              <Text style={[styles.segmentText, requiresApproval === option && styles.segmentTextSelected]}>
                {option ? 'YES' : 'NO'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(type === 'online' || type === 'hybrid') ? (
          <Input
            label={`Meeting Link (${type === 'hybrid' ? 'Hybrid' : 'Online'}) *`}
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="https://meet.google.com/..."
          />
        ) : null}

        <Card variant="raised" style={styles.photoCard}>
          <Text style={styles.sectionTitle}>Event Photo</Text>
          <Text style={styles.photoHint}>Recommended size: 1280 x 720 (JPG/PNG), max 5MB.</Text>
          {coverImage.trim() ? (
            <Image source={{ uri: resolveImageUrl(coverImage.trim()) || coverImage.trim() }} style={styles.coverPreview} resizeMode="cover" />
          ) : (
            <View style={styles.coverPreviewPlaceholder}>
              <Text style={styles.coverPlaceholderText}>No event photo selected</Text>
            </View>
          )}
          <Button
            variant="secondary"
            title={isUploadingImage ? 'Uploading Image...' : 'Upload Event Photo'}
            onPress={handleUploadEventImage}
            icon={!isUploadingImage ? <Upload size={16} color={theme.colors.text} /> : undefined}
            isLoading={isUploadingImage}
          />
        </Card>

        <Card variant="raised" style={styles.photoCard}>
          <Text style={styles.sectionTitle}>Branding Color</Text>
          <Text style={styles.photoHint}>Choose a primary and accent color for this event theme.</Text>
          <Text style={styles.colorLabel}>Primary</Text>
          <View style={styles.colorRow}>
            {themeColors.map((color) => (
              <TouchableOpacity
                key={`primary-${color}`}
                style={[
                  styles.colorBubble,
                  { backgroundColor: color },
                  brandingPrimaryColor === color && styles.colorBubbleSelected,
                ]}
                onPress={() => setBrandingPrimaryColor(color)}
              />
            ))}
          </View>
          <Text style={styles.colorLabel}>Accent</Text>
          <View style={styles.colorRow}>
            {themeColors.map((color) => (
              <TouchableOpacity
                key={`accent-${color}`}
                style={[
                  styles.colorBubble,
                  { backgroundColor: color },
                  brandingAccentColor === color && styles.colorBubbleSelected,
                ]}
                onPress={() => setBrandingAccentColor(color)}
              />
            ))}
          </View>
        </Card>

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="conference, startup, ai"
        />

        <Card variant="raised" style={styles.questionCard}>
          <Text style={styles.sectionTitle}>Registration Questions (Optional)</Text>
          {customQuestions.length > 0 ? (
            customQuestions.map((customQuestion) => (
              <View key={customQuestion.id} style={styles.questionRow}>
                <View style={styles.questionInfo}>
                  <Text style={styles.questionText}>{customQuestion.question}</Text>
                  <Text style={styles.questionMeta}>
                    {safeUpper(customQuestion.type)} {customQuestion.required ? '• REQUIRED' : '• OPTIONAL'}
                  </Text>
                </View>
                <IconButton
                  icon={<X size={14} color={theme.colors.error} />}
                  onPress={() => setCustomQuestions((previous) => previous.filter((item) => item.id !== customQuestion.id))}
                  variant="ghost"
                  size={30}
                />
              </View>
            ))
          ) : (
            <Text style={styles.noQuestionText}>No registration questions added yet.</Text>
          )}

          <Input
            label="New Question"
            value={questionDraft}
            onChangeText={setQuestionDraft}
            placeholder="What is your t-shirt size?"
            leftIcon={<HelpCircle size={16} color={theme.colors.textMuted} />}
          />

          <Text style={styles.label}>Question Type</Text>
          <View style={styles.segmentRow}>
            {customQuestionTypes.map((typeOption) => (
              <TouchableOpacity
                key={typeOption}
                style={[styles.segment, questionType === typeOption && styles.segmentSelected]}
                onPress={() => setQuestionType(typeOption)}
              >
                <Text style={[styles.segmentText, questionType === typeOption && styles.segmentTextSelected]}>
                  {safeUpper(typeOption)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Required</Text>
          <View style={styles.segmentRow}>
            {[true, false].map((option) => (
              <TouchableOpacity
                key={option ? 'required-yes' : 'required-no'}
                style={[styles.segment, questionRequired === option && styles.segmentSelected]}
                onPress={() => setQuestionRequired(option)}
              >
                <Text style={[styles.segmentText, questionRequired === option && styles.segmentTextSelected]}>
                  {option ? 'YES' : 'NO'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            variant="secondary"
            title="Add Question"
            onPress={addCustomQuestion}
            icon={<Plus size={16} color={theme.colors.text} />}
          />
        </Card>

        <Card variant="raised" style={styles.questionCard}>
          <Text style={styles.sectionTitle}>Agenda</Text>
          {agendaItems.length > 0 ? (
            agendaItems.map((item, index) => (
              <View key={`${item.id || 'new'}-${index}`} style={styles.questionRow}>
                <View style={styles.questionInfo}>
                  <Text style={styles.questionText}>{item.startTime} - {item.endTime} • {item.title}</Text>
                  <Text style={styles.questionMeta}>{item.speakerName} {item.speakerName && item.description ? '•' : ''} {item.description}</Text>
                </View>
                <View style={styles.agendaRowActions}>
                  <IconButton
                    icon={<Edit2 size={14} color={theme.colors.primary} />}
                    onPress={() => {
                      setEditingAgendaIndex(index);
                      setAgendaDraft({
                        id: item.id,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        title: item.title,
                        speakerName: item.speakerName,
                        description: item.description,
                      });
                      setIsAgendaModalVisible(true);
                    }}
                    variant="ghost"
                    size={30}
                  />
                  <IconButton
                    icon={<X size={14} color={theme.colors.error} />}
                    onPress={() => setAgendaItems(prev => prev.filter((_, i) => i !== index))}
                    variant="ghost"
                    size={30}
                  />
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noQuestionText}>No agenda items added yet.</Text>
          )}
          <Button
            variant="secondary"
            title="Add Agenda Item"
            onPress={() => {
              setEditingAgendaIndex(null);
              setAgendaDraft({ startTime: '', endTime: '', title: '', speakerName: '', description: '' });
              setIsAgendaModalVisible(true);
            }}
            icon={<Plus size={16} color={theme.colors.text} />}
          />
        </Card>

        <Button
          variant="primary"
          title={isEditing ? 'Save Changes' : 'Create Event'}
          onPress={handleSave}
          isLoading={isSaving}
          disabled={saveDisabled}
          style={styles.saveButton}
        />
      </ScrollView>

      <Modal visible={Boolean(activePicker)} transparent animationType="fade" onRequestClose={closePicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>
              {activePicker === 'date' ? 'Select Date' : activePicker === 'startTime' ? 'Select Start Time' : 'Select End Time'}
            </Text>
            <View style={styles.pickerSurface}>
              <DateTimePicker
                value={pickerValue}
                mode={activePicker === 'date' ? 'date' : 'time'}
                display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                themeVariant="light"
                textColor="#0B0B0C"
                accentColor="#0B0B0C"
                onChange={(_, selectedDate) => {
                  if (selectedDate) setPickerValue(selectedDate);
                }}
                minimumDate={activePicker === 'date' ? new Date() : undefined}
              />
            </View>
            <View style={styles.pickerActions}>
              <Button title="Cancel" variant="outline" size="sm" onPress={closePicker} style={styles.pickerActionButton} />
              <Button title="Confirm" variant="primary" size="sm" onPress={confirmPickerSelection} style={styles.pickerActionButton} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isAgendaModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.agendaModal}>
            <Text style={styles.sectionTitle}>{editingAgendaIndex === null ? 'New Agenda Item' : 'Edit Agenda Item'}</Text>
            <Input label="Time *" value={agendaDraft.startTime} onChangeText={t => setAgendaDraft({...agendaDraft, startTime: t})} placeholder="09:00" />
            <Input label="End Time *" value={agendaDraft.endTime} onChangeText={t => setAgendaDraft({...agendaDraft, endTime: t})} placeholder="10:00" />
            <Input label="Topic *" value={agendaDraft.title} onChangeText={t => setAgendaDraft({...agendaDraft, title: t})} placeholder="Keynote" />
            <Input label="Speaker Name" value={agendaDraft.speakerName} onChangeText={t => setAgendaDraft({...agendaDraft, speakerName: t})} placeholder="Jane Doe" />
            <Input label="Description" value={agendaDraft.description} onChangeText={t => setAgendaDraft({...agendaDraft, description: t})} placeholder="Topic description..." multiline />
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Button variant="secondary" title="Cancel" onPress={() => { setIsAgendaModalVisible(false); setEditingAgendaIndex(null); }} />
              </View>
              <View style={styles.flexHalf}>
                <Button variant="primary" title={editingAgendaIndex === null ? 'Add' : 'Save'} onPress={() => {
                  if (!agendaDraft.startTime || !agendaDraft.endTime || !agendaDraft.title.trim()) {
                    Alert.alert('Error', 'Start time, end time, and topic are required');
                    return;
                  }
                  const draftStart = parseTimeToMinutes(agendaDraft.startTime);
                  const draftEnd = parseTimeToMinutes(agendaDraft.endTime);
                  if (draftStart === null || draftEnd === null || draftEnd <= draftStart) {
                    Alert.alert('Error', 'End time must be after start time');
                    return;
                  }
                  if (editingAgendaIndex !== null) {
                    setAgendaItems((prev) => prev.map((item, index) => (index === editingAgendaIndex ? { ...item, ...agendaDraft } : item)));
                  } else {
                    setAgendaItems(prev => [...prev, { ...agendaDraft }]);
                  }
                  setAgendaDraft({ startTime: '', endTime: '', title: '', speakerName: '', description: '' });
                  setEditingAgendaIndex(null);
                  setIsAgendaModalVisible(false);
                }} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.base,
    paddingBottom: 168,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.xl,
    marginBottom: theme.spacing.l,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  statusCard: {
    marginBottom: theme.spacing.m,
  },
  statusLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: 6,
  },
  hostCard: {
    marginBottom: theme.spacing.m,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  hostValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  hostSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  locationPreview: {
    backgroundColor: theme.colors.primarySubtle,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.m,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.s,
  },
  locationPreviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  locationPreviewTextWrap: {
    flex: 1,
  },
  locationPreviewName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  locationPreviewAddr: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  locationPreviewActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.s,
  },
  locationActionButton: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  locationActionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  locationRemoveButton: {
    borderColor: theme.colors.error,
  },
  locationRemoveText: {
    color: theme.colors.error,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.m,
  },
  flexHalf: {
    flex: 1,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
    marginTop: theme.spacing.s,
  },
  pickerButton: {
    height: 52,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  pickerValue: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s,
  },
  segmentSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  segmentText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: theme.colors.primaryLight,
  },
  venueRow: {
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  chip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySubtle,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.colors.primary,
  },
  noVenueText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    alignSelf: 'center',
    paddingVertical: theme.spacing.s,
  },
  photoCard: {
    marginBottom: theme.spacing.m,
  },
  photoHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
  coverPreview: {
    width: '100%',
    height: 180,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverPreviewPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: theme.borderRadius.m,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
  },
  coverPlaceholderText: {
    color: '#666',
    fontWeight: 'bold',
  },
  colorLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  colorBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorBubbleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  questionCard: {
    marginBottom: theme.spacing.m,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.m,
    marginBottom: 8,
  },
  questionInfo: {
    flex: 1,
  },
  agendaRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  questionMeta: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  noQuestionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  saveButton: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  agendaModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B0B0C',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerSurface: {
    borderRadius: 12,
    backgroundColor: '#F7F7F8',
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerActionButton: {
    flex: 1,
  },
});
