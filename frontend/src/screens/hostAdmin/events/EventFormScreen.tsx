import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Plus, X, Upload, HelpCircle } from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, Card, IconButton } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService, UploadService, VenueService } from '../../../api/services';
import { Event, EventStatus, EventVisibility, EventType, EventCustomQuestion, CustomQuestionType, EventPricingMode, Venue } from '../../../types';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { useAuthStore } from '../../../store/auth.store';

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

export const EventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;
  const authUser = useAuthStore((state) => state.user);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const requiresVenue = useMemo(() => type === 'physical' || type === 'hybrid', [type]);

  const fetchData = async () => {
    try {
      const venuesResponse = await VenueService.getVenues();
      setVenues(venuesResponse.data.venues || []);

      if (isEditing) {
        const eventResponse = await EventService.getEvent(eventId!);
        const event: Event = eventResponse.data.event;

        setTitle(event.title || '');
        setDescription(event.description || '');
        setDate((event.date || '').slice(0, 10));
        setStartTime(event.startTime || '');
        setEndTime(event.endTime || '');
        setCapacity(String(event.capacity || ''));
        setCategory(event.category || '');
        setCity(event.city || '');
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
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(toDateString(tomorrow));
        setStartTime('09:00');
        setEndTime('11:00');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load event details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(toDateString(selectedDate));
    }
  };

  const handleStartTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartTimePicker(false);
    if (selectedDate) {
      setStartTime(toTimeString(selectedDate));
    }
  };

  const handleEndTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndTimePicker(false);
    if (selectedDate) {
      setEndTime(toTimeString(selectedDate));
    }
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

    if (requiresVenue && !venueId) {
      Alert.alert('Validation Error', 'Please select a venue for physical or hybrid events.');
      return;
    }

    if ((type === 'online' || type === 'hybrid') && !trimmedMeetingLink) {
      Alert.alert('Validation Error', 'Meeting link is required for online and hybrid events.');
      return;
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
        city: city.trim(),
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
            <Text style={styles.statusLabel}>Status: {status.toUpperCase()}</Text>
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
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
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
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowStartTimePicker(true)}>
              <Text style={styles.pickerValue}>{startTime || 'Pick start time'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flexHalf}>
            <Text style={styles.label}>End Time *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowEndTimePicker(true)}>
              <Text style={styles.pickerValue}>{endTime || 'Pick end time'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input label="Category" value={category} onChangeText={setCategory} placeholder="Technology" />
        <Input label="City" value={city} onChangeText={setCity} placeholder="Colombo" />

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
              <Text style={[styles.segmentText, type === eventType && styles.segmentTextSelected]}>{eventType.toUpperCase()}</Text>
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
              <Text style={[styles.segmentText, pricingMode === modeOption && styles.segmentTextSelected]}>{modeOption.toUpperCase()}</Text>
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
              <Text style={[styles.segmentText, visibility === option && styles.segmentTextSelected]}>{option.toUpperCase()}</Text>
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

        <Text style={styles.label}>{requiresVenue ? 'Select Venue *' : 'Select Venue (Optional)'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueRow}>
          {!requiresVenue ? (
            <TouchableOpacity style={[styles.chip, !venueId && styles.chipSelected]} onPress={() => setVenueId('')}>
              <Text style={[styles.chipText, !venueId && styles.chipTextSelected]}>NO VENUE</Text>
            </TouchableOpacity>
          ) : null}
          {venues.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={[styles.chip, venueId === venue.id && styles.chipSelected]}
              onPress={() => setVenueId(venue.id)}
            >
              <Text style={[styles.chipText, venueId === venue.id && styles.chipTextSelected]}>{venue.name}</Text>
            </TouchableOpacity>
          ))}
          {!venues.length ? <Text style={styles.noVenueText}>No venues available. Create a venue first.</Text> : null}
        </ScrollView>

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
                    {customQuestion.type.toUpperCase()} {customQuestion.required ? '• REQUIRED' : '• OPTIONAL'}
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
                  {typeOption.toUpperCase()}
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

        <Button
          variant="primary"
          title={isEditing ? 'Save Changes' : 'Create Event'}
          onPress={handleSave}
          isLoading={isSaving}
          disabled={saveDisabled}
          style={styles.saveButton}
        />
      </ScrollView>

      {showDatePicker ? (
        <DateTimePicker
          value={date ? new Date(`${date}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      ) : null}
      {showStartTimePicker ? (
        <DateTimePicker
          value={toTimeDate(startTime)}
          mode="time"
          display="default"
          onChange={handleStartTimeChange}
        />
      ) : null}
      {showEndTimePicker ? (
        <DateTimePicker
          value={toTimeDate(endTime)}
          mode="time"
          display="default"
          onChange={handleEndTimeChange}
        />
      ) : null}
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  coverPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  colorLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  colorBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBubbleSelected: {
    borderColor: '#FFFFFF',
  },
  questionCard: {
    marginBottom: theme.spacing.m,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s,
    paddingBottom: theme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  questionInfo: {
    flex: 1,
    marginRight: theme.spacing.s,
  },
  questionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  questionMeta: {
    ...theme.typography.small,
    color: theme.colors.primaryLight,
    marginTop: 4,
  },
  noQuestionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.s,
  },
  saveButton: {
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
});
