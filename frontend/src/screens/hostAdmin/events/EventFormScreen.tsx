import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Platform, Modal, Keyboard } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Plus, X, Upload, HelpCircle, Edit2 } from 'lucide-react-native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, Card, IconButton, LocationSearchInput } from '../../../components';
import { theme } from '../../../constants/theme';
import { EventService, UploadService, SessionService, TicketService, VenueService } from '../../../api/services';
import {
  Event,
  EventStatus,
  EventVisibility,
  EventType,
  EventCustomQuestion,
  CustomQuestionType,
  EventPricingMode,
  TicketType,
  Venue,
} from '../../../types';
import { resolveImageUrl } from '../../../utils/imageUrl';
import { useAuthStore } from '../../../store/auth.store';
import { safeArray } from '../../../utils/safeData';
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
const customQuestionTypes: CustomQuestionType[] = ['text', 'number', 'choice', 'dropdown', 'radio', 'checkbox', 'multiple_choice'];
const themeColors = ['#8B5CF6', '#22C55E', '#F97316', '#0EA5E9', '#EC4899', '#14B8A6', '#EAB308', '#EF4444'];
const choiceQuestionTypes = new Set<CustomQuestionType>(['choice', 'dropdown', 'radio', 'checkbox', 'multiple_choice']);

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

const normalizeQuestionOptions = (rawOptions: string[]): string[] => {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const item of rawOptions) {
    const normalized = item.trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(normalized);
  }

  return options;
};

const prettifyQuestionType = (value: CustomQuestionType) => {
  return value.replace(/_/g, ' ').toUpperCase();
};

const extractCityFromAddress = (addressValue: string): string => {
  const parts = addressValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  return parts[Math.max(0, parts.length - 2)] || '';
};

interface AgendaItem {
  id?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  title: string;
  speakerName: string;
  description: string;
}

interface TicketDraft {
  id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  maxPerUser: string;
  isActive: boolean;
  currency: string;
}

interface VenueDraft {
  name: string;
  address: string;
  city: string;
  capacity: string;
  type: EventType;
  contactInfo: string;
  lat: number | null;
  lng: number | null;
}

type PickerType =
  | 'date'
  | 'startTime'
  | 'endTime';

type AgendaPickerField = 'sessionDate' | 'startTime' | 'endTime';

export const EventFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
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
  const [questionOptionsDraft, setQuestionOptionsDraft] = useState<string[]>(['', '']);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [isAgendaModalVisible, setIsAgendaModalVisible] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState<AgendaItem>({
    sessionDate: '',
    startTime: '',
    endTime: '',
    title: '',
    speakerName: '',
    description: '',
  });
  const [editingAgendaIndex, setEditingAgendaIndex] = useState<number | null>(null);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [isVenueModalVisible, setIsVenueModalVisible] = useState(false);
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [venueDraft, setVenueDraft] = useState<VenueDraft>({
    name: '',
    address: '',
    city: '',
    capacity: '',
    type: 'physical',
    contactInfo: '',
    lat: null,
    lng: null,
  });
  const [ticketDrafts, setTicketDrafts] = useState<TicketDraft[]>([]);
  const [isTicketModalVisible, setIsTicketModalVisible] = useState(false);
  const [editingTicketIndex, setEditingTicketIndex] = useState<number | null>(null);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>({
    name: '',
    description: '',
    price: '0',
    quantity: '100',
    maxPerUser: '1',
    isActive: true,
    currency: 'LKR',
  });

  const [activePicker, setActivePicker] = useState<PickerType | null>(null);
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const [agendaPickerField, setAgendaPickerField] = useState<AgendaPickerField | null>(null);
  const [agendaPickerValue, setAgendaPickerValue] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const requiresVenue = type === 'physical' || type === 'hybrid';

  const fetchData = async () => {
    try {
      try {
        const venuesResponse = await VenueService.getVenues();
        const hostVenues = safeArray<Venue>(venuesResponse?.data?.venues);
        setVenues(hostVenues);
      } catch {
        setVenues([]);
      }

      if (isEditing) {
        const [eventResponse, sessionsResponse, ticketsResponse] = await Promise.all([
          EventService.getEvent(eventId!),
          SessionService.getEventSessions(eventId!),
          TicketService.getEventTickets(eventId!),
        ]);
        const event: Event = eventResponse.data.event;

        setTitle(event.title || '');
        setDescription(event.description || '');
        setDate((event.date || '').slice(0, 10));
        setStartTime(event.startTime || '');
        setEndTime(event.endTime || '');
        setCapacity(String(event.capacity || ''));
        setCategory(event.category || '');
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
        const eventQuestions = safeArray<EventCustomQuestion>(event.customQuestions);
        const registrationQuestions = safeArray<EventCustomQuestion>(event.registrationFields?.customQuestions);
        const normalizedQuestions = (eventQuestions.length > 0 ? eventQuestions : registrationQuestions)
          .map((question) => ({
            ...question,
            options: safeArray<string>(question.options),
          }));
        setCustomQuestions(normalizedQuestions);
        const sessions = safeArray<any>(sessionsResponse?.data?.sessions);
        setAgendaItems(
          sessions.map((session: any) => ({
            id: session.id,
            sessionDate: (session.sessionDate || event.date || '').slice(0, 10),
            startTime: session.startTime || '',
            endTime: session.endTime || session.startTime || '',
            title: session.title || '',
            speakerName: session.speakerName || '',
            description: session.description || '',
          }))
        );
        const existingTickets = safeArray<TicketType>(ticketsResponse?.data?.tickets);
        setTicketDrafts(existingTickets.map((ticket) => ({
          id: ticket.id,
          name: ticket.name || '',
          description: ticket.description || '',
          price: String(Number(ticket.price || 0)),
          quantity: String(Number(ticket.quantity || 0)),
          maxPerUser: String(Number(ticket.maxPerUser || 1)),
          isActive: Boolean(ticket.isActive),
          currency: (ticket.currency || 'LKR').toUpperCase(),
        })));
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDate = toDateString(tomorrow);
        setDate(nextDate);
        setStartTime('09:00');
        setEndTime('11:00');
        setAgendaItems([]);
        setAgendaDraft((previous) => ({ ...previous, sessionDate: nextDate }));
        setTicketDrafts([]);
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
    } else {
      setEndTime(toTimeString(pickerValue));
    }
    closePicker();
  };

  const openAgendaPicker = (field: AgendaPickerField) => {
    Keyboard.dismiss();
    if (field === 'sessionDate') {
      setAgendaPickerValue(
        agendaDraft.sessionDate
          ? new Date(`${agendaDraft.sessionDate}T00:00:00`)
          : (date ? new Date(`${date}T00:00:00`) : new Date()),
      );
    } else if (field === 'startTime') {
      setAgendaPickerValue(toTimeDate(agendaDraft.startTime || '09:00'));
    } else {
      setAgendaPickerValue(toTimeDate(agendaDraft.endTime || agendaDraft.startTime || '10:00'));
    }
    setAgendaPickerField(field);
  };

  const closeAgendaPicker = () => {
    setAgendaPickerField(null);
  };

  const confirmAgendaPickerSelection = () => {
    if (!agendaPickerField) return;
    if (agendaPickerField === 'sessionDate') {
      setAgendaDraft((previous) => ({ ...previous, sessionDate: toDateString(agendaPickerValue) }));
    } else if (agendaPickerField === 'startTime') {
      setAgendaDraft((previous) => ({ ...previous, startTime: toTimeString(agendaPickerValue) }));
    } else {
      setAgendaDraft((previous) => ({ ...previous, endTime: toTimeString(agendaPickerValue) }));
    }
    closeAgendaPicker();
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
    Keyboard.dismiss();
    if (!questionDraft.trim()) {
      Alert.alert('Validation Error', 'Custom question text cannot be empty.');
      return;
    }

    const normalizedOptions = normalizeQuestionOptions(questionOptionsDraft);
    if (choiceQuestionTypes.has(questionType) && normalizedOptions.length < 2) {
      Alert.alert('Validation Error', 'Choice-based questions require at least 2 options.');
      return;
    }

    const newQuestion: EventCustomQuestion = {
      id: `q_${Date.now()}`,
      question: questionDraft.trim(),
      type: questionType,
      required: questionRequired,
      options: normalizedOptions,
    };

    setCustomQuestions((previous) => [...previous, newQuestion]);
    setQuestionDraft('');
    setQuestionType('text');
    setQuestionRequired(false);
    setQuestionOptionsDraft(['', '']);
  };

  const syncAgendaItems = async (targetEventId: string) => {
    const normalizedAgendaItems = agendaItems.map((item) => ({
      id: item.id,
      sessionDate: (item.sessionDate || date).trim(),
      startTime: item.startTime.trim(),
      endTime: item.endTime.trim(),
      title: item.title.trim(),
      speakerName: item.speakerName.trim(),
      description: item.description.trim(),
    }));

    const existingRes = await SessionService.getEventSessions(targetEventId);
    const existingSessions = safeArray<any>(existingRes?.data?.sessions);
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
          || existing.sessionDate !== item.sessionDate;

        if (shouldUpdate) {
          updateRequests.push(
            SessionService.updateSession(item.id, {
              title: item.title,
              description: item.description,
              speakerName: item.speakerName,
              startTime: item.startTime,
              endTime: item.endTime,
              sessionDate: item.sessionDate,
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
            sessionDate: item.sessionDate,
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

  const syncTickets = async (targetEventId: string) => {
    const existingResponse = await TicketService.getEventTickets(targetEventId);
    const existingTickets = safeArray<TicketType>(existingResponse?.data?.tickets);
    const existingTicketMap = new Map(existingTickets.map((ticket) => [ticket.id, ticket]));
    const draftIds = new Set(ticketDrafts.filter((draft) => draft.id).map((draft) => draft.id as string));

    const createRequests: Promise<any>[] = [];
    const updateRequests: Promise<any>[] = [];

    for (const draft of ticketDrafts) {
      const normalizedCurrency = (draft.currency || 'LKR').trim().toUpperCase() || 'LKR';
      const payload = {
        eventId: targetEventId,
        name: draft.name.trim(),
        description: draft.description.trim() || undefined,
        price: Number.parseFloat(draft.price),
        currency: normalizedCurrency,
        isFree: Number.parseFloat(draft.price) <= 0,
        quantity: Number.parseInt(draft.quantity, 10),
        maxPerUser: Number.parseInt(draft.maxPerUser, 10),
        isActive: draft.isActive,
      };

      if (draft.id && existingTicketMap.has(draft.id)) {
        updateRequests.push(TicketService.updateTicket(draft.id, payload));
      } else {
        createRequests.push(TicketService.createTicket(payload));
      }
    }

    const deleteRequests = existingTickets
      .filter((ticket) => !draftIds.has(ticket.id))
      .map((ticket) => TicketService.deleteTicket(ticket.id));

    await Promise.all([...createRequests, ...updateRequests, ...deleteRequests]);
  };

  const handleCreateVenue = async () => {
    Keyboard.dismiss();
    const trimmedName = venueDraft.name.trim();
    const trimmedAddress = venueDraft.address.trim();
    const trimmedCity = venueDraft.city.trim();
    const resolvedCity = trimmedCity || extractCityFromAddress(trimmedAddress);
    const hasLocationFromSearch = Number.isFinite(venueDraft.lat) && Number.isFinite(venueDraft.lng);
    const hasManualLocation = Boolean(trimmedAddress && resolvedCity);

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Venue name is required.');
      return;
    }

    if (!hasLocationFromSearch && !hasManualLocation) {
      Alert.alert('Validation Error', 'Select a location from search or enter both address and city.');
      return;
    }
    if (!trimmedAddress) {
      Alert.alert('Validation Error', 'Venue address is required.');
      return;
    }
    if (!resolvedCity) {
      Alert.alert('Validation Error', 'Venue city is required.');
      return;
    }

    let parsedCapacity: number | undefined;
    if (venueDraft.capacity.trim()) {
      const value = Number.parseInt(venueDraft.capacity, 10);
      if (!Number.isFinite(value) || value <= 0) {
        Alert.alert('Validation Error', 'Venue capacity must be greater than 0.');
        return;
      }
      parsedCapacity = value;
    }

    try {
      setIsSavingVenue(true);
      const response = await VenueService.createVenue({
        name: trimmedName,
        address: trimmedAddress,
        city: resolvedCity,
        ...(parsedCapacity !== undefined ? { capacity: parsedCapacity } : {}),
        type: venueDraft.type,
        contactInfo: venueDraft.contactInfo.trim(),
        ...(hasLocationFromSearch ? { lat: venueDraft.lat, lng: venueDraft.lng } : {}),
      });
      const createdVenue = response?.data?.venue as Venue | undefined;
      if (!createdVenue?.id) {
        throw new Error('Invalid venue response');
      }

      setVenues((previous) => [createdVenue, ...previous.filter((item) => item.id !== createdVenue.id)]);
      setVenueId(createdVenue.id);
      setCapacity((previous) => (previous.trim() ? previous : String(createdVenue.capacity || '')));
      setVenueDraft({
        name: '',
        address: '',
        city: '',
        capacity: '',
        type: 'physical',
        contactInfo: '',
        lat: null,
        lng: null,
      });
      setIsVenueModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to create venue.');
    } finally {
      setIsSavingVenue(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    Keyboard.dismiss();
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

    if (requiresVenue && !selectedVenue) {
      Alert.alert('Validation Error', 'Please select or create a venue for physical/hybrid events.');
      return;
    }

    if ((type === 'online' || type === 'hybrid') && !trimmedMeetingLink) {
      Alert.alert('Validation Error', 'Meeting link is required for online and hybrid events.');
      return;
    }

    for (let index = 0; index < agendaItems.length; index += 1) {
      const item = agendaItems[index];
      const itemLabel = `Agenda item #${index + 1}`;
      if (!item.title.trim() || !item.sessionDate.trim() || !item.startTime.trim() || !item.endTime.trim()) {
        Alert.alert('Validation Error', `${itemLabel} requires date, topic, start time, and end time.`);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(item.sessionDate.trim()) || Number.isNaN(new Date(item.sessionDate.trim()).getTime())) {
        Alert.alert('Validation Error', `${itemLabel} has an invalid date.`);
        return;
      }
      const agendaStart = parseTimeToMinutes(item.startTime.trim());
      const agendaEnd = parseTimeToMinutes(item.endTime.trim());
      if (agendaStart === null || agendaEnd === null || agendaEnd <= agendaStart) {
        Alert.alert('Validation Error', `${itemLabel} must have an end time after start time.`);
        return;
      }
    }

    const normalizedQuestions = customQuestions.map((question) => ({
      ...question,
      options: normalizeQuestionOptions(safeArray<string>(question.options)),
    }));

    for (const question of normalizedQuestions) {
      if (choiceQuestionTypes.has(question.type) && normalizeQuestionOptions(question.options || []).length < 2) {
        Alert.alert('Validation Error', `Question "${question.question}" needs at least 2 options.`);
        return;
      }
    }

    const normalizedTicketDrafts = ticketDrafts.map((draft) => ({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      currency: (draft.currency || 'LKR').trim().toUpperCase() || 'LKR',
      priceNumber: Number.parseFloat(draft.price),
      quantityNumber: Number.parseInt(draft.quantity, 10),
      maxPerUserNumber: Number.parseInt(draft.maxPerUser, 10),
    }));

    if (pricingMode === 'ticketed') {
      if (normalizedTicketDrafts.length < 1) {
        Alert.alert('Validation Error', 'Ticketed events must have at least one ticket.');
        return;
      }

      for (let index = 0; index < normalizedTicketDrafts.length; index += 1) {
        const ticket = normalizedTicketDrafts[index];
        const label = `Ticket #${index + 1}`;
        if (!ticket.name) {
          Alert.alert('Validation Error', `${label} requires a ticket name.`);
          return;
        }
        if (!Number.isFinite(ticket.priceNumber) || ticket.priceNumber < 0) {
          Alert.alert('Validation Error', `${label} has an invalid price.`);
          return;
        }
        if (!Number.isFinite(ticket.quantityNumber) || ticket.quantityNumber <= 0) {
          Alert.alert('Validation Error', `${label} must have quantity greater than 0.`);
          return;
        }
        if (!Number.isFinite(ticket.maxPerUserNumber) || ticket.maxPerUserNumber <= 0 || ticket.maxPerUserNumber > ticket.quantityNumber) {
          Alert.alert('Validation Error', `${label} max tickets per user must be greater than 0 and less than or equal to quantity.`);
          return;
        }
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
        city: selectedVenue?.city || '',
        location: selectedVenue ? {
          name: selectedVenue.name,
          address: selectedVenue.address || '',
          ...(typeof selectedVenue.lat === 'number' && Number.isFinite(selectedVenue.lat)
            ? { lat: selectedVenue.lat }
            : {}),
          ...(typeof selectedVenue.lng === 'number' && Number.isFinite(selectedVenue.lng)
            ? { lng: selectedVenue.lng }
            : {}),
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
        customQuestions: normalizedQuestions,
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
        await syncAgendaItems(targetEventId);
        if (pricingMode === 'ticketed') {
          await syncTickets(targetEventId);
        }
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
  const selectedVenue = venues.find((venue) => venue.id === venueId) || null;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 168 + Math.max(insets.bottom, 16) + 72 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
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

        {(type === 'physical' || type === 'hybrid') ? (
          <Card variant="raised" style={styles.questionCard}>
            <Text style={styles.sectionTitle}>Venue</Text>
            <Text style={styles.photoHint}>Select one of your saved venues, or create a new venue.</Text>

            <View style={styles.venueRow}>
              {venues.map((venue) => (
                <TouchableOpacity
                  key={venue.id}
                  style={[styles.chip, venueId === venue.id && styles.chipSelected]}
                  onPress={() => {
                    setVenueId(venue.id);
                    if (!capacity.trim()) {
                      setCapacity(String(venue.capacity || ''));
                    }
                  }}
                >
                  <Text style={[styles.chipText, venueId === venue.id && styles.chipTextSelected]}>
                    {venue.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {venues.length === 0 ? <Text style={styles.noVenueText}>No saved venues yet. Create one to continue.</Text> : null}
            <Button
              variant="secondary"
              title="Create Venue"
              onPress={() => {
                setVenueDraft({
                  name: '',
                  address: '',
                  city: '',
                  capacity: '',
                  type: type === 'hybrid' ? 'hybrid' : 'physical',
                  contactInfo: '',
                  lat: null,
                  lng: null,
                });
                setIsVenueModalVisible(true);
              }}
              icon={<Plus size={16} color={theme.colors.text} />}
              style={{ marginTop: theme.spacing.s }}
            />
            {selectedVenue ? (
              <Text style={styles.questionMeta}>
                Selected venue: {selectedVenue.address}, {selectedVenue.city}
                {Number.isFinite(Number(selectedVenue.capacity)) ? ` • Capacity ${selectedVenue.capacity}` : ''}
              </Text>
            ) : null}
          </Card>
        ) : null}

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

        {pricingMode === 'ticketed' ? (
          <Card variant="raised" style={styles.questionCard}>
            <Text style={styles.sectionTitle}>Ticket Configuration</Text>
            {ticketDrafts.length > 0 ? (
              ticketDrafts.map((ticket, index) => (
                <View key={`${ticket.id || 'new-ticket'}-${index}`} style={styles.questionRow}>
                  <View style={styles.questionInfo}>
                    <Text style={styles.questionText}>
                      {ticket.name || 'Unnamed Ticket'} • {(Number.parseFloat(ticket.price) || 0) <= 0 ? 'FREE' : `${(ticket.currency || 'LKR').toUpperCase()} ${ticket.price}`}
                    </Text>
                    <Text style={styles.questionMeta}>
                      Qty {ticket.quantity} • Max/User {ticket.maxPerUser} • {ticket.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                    {ticket.description ? <Text style={styles.questionMeta}>{ticket.description}</Text> : null}
                  </View>
                  <View style={styles.agendaRowActions}>
                    <IconButton
                      icon={<Edit2 size={14} color={theme.colors.primary} />}
                      onPress={() => {
                        setEditingTicketIndex(index);
                        setTicketDraft(ticket);
                        setIsTicketModalVisible(true);
                      }}
                      variant="ghost"
                      size={30}
                    />
                    <IconButton
                      icon={<X size={14} color={theme.colors.error} />}
                      onPress={() => setTicketDrafts((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                      variant="ghost"
                      size={30}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noQuestionText}>No tickets configured yet.</Text>
            )}
            <Button
              variant="secondary"
              title="Add Ticket"
              onPress={() => {
                setEditingTicketIndex(null);
                setTicketDraft({
                  name: '',
                  description: '',
                  price: '0',
                  quantity: '100',
                  maxPerUser: '1',
                  isActive: true,
                  currency: 'LKR',
                });
                setIsTicketModalVisible(true);
              }}
              icon={<Plus size={16} color={theme.colors.text} />}
            />
          </Card>
        ) : null}

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
                    {prettifyQuestionType(customQuestion.type)} {customQuestion.required ? '• REQUIRED' : '• OPTIONAL'}
                  </Text>
                  {safeArray<string>(customQuestion.options).length > 0 ? (
                    <Text style={styles.questionMeta}>
                      Options: {safeArray<string>(customQuestion.options).join(', ')}
                    </Text>
                  ) : null}
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
          <View style={styles.questionTypeRow}>
            {customQuestionTypes.map((typeOption) => (
              <TouchableOpacity
                key={typeOption}
                style={[styles.questionTypeChip, questionType === typeOption && styles.segmentSelected]}
                onPress={() => {
                  setQuestionType(typeOption);
                  if (choiceQuestionTypes.has(typeOption)) {
                    setQuestionOptionsDraft((previous) => (previous.length >= 2 ? previous : ['', '']));
                  }
                }}
              >
                <Text style={[styles.segmentText, questionType === typeOption && styles.segmentTextSelected]}>
                  {prettifyQuestionType(typeOption)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {choiceQuestionTypes.has(questionType) ? (
            <View style={styles.choiceOptionsWrap}>
              <Text style={styles.label}>Answer Options *</Text>
              {questionOptionsDraft.map((option, index) => (
                <View key={`option-${index}`} style={styles.choiceOptionRow}>
                  <Input
                    label={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(value) => {
                      setQuestionOptionsDraft((previous) => previous.map((item, itemIndex) => (
                        itemIndex === index ? value : item
                      )));
                    }}
                    placeholder={`Option ${index + 1}`}
                    containerStyle={styles.choiceOptionInput}
                  />
                  <IconButton
                    icon={<X size={14} color={theme.colors.error} />}
                    onPress={() => {
                      if (questionOptionsDraft.length <= 2) return;
                      setQuestionOptionsDraft((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
                    }}
                    variant="ghost"
                    size={28}
                  />
                </View>
              ))}
              <Button
                variant="ghost"
                title="Add Option"
                onPress={() => setQuestionOptionsDraft((previous) => [...previous, ''])}
                icon={<Plus size={14} color={theme.colors.text} />}
              />
            </View>
          ) : null}

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
                  <Text style={styles.questionText}>{item.sessionDate} • {item.startTime} - {item.endTime} • {item.title}</Text>
                  <Text style={styles.questionMeta}>{item.speakerName} {item.speakerName && item.description ? '•' : ''} {item.description}</Text>
                </View>
                <View style={styles.agendaRowActions}>
                  <IconButton
                    icon={<Edit2 size={14} color={theme.colors.primary} />}
                    onPress={() => {
                      setEditingAgendaIndex(index);
                      setAgendaDraft({
                        id: item.id,
                        sessionDate: item.sessionDate,
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
              setAgendaDraft({
                sessionDate: date || toDateString(new Date()),
                startTime: '',
                endTime: '',
                title: '',
                speakerName: '',
                description: '',
              });
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
              {activePicker === 'date'
                ? 'Select Date'
                : activePicker === 'startTime'
                  ? 'Select Start Time'
                  : 'Select End Time'}
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

      <Modal
        visible={isAgendaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { closeAgendaPicker(); setIsAgendaModalVisible(false); setEditingAgendaIndex(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.agendaModal}>
            <Text style={styles.sectionTitle}>{editingAgendaIndex === null ? 'New Agenda Item' : 'Edit Agenda Item'}</Text>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openAgendaPicker('sessionDate')}>
              <Text style={styles.pickerValue}>{agendaDraft.sessionDate || 'Pick a date'}</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Text style={styles.label}>Start Time *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => openAgendaPicker('startTime')}>
                  <Text style={styles.pickerValue}>{agendaDraft.startTime || 'Pick start time'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.flexHalf}>
                <Text style={styles.label}>End Time *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => openAgendaPicker('endTime')}>
                  <Text style={styles.pickerValue}>{agendaDraft.endTime || 'Pick end time'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {agendaPickerField ? (
              <View style={styles.inlineAgendaPicker}>
                <Text style={styles.inlineAgendaPickerLabel}>
                  {agendaPickerField === 'sessionDate'
                    ? 'Select Date'
                    : agendaPickerField === 'startTime'
                      ? 'Select Start Time'
                      : 'Select End Time'}
                </Text>
                <View style={styles.pickerSurface}>
                  <DateTimePicker
                    value={agendaPickerValue}
                    mode={agendaPickerField === 'sessionDate' ? 'date' : 'time'}
                    display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
                    themeVariant="light"
                    textColor="#0B0B0C"
                    accentColor="#0B0B0C"
                    onChange={(_, selectedDate) => {
                      if (selectedDate) setAgendaPickerValue(selectedDate);
                    }}
                  />
                </View>
                <View style={styles.pickerActions}>
                  <Button title="Cancel" variant="outline" size="sm" onPress={closeAgendaPicker} style={styles.pickerActionButton} />
                  <Button title="Confirm" variant="primary" size="sm" onPress={confirmAgendaPickerSelection} style={styles.pickerActionButton} />
                </View>
              </View>
            ) : null}
            <Input label="Topic *" value={agendaDraft.title} onChangeText={t => setAgendaDraft({...agendaDraft, title: t})} placeholder="Keynote" />
            <Input label="Speaker Name" value={agendaDraft.speakerName} onChangeText={t => setAgendaDraft({...agendaDraft, speakerName: t})} placeholder="Jane Doe" />
            <Input label="Description" value={agendaDraft.description} onChangeText={t => setAgendaDraft({...agendaDraft, description: t})} placeholder="Topic description..." multiline />
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Button variant="secondary" title="Cancel" onPress={() => { closeAgendaPicker(); setIsAgendaModalVisible(false); setEditingAgendaIndex(null); }} />
              </View>
              <View style={styles.flexHalf}>
                <Button variant="primary" title={editingAgendaIndex === null ? 'Add' : 'Save'} onPress={() => {
                  if (!agendaDraft.sessionDate || !agendaDraft.startTime || !agendaDraft.endTime || !agendaDraft.title.trim()) {
                    Alert.alert('Error', 'Date, start time, end time, and topic are required');
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
                  setAgendaDraft({
                    sessionDate: date || toDateString(new Date()),
                    startTime: '',
                    endTime: '',
                    title: '',
                    speakerName: '',
                    description: '',
                  });
                  closeAgendaPicker();
                  setEditingAgendaIndex(null);
                  setIsAgendaModalVisible(false);
                }} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTicketModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setIsTicketModalVisible(false); setEditingTicketIndex(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.agendaModal}>
            <Text style={styles.sectionTitle}>{editingTicketIndex === null ? 'New Ticket' : 'Edit Ticket'}</Text>
            <Input label="Ticket Name *" value={ticketDraft.name} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, name: value }))} placeholder="General Admission" />
            <Input label="Description" value={ticketDraft.description} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, description: value }))} placeholder="Access details" />
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input label="Price *" value={ticketDraft.price} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, price: value }))} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={styles.flexHalf}>
                <Input label="Currency" value={ticketDraft.currency} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, currency: value }))} placeholder="LKR" autoCapitalize="characters" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input label="Quantity *" value={ticketDraft.quantity} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, quantity: value }))} keyboardType="numeric" placeholder="100" />
              </View>
              <View style={styles.flexHalf}>
                <Input label="Max/User *" value={ticketDraft.maxPerUser} onChangeText={(value) => setTicketDraft((previous) => ({ ...previous, maxPerUser: value }))} keyboardType="numeric" placeholder="1" />
              </View>
            </View>
            <Text style={styles.label}>Status</Text>
            <View style={styles.segmentRow}>
              {[true, false].map((value) => (
                <TouchableOpacity
                  key={value ? 'ticket-active' : 'ticket-inactive'}
                  style={[styles.segment, ticketDraft.isActive === value && styles.segmentSelected]}
                  onPress={() => setTicketDraft((previous) => ({ ...previous, isActive: value }))}
                >
                  <Text style={[styles.segmentText, ticketDraft.isActive === value && styles.segmentTextSelected]}>
                    {value ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Button variant="secondary" title="Cancel" onPress={() => { setIsTicketModalVisible(false); setEditingTicketIndex(null); }} />
              </View>
              <View style={styles.flexHalf}>
                <Button
                  variant="primary"
                  title={editingTicketIndex === null ? 'Add' : 'Save'}
                  onPress={() => {
                    const parsedPrice = Number.parseFloat(ticketDraft.price);
                    const parsedQuantity = Number.parseInt(ticketDraft.quantity, 10);
                    const parsedMaxPerUser = Number.parseInt(ticketDraft.maxPerUser, 10);

                    if (!ticketDraft.name.trim()) {
                      Alert.alert('Error', 'Ticket name is required');
                      return;
                    }
                    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                      Alert.alert('Error', 'Price must be 0 or greater');
                      return;
                    }
                    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
                      Alert.alert('Error', 'Quantity must be greater than 0');
                      return;
                    }
                    if (!Number.isFinite(parsedMaxPerUser) || parsedMaxPerUser <= 0 || parsedMaxPerUser > parsedQuantity) {
                      Alert.alert('Error', 'Max per user must be > 0 and <= quantity');
                      return;
                    }

                    const nextDraft: TicketDraft = {
                      ...ticketDraft,
                      name: ticketDraft.name.trim(),
                      description: ticketDraft.description.trim(),
                      currency: (ticketDraft.currency || 'LKR').trim().toUpperCase() || 'LKR',
                      price: String(parsedPrice),
                      quantity: String(parsedQuantity),
                      maxPerUser: String(parsedMaxPerUser),
                    };

                    if (editingTicketIndex !== null) {
                      setTicketDrafts((previous) => previous.map((item, index) => (index === editingTicketIndex ? { ...nextDraft, id: item.id } : item)));
                    } else {
                      setTicketDrafts((previous) => [...previous, nextDraft]);
                    }

                    setTicketDraft({
                      name: '',
                      description: '',
                      price: '0',
                      quantity: '100',
                      maxPerUser: '1',
                      isActive: true,
                      currency: 'LKR',
                    });
                    setEditingTicketIndex(null);
                    setIsTicketModalVisible(false);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isVenueModalVisible} transparent animationType="slide" onRequestClose={() => setIsVenueModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.agendaModal}>
            <Text style={styles.sectionTitle}>Create Venue</Text>
            <Input
              label="Venue Name *"
              value={venueDraft.name}
              onChangeText={(value) => setVenueDraft((previous) => ({ ...previous, name: value }))}
              placeholder="Main Hall"
            />
            <LocationSearchInput
              label="Search Location (OpenStreetMap)"
              placeholder="Search by place name"
              initialValue={venueDraft.address}
              onSelect={(location) => {
                if (!location) {
                  setVenueDraft((previous) => ({ ...previous, lat: null, lng: null }));
                  return;
                }
                setVenueDraft((previous) => ({
                  ...previous,
                  address: location.address || location.name || previous.address,
                  city: (location.city || previous.city || '').trim(),
                  lat: Number.isFinite(location.lat) ? location.lat : null,
                  lng: Number.isFinite(location.lng) ? location.lng : null,
                }));
              }}
            />
            <Input
              label="Address *"
              value={venueDraft.address}
              onChangeText={(value) => setVenueDraft((previous) => ({ ...previous, address: value, lat: null, lng: null }))}
              placeholder="123 Event Street"
            />
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Input
                  label="City *"
                  value={venueDraft.city}
                  onChangeText={(value) => setVenueDraft((previous) => ({ ...previous, city: value, lat: null, lng: null }))}
                  placeholder="Colombo"
                />
              </View>
              <View style={styles.flexHalf}>
                <Input
                  label="Capacity"
                  value={venueDraft.capacity}
                  onChangeText={(value) => setVenueDraft((previous) => ({ ...previous, capacity: value }))}
                  keyboardType="numeric"
                  placeholder="500"
                />
              </View>
            </View>
            <Input
              label="Contact Info"
              value={venueDraft.contactInfo}
              onChangeText={(value) => setVenueDraft((previous) => ({ ...previous, contactInfo: value }))}
              placeholder="contact@venue.com"
            />

            <Text style={styles.label}>Venue Type</Text>
            <View style={styles.segmentRow}>
              {(['physical', 'hybrid'] as EventType[]).map((venueType) => (
                <TouchableOpacity
                  key={`venue-type-${venueType}`}
                  style={[styles.segment, venueDraft.type === venueType && styles.segmentSelected]}
                  onPress={() => setVenueDraft((previous) => ({ ...previous, type: venueType }))}
                >
                  <Text style={[styles.segmentText, venueDraft.type === venueType && styles.segmentTextSelected]}>
                    {safeUpper(venueType)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Button
                  variant="secondary"
                  title="Cancel"
                  onPress={() => setIsVenueModalVisible(false)}
                />
              </View>
              <View style={styles.flexHalf}>
                <Button
                  variant="primary"
                  title="Save Venue"
                  onPress={handleCreateVenue}
                  isLoading={isSavingVenue}
                />
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  questionTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  questionTypeChip: {
    minHeight: 42,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  choiceOptionsWrap: {
    marginBottom: theme.spacing.s,
  },
  choiceOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  choiceOptionInput: {
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
  inlineAgendaPicker: {
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
  },
  inlineAgendaPickerLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
    marginLeft: 4,
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
