import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { EventService, UploadService, VenueService } from '../../../api/services';
import { Event, Venue, EventStatus, EventVisibility, EventType, EventCustomQuestion, CustomQuestionType, EventPricingMode } from '../../../types';
import { resolveImageUrl } from '../../../utils/imageUrl';

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

export const EventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const eventId = route.params?.eventId;
  const isEditing = !!eventId;

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
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('');
  const [brandingAccentColor, setBrandingAccentColor] = useState('');
  const [status, setStatus] = useState<EventStatus>('draft');
  const [priorityAccessEnabled, setPriorityAccessEnabled] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<EventCustomQuestion[]>([]);
  const [questionDraft, setQuestionDraft] = useState('');
  const [questionType, setQuestionType] = useState<CustomQuestionType>('text');
  const [questionRequired, setQuestionRequired] = useState(false);

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
        setCategory(event.category || '');
        setCity(event.city || '');
        setTagsInput((event.tags || []).join(', '));
        setMeetingLink(event.meetingLink || '');
        setVenueId(event.venueId || '');
        setType(event.type || 'physical');
        setPricingMode(event.pricingMode || 'ticketed');
        setVisibility(event.visibility);
        setCoverImage(event.coverImage || '');
        setContactName(event.contactDetails?.name || '');
        setContactEmail(event.contactDetails?.email || '');
        setContactPhone(event.contactDetails?.phone || '');
        setBrandingPrimaryColor(event.branding?.primaryColor || '');
        setBrandingAccentColor(event.branding?.accentColor || '');
        setStatus(event.status);
        setPriorityAccessEnabled(Boolean(event.priorityAccessEnabled));
        setRequiresApproval(Boolean(event.requiresApproval));
        setCustomQuestions(event.customQuestions || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load event details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const parseTimeToMinutes = (timeValue: string): number | null => {
    const cleaned = timeValue.trim().toUpperCase();
    const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3];

    if (minutes < 0 || minutes > 59) return null;

    if (period) {
      if (hours < 1 || hours > 12) return null;
      if (period === 'AM') {
        if (hours === 12) hours = 0;
      } else if (hours !== 12) {
        hours += 12;
      }
    } else if (hours < 0 || hours > 23) {
      return null;
    }

    return (hours * 60) + minutes;
  };

  const isValidHexColor = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed);
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
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets.length) {
        return;
      }

      const selectedImage = pickerResult.assets[0];
      if (!selectedImage?.uri) {
        Alert.alert('Upload Error', 'Unable to read selected image.');
        return;
      }

      setIsUploadingImage(true);
      const response = await UploadService.uploadEventImage(selectedImage.uri);
      const uploadedPath = response.data.url;
      const resolvedUrl = resolveImageUrl(uploadedPath) || uploadedPath;
      setCoverImage(resolvedUrl);
      Alert.alert('Image Uploaded', 'Event image uploaded successfully.');
    } catch (uploadError: any) {
      Alert.alert('Upload Failed', uploadError?.response?.data?.message || 'Unable to upload event image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    const parsedCapacity = Number.parseInt(capacity, 10);
    const trimmedDate = date.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();
    const trimmedMeetingLink = meetingLink.trim();
    const trimmedContactEmail = contactEmail.trim();

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Event title is required.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Event description is required.');
      return;
    }

    if (!trimmedDate || !trimmedStart || !trimmedEnd) {
      Alert.alert('Validation Error', 'Please fill all required fields.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(trimmedDate) || Number.isNaN(new Date(trimmedDate).getTime())) {
      Alert.alert('Validation Error', 'Date must be a valid ISO date (YYYY-MM-DD).');
      return;
    }

    const startMinutes = parseTimeToMinutes(trimmedStart);
    const endMinutes = parseTimeToMinutes(trimmedEnd);
    if (startMinutes === null || endMinutes === null) {
      Alert.alert('Validation Error', 'Time must be in HH:mm or hh:mm AM/PM format.');
      return;
    }

    if (endMinutes <= startMinutes) {
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

    if (trimmedContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedContactEmail)) {
      Alert.alert('Validation Error', 'Contact email must be a valid email address.');
      return;
    }

    if (!isValidHexColor(brandingPrimaryColor) || !isValidHexColor(brandingAccentColor)) {
      Alert.alert('Validation Error', 'Branding colors must be valid HEX values like #22D3EE.');
      return;
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
        contactDetails: {
          name: contactName.trim(),
          email: trimmedContactEmail.toLowerCase(),
          phone: contactPhone.trim(),
        },
        branding: {
          primaryColor: brandingPrimaryColor.trim(),
          accentColor: brandingAccentColor.trim(),
        },
        priorityAccessEnabled,
        requiresApproval,
        customQuestions,
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
            <Input label="Category" value={category} onChangeText={setCategory} placeholder="Technology" />
          </View>
          <View style={styles.flexHalf}>
            <Input label="City" value={city} onChangeText={setCity} placeholder="Colombo" />
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

        <Text style={styles.label}>Pricing Mode *</Text>
        <View style={styles.selectorContainer}>
          {pricingModes.map((modeOption) => (
            <TouchableOpacity
              key={modeOption}
              style={[styles.chip, pricingMode === modeOption && styles.chipSelected]}
              onPress={() => setPricingMode(modeOption)}
            >
              <Text style={[styles.chipText, pricingMode === modeOption && styles.chipTextSelected]}>
                {modeOption.toUpperCase()}
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

        <Text style={styles.label}>Event Photo</Text>
        {coverImage.trim() ? (
          <Image
            source={{ uri: resolveImageUrl(coverImage.trim()) || coverImage.trim() }}
            style={styles.coverPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPreviewPlaceholder}>
            <Text style={styles.coverPlaceholderText}>No event photo selected</Text>
          </View>
        )}
        <Button
          title={isUploadingImage ? 'Uploading Image...' : 'Upload Event Photo'}
          onPress={handleUploadEventImage}
          isLoading={isUploadingImage}
          variant="outline"
          style={styles.uploadButton}
        />
        <Input
          label="Cover Image URL (Optional)"
          value={coverImage}
          onChangeText={setCoverImage}
          placeholder="https://example.com/image.jpg"
        />

        <Text style={styles.label}>Contact Details</Text>
        <Input label="Contact Name" value={contactName} onChangeText={setContactName} placeholder="Event support team" />
        <Input
          label="Contact Email"
          value={contactEmail}
          onChangeText={setContactEmail}
          placeholder="support@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input label="Contact Phone" value={contactPhone} onChangeText={setContactPhone} placeholder="+94 77 123 4567" />

        <Text style={styles.label}>Branding Colors (Optional)</Text>
        <Input
          label="Primary Color"
          value={brandingPrimaryColor}
          onChangeText={setBrandingPrimaryColor}
          placeholder="#22D3EE"
          autoCapitalize="characters"
        />
        <Input
          label="Accent Color"
          value={brandingAccentColor}
          onChangeText={setBrandingAccentColor}
          placeholder="#8B5CF6"
          autoCapitalize="characters"
        />
        <View style={styles.brandingPreviewRow}>
          <View style={[styles.colorSwatch, { backgroundColor: isValidHexColor(brandingPrimaryColor) && brandingPrimaryColor.trim() ? brandingPrimaryColor.trim() : theme.colors.surfaceLight }]} />
          <View style={[styles.colorSwatch, { backgroundColor: isValidHexColor(brandingAccentColor) && brandingAccentColor.trim() ? brandingAccentColor.trim() : theme.colors.surfaceLight }]} />
        </View>

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="conference, startup, ai"
        />
        {(type === 'online' || type === 'hybrid') && (
          <Input
            label={`Meeting Link (${type === 'hybrid' ? 'Hybrid' : 'Online'}) *`}
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="https://meet.google.com/..."
          />
        )}

        <Text style={styles.label}>Requires Host Approval *</Text>
        <View style={styles.selectorContainer}>
          {[true, false].map((option) => (
            <TouchableOpacity
              key={option ? 'approval-on' : 'approval-off'}
              style={[styles.chip, requiresApproval === option && styles.chipSelected]}
              onPress={() => setRequiresApproval(option)}
            >
              <Text style={[styles.chipText, requiresApproval === option && styles.chipTextSelected]}>
                {option ? 'YES' : 'NO'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Priority Access Enabled *</Text>
        <View style={styles.selectorContainer}>
          {[true, false].map((option) => (
            <TouchableOpacity
              key={option ? 'priority-on' : 'priority-off'}
              style={[styles.chip, priorityAccessEnabled === option && styles.chipSelected]}
              onPress={() => setPriorityAccessEnabled(option)}
            >
              <Text style={[styles.chipText, priorityAccessEnabled === option && styles.chipTextSelected]}>
                {option ? 'YES' : 'NO'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Custom Questions (Optional)</Text>
        <Input
          label="Question"
          value={questionDraft}
          onChangeText={setQuestionDraft}
          placeholder="What is your t-shirt size?"
        />
        <View style={styles.selectorContainer}>
          {customQuestionTypes.map((typeOption) => (
            <TouchableOpacity
              key={typeOption}
              style={[styles.chip, questionType === typeOption && styles.chipSelected]}
              onPress={() => setQuestionType(typeOption)}
            >
              <Text style={[styles.chipText, questionType === typeOption && styles.chipTextSelected]}>
                {typeOption.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.selectorContainer}>
          {[true, false].map((requiredOption) => (
            <TouchableOpacity
              key={requiredOption ? 'required-yes' : 'required-no'}
              style={[styles.chip, questionRequired === requiredOption && styles.chipSelected]}
              onPress={() => setQuestionRequired(requiredOption)}
            >
              <Text style={[styles.chipText, questionRequired === requiredOption && styles.chipTextSelected]}>
                {requiredOption ? 'REQUIRED' : 'OPTIONAL'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addQuestionButton} onPress={addCustomQuestion}>
          <Plus size={16} color={theme.colors.text} />
          <Text style={styles.addQuestionText}>Add Question</Text>
        </TouchableOpacity>

        {customQuestions.map((customQuestion) => (
          <View key={customQuestion.id} style={styles.questionRow}>
            <View style={styles.questionInfo}>
              <Text style={styles.questionText}>{customQuestion.question}</Text>
              <Text style={styles.questionMeta}>
                {customQuestion.type.toUpperCase()} {customQuestion.required ? '• REQUIRED' : '• OPTIONAL'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeQuestionButton}
              onPress={() => setCustomQuestions((previous) => previous.filter((item) => item.id !== customQuestion.id))}
            >
              <X size={14} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        ))}

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
  coverPreview: {
    width: '100%',
    height: 180,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.s,
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
    marginBottom: theme.spacing.s,
  },
  coverPlaceholderText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  uploadButton: {
    marginBottom: theme.spacing.m,
  },
  brandingPreviewRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  colorSwatch: {
    width: 42,
    height: 42,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.m },
  statusLabel: { ...theme.typography.caption, color: theme.colors.textMuted, marginRight: theme.spacing.s },
  statusValue: { ...theme.typography.caption, fontWeight: 'bold' },
  warningText: { ...theme.typography.caption, color: theme.colors.error, marginBottom: theme.spacing.m },
  noVenueText: { color: theme.colors.textMuted, alignSelf: 'center', marginVertical: theme.spacing.s },
  addQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
    paddingVertical: theme.spacing.s,
    marginBottom: theme.spacing.m,
    backgroundColor: `${theme.colors.primary}20`,
  },
  addQuestionText: {
    ...theme.typography.button,
    color: theme.colors.text,
    marginLeft: theme.spacing.s,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.s,
    marginBottom: theme.spacing.s,
    backgroundColor: theme.colors.surfaceLight,
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
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  removeQuestionButton: {
    padding: theme.spacing.xs,
  },
});
