import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HostAdminEventStackParamList } from '../../../types/navigation';
import { ScreenContainer, Input, Button, LoadingState, IconButton } from '../../../components';
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
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <IconButton
          icon={<ArrowLeft size={20} color={theme.colors.text} />}
          onPress={() => navigation.goBack()}
          variant="surface"
          size={36}
        />
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Session' : 'Create Session'}</Text>
      </View>

      <View style={styles.form}>
        <Input label="Session title *" value={title} onChangeText={setTitle} placeholder="Keynote Speech" />
        <Input label="Description" value={description} onChangeText={setDescription} placeholder="Brief topic overview" />
        <Input label="Speaker name" value={speakerName} onChangeText={setSpeakerName} placeholder="Jane Doe" />
        <Input label="Date *" value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" />

        <View style={styles.row}>
          <View style={styles.flexHalf}><Input label="Start time *" value={startTime} onChangeText={setStartTime} placeholder="09:00" /></View>
          <View style={styles.flexHalf}><Input label="End time *" value={endTime} onChangeText={setEndTime} placeholder="10:00" /></View>
        </View>

        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.chipGroup}>
          {(['scheduled', 'cancelled', 'completed'] as SessionStatus[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, status === s && styles.chipActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={isEditing ? 'Save Changes' : 'Create Session'}
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
  row: { flexDirection: 'row', gap: theme.spacing.m },
  flexHalf: { flex: 1 },
  fieldLabel: { ...theme.typography.label, color: theme.colors.textMuted, marginBottom: theme.spacing.s, marginTop: theme.spacing.xs },
  chipGroup: { flexDirection: 'row', gap: theme.spacing.s, marginBottom: theme.spacing.xl },
  chip: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.m, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySubtle },
  chipText: { ...theme.typography.caption, color: theme.colors.textMuted, textTransform: 'capitalize' },
  chipTextActive: { color: theme.colors.primary, fontWeight: '700' },
  saveBtn: { marginTop: theme.spacing.m },
});
