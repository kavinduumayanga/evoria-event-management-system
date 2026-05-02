import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, FormInput, PrimaryButton, LoadingState } from '../../../components';
import { theme } from '../../../constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { SessionService } from '../../../api/services';
import { Session, SessionStatus } from '../../../types';

type SessionFormNavigationProp = NativeStackNavigationProp<HostAdminEventStackParamList, 'SessionForm'>;
type SessionFormRouteProp = RouteProp<HostAdminEventStackParamList, 'SessionForm'>;

interface Props {
  navigation: SessionFormNavigationProp;
  route: SessionFormRouteProp;
}

export const SessionFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, sessionId } = route.params;
  const isEditing = !!sessionId;

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<SessionStatus>('scheduled');

  useEffect(() => {
    if (isEditing) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await SessionService.getEventSessions(eventId);
      const session = res.data.sessions.find((s: Session) => s.id === sessionId);
      if (session) {
        setTitle(session.title);
        setDescription(session.description || '');
        setSpeakerName(session.speakerName || '');
        setSessionDate(session.sessionDate);
        setStartTime(session.startTime);
        setEndTime(session.endTime);
        setStatus(session.status);
      } else {
        Alert.alert('Error', 'Session not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load session details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !sessionDate || !startTime || !endTime) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const sessionData = {
        eventId,
        title,
        description,
        speakerName,
        sessionDate,
        startTime,
        endTime,
        status
      };

      if (isEditing) {
        await SessionService.updateSession(sessionId!, sessionData);
      } else {
        await SessionService.createSession(sessionData);
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save session');
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
        <Text style={styles.title}>{isEditing ? 'Edit Session' : 'Create Session'}</Text>
      </View>

      <View style={styles.form}>
        <FormInput label="Session Title *" value={title} onChangeText={setTitle} placeholder="Keynote Speech" />
        <FormInput label="Description" value={description} onChangeText={setDescription} placeholder="Brief topic overview" />
        <FormInput label="Speaker Name" value={speakerName} onChangeText={setSpeakerName} placeholder="Jane Doe" />
        
        <View style={styles.row}>
          <View style={styles.flexHalf}><FormInput label="Date *" value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" /></View>
        </View>

        <View style={styles.row}>
          <View style={styles.flexHalf}><FormInput label="Start Time *" value={startTime} onChangeText={setStartTime} placeholder="09:00" /></View>
          <View style={styles.flexHalf}><FormInput label="End Time *" value={endTime} onChangeText={setEndTime} placeholder="10:00" /></View>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.selectorContainer}>
          {(['scheduled', 'cancelled', 'completed'] as SessionStatus[]).map(s => (
            <TouchableOpacity 
              key={s}
              style={[styles.chip, status === s && styles.chipSelected]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextSelected]}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton title={isEditing ? 'Save Changes' : 'Create Session'} onPress={handleSave} isLoading={isSaving} style={styles.saveButton} />
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
  selectorContainer: { flexDirection: 'row', marginBottom: theme.spacing.m, gap: theme.spacing.xs, backgroundColor: theme.colors.surfaceLight, padding: 4, borderRadius: theme.borderRadius.m },
  chip: { flex: 1, paddingVertical: theme.spacing.m, borderRadius: theme.borderRadius.m, alignItems: 'center' },
  chipSelected: { backgroundColor: theme.colors.glass },
  chipText: { ...theme.typography.body, color: theme.colors.textMuted },
  chipTextSelected: { color: theme.colors.primary, fontWeight: 'bold' },
  saveButton: { marginTop: theme.spacing.xl, marginBottom: theme.spacing.xxl },
});
